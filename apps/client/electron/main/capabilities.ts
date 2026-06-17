import os from 'node:os';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import type { ServerPing, DiscordActivity } from '@pilote/types';
import { log } from './logger.js';

/**
 * Main-process "capabilities" that modules can use through the IPC bridge: host info,
 * Minecraft server pinging, and Discord Rich Presence. Each one fails soft — a module
 * should never crash the launcher because Discord isn't running or a server is down.
 */

// ── Host info ────────────────────────────────────────────────────────────────────

export function systemMemoryMb(): number {
  return Math.round(os.totalmem() / (1024 * 1024));
}

// ── Minecraft Server List Ping ─────────────────────────────────────────────────────

function writeVarInt(value: number): Buffer {
  const bytes: number[] = [];
  let v = value >>> 0;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v !== 0) b |= 0x80;
    bytes.push(b);
  } while (v !== 0);
  return Buffer.from(bytes);
}

function readVarInt(buf: Buffer, offset: number): { value: number; size: number } | null {
  let value = 0;
  let size = 0;
  let byte: number;
  do {
    if (offset + size >= buf.length) return null;
    byte = buf[offset + size]!;
    value |= (byte & 0x7f) << (7 * size);
    size += 1;
    if (size > 5) return null;
  } while ((byte & 0x80) !== 0);
  return { value: value >>> 0, size };
}

function mcString(s: string): Buffer {
  const str = Buffer.from(s, 'utf8');
  return Buffer.concat([writeVarInt(str.length), str]);
}

function framed(payload: Buffer): Buffer {
  return Buffer.concat([writeVarInt(payload.length), payload]);
}

/** Minecraft Server List Ping (1.7+). Resolves to an offline result on any failure. */
export function pingServer(host: string, port = 25565): Promise<ServerPing> {
  return new Promise((resolve) => {
    const started = Date.now();
    let settled = false;
    const chunks: Buffer[] = [];
    const done = (result: ServerPing) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    const socket = net.connect({ host, port, timeout: 4000 }, () => {
      const handshake = framed(
        Buffer.concat([
          writeVarInt(0x00),
          writeVarInt(47),
          mcString(host),
          (() => {
            const p = Buffer.alloc(2);
            p.writeUInt16BE(port, 0);
            return p;
          })(),
          writeVarInt(1),
        ]),
      );
      socket.write(handshake);
      socket.write(framed(writeVarInt(0x00))); // status request
    });

    socket.on('data', (d) => {
      chunks.push(d);
      const buf = Buffer.concat(chunks);
      const len = readVarInt(buf, 0);
      if (!len) return;
      if (buf.length < len.size + len.value) return; // wait for the full packet
      let off = len.size;
      const pid = readVarInt(buf, off);
      if (!pid) return;
      off += pid.size;
      const strLen = readVarInt(buf, off);
      if (!strLen) return;
      off += strLen.size;
      const json = buf.subarray(off, off + strLen.value).toString('utf8');
      try {
        const parsed = JSON.parse(json) as {
          players?: { online: number; max: number };
          version?: { name?: string };
          description?: unknown;
        };
        const motd =
          typeof parsed.description === 'string'
            ? parsed.description
            : ((parsed.description as { text?: string })?.text ?? '');
        done({
          online: true,
          ...(parsed.players ? { players: parsed.players } : {}),
          ...(parsed.version?.name ? { version: parsed.version.name } : {}),
          motd,
          latencyMs: Date.now() - started,
        });
      } catch {
        done({ online: false });
      }
    });

    socket.on('timeout', () => done({ online: false }));
    socket.on('error', () => done({ online: false }));
    socket.on('close', () => done({ online: false }));
  });
}

// ── Discord Rich Presence (local IPC) ───────────────────────────────────────────────

// Replace with your own Discord application client id to show custom art/text.
// Without a valid id Discord ignores the connection — the module then no-ops cleanly.
const DISCORD_CLIENT_ID = process.env.PILOTE_DISCORD_CLIENT_ID ?? '1234567890123456789';

let discordSocket: net.Socket | null = null;
let discordReady = false;

function discordPipePath(index: number): string {
  if (process.platform === 'win32') return `\\\\?\\pipe\\discord-ipc-${index}`;
  const base =
    process.env.XDG_RUNTIME_DIR ?? process.env.TMPDIR ?? process.env.TMP ?? '/tmp';
  return `${base.replace(/\/$/, '')}/discord-ipc-${index}`;
}

function encodeDiscord(op: number, data: unknown): Buffer {
  const payload = Buffer.from(JSON.stringify(data), 'utf8');
  const header = Buffer.alloc(8);
  header.writeInt32LE(op, 0);
  header.writeInt32LE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

function connectDiscord(): Promise<net.Socket | null> {
  return new Promise((resolve) => {
    let index = 0;
    const tryNext = () => {
      if (index > 9) return resolve(null);
      const sock = net.connect(discordPipePath(index));
      sock.once('connect', () => {
        sock.write(encodeDiscord(0, { v: 1, client_id: DISCORD_CLIENT_ID }));
        resolve(sock);
      });
      sock.once('error', () => {
        index += 1;
        tryNext();
      });
    };
    tryNext();
  });
}

/** Set or clear Discord presence. Silently does nothing if Discord isn't reachable. */
export async function discordActivity(activity: DiscordActivity | null): Promise<void> {
  try {
    if (!discordSocket) {
      discordSocket = await connectDiscord();
      if (!discordSocket) return; // Discord not running
      discordReady = true;
      discordSocket.on('error', () => {
        discordSocket = null;
        discordReady = false;
      });
      discordSocket.on('close', () => {
        discordSocket = null;
        discordReady = false;
      });
    }
    if (!discordReady || !discordSocket) return;
    const args = activity
      ? {
          pid: process.pid,
          activity: {
            details: activity.details,
            state: activity.state,
            timestamps: activity.startTimestamp ? { start: activity.startTimestamp } : undefined,
            assets: activity.largeImageKey
              ? { large_image: activity.largeImageKey, large_text: activity.largeImageText }
              : undefined,
          },
        }
      : { pid: process.pid, activity: null };
    discordSocket.write(encodeDiscord(1, { cmd: 'SET_ACTIVITY', args, nonce: randomUUID() }));
  } catch (err) {
    log.warn('discordActivity failed', err);
  }
}
