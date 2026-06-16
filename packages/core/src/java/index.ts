import { execFile } from 'node:child_process';
import { access, mkdir, readdir, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';
import { promisify } from 'node:util';
import { LauncherError, type JavaMajor } from '@pilote/types';
import { installJreFromMojang } from '@xmcl/installer';
import { fetchJson, downloadToFile } from '../net.js';

const execFileAsync = promisify(execFile);

/** Cache of resolved java executables, keyed by major version + base dir. */
const javaCache = new Map<string, string>();

/**
 * Map a Minecraft version string to the required Java major version.
 *  - >= 1.20.5     -> 21
 *  - 1.17 .. 1.20.4 -> 17
 *  - <= 1.16        -> 8
 *
 * Snapshots and non-standard ids fall back to the modern runtime (21).
 */
export function majorForMc(mcVersion: string): JavaMajor {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(mcVersion.trim());
  if (!match) return 21;
  const minor = Number(match[2]);
  const patch = match[3] !== undefined ? Number(match[3]) : 0;

  if (minor <= 16) return 8;
  if (minor === 17 || minor === 18 || minor === 19) return 17;
  if (minor === 20) return patch >= 5 ? 21 : 17;
  return 21; // 1.21+
}

/** The platform-specific java executable filename. */
function javaExecutableName(): string {
  return platform() === 'win32' ? 'java.exe' : 'java';
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.X_OK);
    const st = await stat(path);
    return st.isFile();
  } catch {
    // On Windows X_OK may be unreliable; fall back to plain existence.
    try {
      const st = await stat(path);
      return st.isFile();
    } catch {
      return false;
    }
  }
}

