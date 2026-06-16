import { prisma } from '@/lib/db';
import { toInstanceDto } from '@/lib/dto';
import { json, errorResponse, handleError } from '@/lib/api';
import { requireAdmin } from '@/lib/session';
import { putBlob, releaseBlob } from '@/lib/storage';
import { parseModMetadata } from '@/lib/mod-parser';
import { FileTargetSchema, type FileTarget, type InstanceDto } from '@pilote/types';

/**
 * POST /api/admin/instances/:id/files  (multipart/form-data)
 *
 * Accepts one or more files under the `files` field. Each file is:
 *   1. buffered + SHA-1 hashed and stored content-addressed (dedup via refcount),
 *   2. best-effort parsed for mod metadata (jars in the `mods` target),
 *   3. attached as an InstanceFile (replacing any existing file with the same path+target).
 * Bumps the instance version once. [admin]
 *
 * Query: ?target=mods|config|resourcepacks|shaderpacks|datapacks|root  (default: mods)
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function resolveTarget(req: Request): FileTarget {
  const url = new URL(req.url);
  const raw = url.searchParams.get('target');
  const parsed = FileTargetSchema.safeParse(raw);
  return parsed.success ? parsed.data : 'mods';
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const target = resolveTarget(req);

    const instance = await prisma.instance.findUnique({ where: { id } });
    if (!instance) {
      return errorResponse('not_found', 'Instance introuvable.');
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return errorResponse('bad_request', 'Corps multipart invalide.');
    }

    const uploads = form.getAll('files').filter((v): v is File => v instanceof File);
    // Some clients send a single "file" field.
    const single = form.getAll('file').filter((v): v is File => v instanceof File);
    const files = [...uploads, ...single];

    if (files.length === 0) {
      return errorResponse('bad_request', 'Aucun fichier fourni.');
    }

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.byteLength === 0) continue;

      const { sha1, sizeBytes } = await putBlob(buffer);

      const relPath = sanitizeRelPath(file.name) || sha1;
      const modMetadata =
        target === 'mods' && relPath.toLowerCase().endsWith('.jar')
          ? parseModMetadata(buffer)
          : undefined;

      // Replace any existing file at the same logical location (path + target).
      const prior = await prisma.instanceFile.findFirst({
        where: { instanceId: id, path: relPath, target },
      });

      if (prior) {
        await prisma.instanceFile.update({
          where: { id: prior.id },
          data: {
            sha1,
            sizeBytes,
            enabled: true,
            modMetadata: modMetadata ? JSON.stringify(modMetadata) : null,
          },
        });
        // The new bytes are referenced; release the previous blob ref if it changed.
        if (prior.sha1 !== sha1) {
          await releaseBlob(prior.sha1);
        } else {
          // putBlob incremented the refcount but we reused the same row; balance it.
          await releaseBlob(sha1);
        }
      } else {
        await prisma.instanceFile.create({
          data: {
            instanceId: id,
            path: relPath,
            target,
            sha1,
            sizeBytes,
            enabled: true,
            modMetadata: modMetadata ? JSON.stringify(modMetadata) : null,
          },
        });
      }
    }

    const updated = await prisma.instance.update({
      where: { id },
      data: { version: { increment: 1 } },
      include: { files: { orderBy: { path: 'asc' } } },
    });

    const dto: InstanceDto = toInstanceDto(updated);
    return json(dto);
  } catch (err) {
    return handleError(err);
  }
}

/** Normalise a client-supplied filename to a safe relative path inside the target dir. */
function sanitizeRelPath(name: string): string {
  return name
    .replace(/\\/g, '/')
    .split('/')
    .filter((seg) => seg.length > 0 && seg !== '.' && seg !== '..')
    .join('/')
    .trim();
}
