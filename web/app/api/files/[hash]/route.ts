import { Readable } from 'node:stream';
import { getBlobStream } from '@/lib/storage';
import { authorizeBlobAccess } from '@/lib/access';
import { errorResponse, handleError } from '@/lib/api';

/**
 * GET /api/files/:hash
 *
 * Streams the content-addressed blob identified by `hash` (lowercase SHA-1).
 * Blobs referenced by at least one public instance are freely downloadable.
 * Blobs referenced ONLY by private instances require a valid scoped token
 * (Authorization: Bearer <token> or ?token=).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SHA1_RE = /^[a-f0-9]{40}$/;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ hash: string }> },
): Promise<Response> {
  try {
    const { hash } = await ctx.params;
    const sha1 = hash.toLowerCase();

    if (!SHA1_RE.test(sha1)) {
      return errorResponse('bad_request', 'Hash invalide.');
    }

    const access = await authorizeBlobAccess(req, sha1);
    if (!access.referenced) {
      return errorResponse('not_found', 'Fichier introuvable.');
    }
    if (!access.allowed) {
      return errorResponse('unauthorized', 'Token requis pour ce fichier privé.');
    }

    const blob = await getBlobStream(sha1);
    if (!blob) {
      return errorResponse('not_found', 'Fichier introuvable.');
    }

    const webStream = Readable.toWeb(blob.stream) as unknown as ReadableStream<Uint8Array>;

    const headers = new Headers({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sha1}"`,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ETag: `"${sha1}"`,
    });
    if (blob.sizeBytes > 0) {
      headers.set('Content-Length', String(blob.sizeBytes));
    }

    return new Response(webStream, { status: 200, headers });
  } catch (err) {
    return handleError(err);
  }
}
