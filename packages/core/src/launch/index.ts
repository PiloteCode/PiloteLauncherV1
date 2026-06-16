import type { ChildProcess } from 'node:child_process';
import { createWriteStream, type WriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createInterface } from 'node:readline';
import { LauncherError, type LaunchOptions, type LogLine, type SessionExit } from '@pilote/types';
import { MinecraftFolder } from '@xmcl/core';
import { launch as xmclLaunch, type LaunchOption as XmclLaunchOption } from '@xmcl/core';
import { wrapError } from '../errors.js';

export interface LaunchProfileInput {
  /** Dashed UUID of the player. */
  uuid: string;
  /** Player username. */
  name: string;
}

export interface LaunchInput {
  instanceId: string;
  /** The instance game dir (its `.minecraft`). */
  gameDir: string;
  /** The version id to launch (loader profile id or vanilla id). */
  versionId: string;
  /** Provisioned java executable. */
  javaPath: string;
  /** Player profile (offline). */
  profile: LaunchProfileInput;
  /** JVM / window options. */
  options: LaunchOptions;
  /** Directory where per-session logs are written. */
  logDir: string;
  /** Streamed stdout/stderr lines. */
  onLog?: (line: LogLine) => void;
  /** Called once when the process exits. */
  onExit?: (exit: SessionExit) => void;
}

/** A handle to a running game session. */
export interface SessionHandle {
  instanceId: string;
  pid: number | undefined;
  /** Resolves with the exit info when the process terminates. */
  readonly exited: Promise<SessionExit>;
  /** Force-kill the process. */
  kill(): void;
}

/** Build the standard managed JVM args (RAM + GC). */
function buildJvmArgs(options: LaunchOptions): string[] {
  const args: string[] = [];
  if (options.minRamMb && options.minRamMb > 0) args.push(`-Xms${options.minRamMb}M`);
  args.push(`-Xmx${options.maxRamMb}M`);
  // G1GC tuning recommended for modern Minecraft.
  args.push(
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:+UseG1GC',
    '-XX:G1NewSizePercent=20',
    '-XX:G1ReservePercent=20',
    '-XX:MaxGCPauseMillis=50',
    '-XX:G1HeapRegionSize=32M',
    '-XX:-UseAdaptiveSizePolicy',
    '-XX:+PerfDisableSharedMem',
  );
  return args;
}

/** Heuristic crash detection from a log line (log4j FATAL / known fatal markers). */
function isFatalLine(line: string): boolean {
  return (
    /\bFATAL\b/.test(line) ||
    line.includes('Exception in thread "main"') ||
    line.includes('A fatal error has been detected by the Java Runtime Environment') ||
    line.includes('# A fatal error has been detected')
  );
}

/** Registry of running sessions, supporting multiple concurrent launches. */
const sessions = new Map<string, SessionHandle>();

/** Currently running instance ids. */
export function runningSessions(): string[] {
  return [...sessions.keys()];
}

/** Get the handle for a running session, if any. */
export function getSession(instanceId: string): SessionHandle | undefined {
  return sessions.get(instanceId);
}

/** Kill a running session by instance id. Returns true if a session was killed. */
export function killSession(instanceId: string): boolean {
  const handle = sessions.get(instanceId);
  if (!handle) return false;
  handle.kill();
  return true;
}

/**
 * Launch a Minecraft session. Builds JVM/game args (offline auth: accessToken "0",
 * userType "msa"), spawns via @xmcl/core (which builds the classpath/natives), streams
 * stdout/stderr as LogLine, persists a session log, and detects crashes.
 *
 * Supports multiple concurrent sessions keyed by instanceId.
 */
