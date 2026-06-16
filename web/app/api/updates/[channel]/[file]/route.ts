import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { join, resolve, normalize, basename, extname } from 'node:path';
import { errorResponse, handleError } from '@/lib/api';

/**
 * GET /api/updates/:channel/:file
 *
 * electron-updater "generic" provider feed. Serves `latest.yml`, `latest-mac.yml`,
 * `latest-linux.yml` and the installer artifacts from the on-disk release directory:
 *
 *   UPDATES_DIR (default ./updates) / {win|mac|linux} / <file>
 *
 * Real filesystem reads — no mock. Unknown files return 404. Path traversal is blocked.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHANNELS = new Set(['win', 'mac', 'linux']);

const CONTENT_TYPES: Record<string, string> = {
  '.yml': 'text/yaml; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.json': 'application/json',
  '.exe': 'application/vnd.microsoft.portable-executable',
  '.dmg': 'application/x-apple-diskimage',
  '.zip': 'application/zip',
  '.appimage': 'application/octet-stream',
  '.deb': 'application/vnd.debian.binary-package',
  '.rpm': 'application/x-rpm',
  '.blockmap': 'application/octet-stream',
};

function updatesRoot(): string {
  const dir =
    process.env.UPDATES_DIR && process.env.UPDATES_DIR.length > 0
      ? process.env.UPDATES_DIR
      : './updates';
  return resolve(process.cwd(), dir);
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ channel: string; file: string }> },
): Promise<Response> {
  try {
    const { channel, file } = await ctx.params;

    if (!CHANNELS.has(channel)) {
      return errorResponse('not_found', 'Canal de mise à jour inconnu.');
    }

    // Reject any path separators / traversal; only a bare filename is allowed.
    const safeName = basename(file);
    if (safeName !== file || safeName.includes('..') || safeName.length === 0) {
      return errorResponse('not_found', 'Fichier de mise à jour introuvable.');
    }

    const root = join(updatesRoot(), channel);
    const target = normalize(join(root, safeName));
    if (!target.startsWith(root)) {
      return errorResponse('not_found', 'Fichier de mise à jour introuvable.');
    }

    let info: Awaited<ReturnType<typeof stat>>;
    try {
      info = await stat(target);
    } catch {
      return errorResponse('not_found', 'Fichier de mise à jour introuvable.');
    }
    if (!info.isFile()) {
      return errorResponse('not_found', 'Fichier de mise à jour introuvable.');
    }

    const ext = extname(safeName).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
    const isYaml = ext === '.yml' || ext === '.yaml';

    const nodeStream = createReadStream(target);
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(info.size),
        // Feed YAML must not be cached; artifacts are immutable.
        'Cache-Control': isYaml
          ? 'no-cache, no-store, must-revalidate'
          : 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