/** Search a JRE install dir for the `java` executable (handles macOS Contents/Home layout). */
async function findJavaExecutable(root: string): Promise<string | null> {
  const exe = javaExecutableName();
  const candidates = [
    join(root, 'bin', exe),
    join(root, 'jre', 'bin', exe),
    join(root, 'Contents', 'Home', 'bin', exe),
  ];
  for (const candidate of candidates) {
    if (await isExecutable(candidate)) return candidate;
  }

  // Fall back to a shallow scan of immediate subdirectories (Adoptium archives nest a folder).
  try {
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const nested = await findJavaExecutable(join(root, entry.name));
      if (nested) return nested;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Verify a java binary actually runs and reports the expected major version. */
async function verifyJavaMajor(javaPath: string, expected: JavaMajor): Promise<boolean> {
  try {
    // `java -version` prints to stderr; capture both.
    const { stderr, stdout } = await execFileAsync(javaPath, ['-version'], { timeout: 15_000 });
    const out = `${stderr}\n${stdout}`;
    const match = /version "(\d+)(?:\.(\d+))?/.exec(out);
    if (!match) return false;
    const first = Number(match[1]);
    // Legacy scheme "1.8.0_x" reports major as the second component.
    const major = first === 1 && match[2] !== undefined ? Number(match[2]) : first;
    return major === expected;
  } catch {
    return false;
  }
}

/**
 * Mojang's JRE component name for a given major version. The Mojang runtime only
 * ships a few components; for unsupported majors we fall back to Adoptium.
 */
function mojangComponentForMajor(major: JavaMajor): string | null {
  switch (major) {
    case 8:
      return 'jre-legacy';
    case 17:
      return 'java-runtime-gamma'; // 17.x
    case 21:
      return 'java-runtime-delta'; // 21.x
    default:
      return null;
  }
}

interface AdoptiumAsset {
  binary: {
    package: { link: string; checksum?: string; name: string };
  };
}

/** Adoptium OS/arch identifiers. */
function adoptiumPlatform(): { os: string; arch: string } {
  const p = platform();
  const a = process.arch;
  const os = p === 'win32' ? 'windows' : p === 'darwin' ? 'mac' : 'linux';
  const arch = a === 'arm64' ? 'aarch64' : a === 'x64' ? 'x64' : a === 'ia32' ? 'x86' : a;
  return { os, arch };
}

/**
 * Provision a JRE from Adoptium (Temurin) as a fallback when Mojang has no runtime
 * for the requested major. Downloads the archive and extracts it.
 */
async function installFromAdoptium(
  major: JavaMajor,
  installDir: string,
  onProgress?: (current: number, total: number, file: string) => void,
): Promise<void> {
  const { os, arch } = adoptiumPlatform();
  const imageType = 'jre';
  const apiUrl =
    `https://api.adoptium.net/v3/assets/latest/${major}/hotspot` +
    `?os=${os}&architecture=${arch}&image_type=${imageType}&jvm_impl=hotspot&vendor=eclipse`;

  const assets = await fetchJson<AdoptiumAsset[]>(apiUrl, { retries: 3 });
  const asset = assets[0];
  if (!asset) {
    throw new LauncherError('java', `Adoptium has no JRE ${major} for ${os}/${arch}`, {
      retryable: false,
    });
  }

  const pkg = asset.binary.package;
  await mkdir(installDir, { recursive: true });
  const archivePath = join(installDir, pkg.name);
  await downloadToFile(pkg.link, archivePath, {
    ...(pkg.checksum ? {} : {}),
    onProgress: (p) => onProgress?.(p.current, p.total, pkg.name),
  });

  await extractArchive(archivePath, installDir);
}

/** Extract a .zip or .tar.gz JRE archive using the platform's bundled tools. */
async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  try {
    if (archivePath.endsWith('.zip')) {
      if (platform() === 'win32') {
        await execFileAsync(
          'powershell.exe',
          [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            `Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${destDir}' -Force`,
          ],
          { timeout: 180_000 },
        );
      } else {
        await execFileAsync('unzip', ['-o', archivePath, '-d', destDir], { timeout: 180_000 });
      }
    } else {
      // tar.gz
      await execFileAsync('tar', ['-xzf', archivePath, '-C', destDir], { timeout: 180_000 });
    }
  } catch (err) {
    throw new LauncherError('java', `Failed to extract JRE archive ${archivePath}`, {
      cause: err,
      retryable: false,
    });
  }
}

export interface EnsureJavaProgress {
  (current: number, total: number, file: string): void;
}

/**
 * Ensure a JRE of the given major version exists under `javaDir`, installing it via
 * the Mojang runtime (preferred) or Adoptium (fallback) if missing. Returns the path
 * to the java executable. Results are cached per (major, javaDir).
 */
export async function ensureJava(
  major: JavaMajor,
  javaDir: string,
  onProgress?: EnsureJavaProgress,
): Promise<string> {
  const cacheId = `${major}:${javaDir}`;
  const cached = javaCache.get(cacheId);
  if (cached && (await isExecutable(cached)) && (await verifyJavaMajor(cached, major))) {
    return cached;
  }

  const installDir = join(javaDir, `jre-${major}`);
  await mkdir(installDir, { recursive: true });

  // 1) Already installed?
  const existing = await findJavaExecutable(installDir);
  if (existing && (await verifyJavaMajor(existing, major))) {
    javaCache.set(cacheId, existing);
    return existing;
  }

  // 2) Try the Mojang runtime.
  const component = mojangComponentForMajor(major);
  if (component) {
    try {
      await installJreFromMojang({
        destination: installDir,
        version: component as never,
        ...(onProgress
          ? {
              onProgress: (p: { task: string; total: number; progress: number }) =>
                onProgress(p.progress, p.total, p.task),
            }
          : {}),
      } as never);
      const exe = await findJavaExecutable(installDir);
      if (exe && (await verifyJavaMajor(exe, major))) {
        javaCache.set(cacheId, exe);
        return exe;
      }
    } catch {
      // Fall through to Adoptium.
    }
  }

  // 3) Adoptium fallback.
  await installFromAdoptium(major, installDir, onProgress);
  const exe = await findJavaExecutable(installDir);
  if (exe && (await verifyJavaMajor(exe, major))) {
    javaCache.set(cacheId, exe);
    return exe;
  }

  throw new LauncherError('java', `Could not provision a working Java ${major} runtime`, {
    retryable: false,
  });
}

/** Resolve the java executable for a Minecraft version (provisioning if needed). */
export async function ensureJavaForMc(
  mcVersion: string,
  javaDir: string,
  onProgress?: EnsureJavaProgress,
): Promise<{ javaPath: string; major: JavaMajor }> {
  const major = majorForMc(mcVersion);
  const javaPath = await ensureJava(major, javaDir, onProgress);
  return { javaPath, major };
}

/** Clear the in-memory java executable cache. */
export function clearJavaCache(): void {
  javaCache.clear();
}
