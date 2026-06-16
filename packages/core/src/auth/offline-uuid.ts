import { createHash } from 'node:crypto';

/**
 * Compute the canonical offline-mode UUID for a username, matching exactly what a
 * Minecraft server computes in offline mode.
 *
 * The server does: `UUID.nameUUIDFromBytes(("OfflinePlayer:" + name).getBytes(UTF_8))`,
 * which is a name-based (version 3) UUID: MD5 of the bytes, with the version nibble
 * forced to 3 and the RFC 4122 variant bits forced (top two bits of byte 8 = 10).
 *
 * @param name The (case-sensitive) player username.
 * @returns The dashed, lowercase UUID string.
 */
export function computeOfflineUuid(name: string): string {
  const md5 = createHash('md5').update(`OfflinePlayer:${name}`, 'utf8').digest();

  // Force version 3 (name-based, MD5): high nibble of byte 6.
  md5[6] = ((md5[6] ?? 0) & 0x0f) | 0x30;
  // Force IETF variant (RFC 4122): top two bits of byte 8 = 10.
  md5[8] = ((md5[8] ?? 0) & 0x3f) | 0x80;

  return formatDashedFromBuffer(md5);
}

/** Format a 16-byte buffer as a dashed, lowercase UUID. */
export function formatDashedFromBuffer(buf: Buffer): string {
  const hex = buf.subarray(0, 16).toString('hex');
  return formatDashedUuid(hex);
}

/**
 * Insert dashes into a 32-char undashed hex UUID, lowercasing it.
 * `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` -> `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.
 */
export function formatDashedUuid(undashed: string): string {
  const clean = undashed.replace(/-/g, '').toLowerCase();
  if (clean.length !== 32) {
    throw new Error(`Invalid UUID hex length: expected 32 chars, got ${clean.length}`);
  }
  return [
    clean.slice(0, 8),
    clean.slice(8, 12),
    clean.slice(12, 16),
    clean.slice(16, 20),
    clean.slice(20, 32),
  ].join('-');
}

/** Strip dashes from a dashed UUID, returning a 32-char lowercase hex string. */
export function stripDashes(uuid: string): string {
  return uuid.replace(/-/g, '').toLowerCase();
}