export async function launch(input: LaunchInput): Promise<SessionHandle> {
  if (sessions.has(input.instanceId)) {
    throw new LauncherError('launch', `Instance ${input.instanceId} is already running`, {
      retryable: false,
    });
  }

  await mkdir(input.logDir, { recursive: true });
  const mc = MinecraftFolder.from(input.gameDir);
  const opts = input.options;

  const extraExecOption: { detached: boolean } = { detached: false };

  const launchOption: XmclLaunchOption = {
    gamePath: mc.root,
    version: input.versionId,
    javaPath: input.javaPath,
    gameProfile: { id: input.profile.uuid.replace(/-/g, ''), name: input.profile.name },
    accessToken: '0',
    userType: 'msa',
    extraJVMArgs: [...buildJvmArgs(opts), ...(opts.extraJvmArgs ?? [])],
    extraMCArgs: [],
    extraExecOption,
    ...(opts.width !== undefined && opts.height !== undefined
      ? { resolution: { width: opts.width, height: opts.height, fullscreen: opts.fullscreen ?? false } }
      : opts.fullscreen
        ? { resolution: { fullscreen: true } }
        : {}),
    // userType 'msa' is what modern MC expects for offline-style launches; @xmcl's typing
    // predates it, so cast through unknown.
  } as unknown as XmclLaunchOption;

  let child: ChildProcess;
  try {
    child = await xmclLaunch(launchOption);
  } catch (err) {
    throw wrapError('launch', `Failed to spawn Minecraft for ${input.instanceId}`, err);
  }

  const logPath = join(input.logDir, `${input.instanceId}-${Date.now()}.log`);
  const logStream: WriteStream = createWriteStream(logPath, { flags: 'a' });

  let sawFatal = false;

  const handleLine = (channel: 'stdout' | 'stderr', raw: string) => {
    const line = raw.replace(/\r$/, '');
    if (isFatalLine(line)) sawFatal = true;
    logStream.write(`[${channel}] ${line}\n`);
    input.onLog?.({ instanceId: input.instanceId, channel, line, ts: Date.now() });
  };

  if (child.stdout) {
    const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
    rl.on('line', (l) => handleLine('stdout', l));
  }
  if (child.stderr) {
    const rl = createInterface({ input: child.stderr, crlfDelay: Infinity });
    rl.on('line', (l) => handleLine('stderr', l));
  }

  let resolveExit!: (exit: SessionExit) => void;
  const exited = new Promise<SessionExit>((resolve) => {
    resolveExit = resolve;
  });

  const finalize = (code: number | null, signal: NodeJS.Signals | null) => {
    if (!sessions.has(input.instanceId)) return; // already finalized
    sessions.delete(input.instanceId);
    logStream.end();
    const crashed = sawFatal || (code !== null && code !== 0);
    const exit: SessionExit = {
      instanceId: input.instanceId,
      code,
      signal: signal ?? null,
      crashed,
      logPath,
    };
    input.onExit?.(exit);
    resolveExit(exit);
  };

  child.on('exit', (code, signal) => finalize(code, signal));
  child.on('error', (err) => {
    handleLine('stderr', `Process error: ${err.message}`);
    finalize(null, null);
  });

  const handle: SessionHandle = {
    instanceId: input.instanceId,
    pid: child.pid,
    exited,
    kill: () => {
      try {
        if (process.platform === 'win32') {
          child.kill();
        } else {
          child.kill('SIGTERM');
          // Escalate if still alive shortly after.
          setTimeout(() => {
            if (!child.killed) {
              try {
                child.kill('SIGKILL');
              } catch {
                /* already gone */
              }
            }
          }, 5_000).unref();
        }
      } catch {
        /* already exited */
      }
    },
  };

  sessions.set(input.instanceId, handle);
  return handle;
}

// ── High-level adapter consumed by the Electron main process ─────────────────────

/** A handle to a running game session (the subset the main process needs). */
export interface GameSession {
  readonly instanceId: string;
  readonly pid: number | undefined;
  /** Terminate the process tree. */
  kill(): void;
}

/** Everything needed to launch an already-installed instance. */
export interface LaunchContext {
  instanceId: string;
  gameDir: string;
  /** Absolute path to the java executable to spawn. */
  javaPath: string;
  mcVersion: string;
  /** The resolved launch version id (e.g. fabric-loader-...-1.20.1). */
  versionId: string;
  profile: LaunchProfileInput;
  options: LaunchOptions;
  onLog: (line: LogLine) => void;
  onExit: (exit: SessionExit) => void;
  /** Where to persist the session log (the directory is derived from this path). */
  logPath: string;
}

/** Build the launch command and spawn the game. Returns a session handle. */
export async function launchInstance(ctx: LaunchContext): Promise<GameSession> {
  return launch({
    instanceId: ctx.instanceId,
    gameDir: ctx.gameDir,
    versionId: ctx.versionId,
    javaPath: ctx.javaPath,
    profile: ctx.profile,
    options: ctx.options,
    logDir: dirname(ctx.logPath),
    onLog: ctx.onLog,
    onExit: ctx.onExit,
  });
}
