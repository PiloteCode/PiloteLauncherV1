import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

/**
 * Short-lived, instance-scoped JWTs for private instance access.
 * A token authorizes the bearer to read exactly one instance's manifest and its files.
 */

const ISSUER = 'pilote-project';
const AUDIENCE = 'instance-access';

function secretKey(): Uint8Array {
  const secret = process.env.INSTANCE_JWT_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error('INSTANCE_JWT_SECRET is not configured');
  }
  return new TextEncoder().encode(secret);
}

function defaultTtlSeconds(): number {
  const raw = process.env.INSTANCE_TOKEN_TTL;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3600;
}

export interface InstanceTokenClaims {
  instanceId: string;
}

export interface SignedInstanceToken {
  token: string;
  /** epoch ms when the token expires. */
  expiresAt: number;
}

/**
 * Sign a JWT scoped to a single instance.
 * @param instanceId the instance the token grants access to
 * @param ttlSeconds token lifetime in seconds (defaults to INSTANCE_TOKEN_TTL or 3600)
 */
export async function signInstanceToken(
  instanceId: string,
  ttlSeconds: number = defaultTtlSeconds(),
): Promise<SignedInstanceToken> {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + ttlSeconds;
  const token = await new SignJWT({ instanceId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(nowSec)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(instanceId)
    .setExpirationTime(expSec)
    .sign(secretKey());

  return { token, expiresAt: expSec * 1000 };
}

/**
 * Verify an instance token and return its claims.
 * Throws if the token is invalid, expired, or not an instance-access token.
 */
export async function verifyInstanceToken(token: string): Promise<InstanceTokenClaims> {
  const { payload } = await jwtVerify(token, secretKey(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  const instanceId = extractInstanceId(payload);
  if (!instanceId) {
    throw new Error('Token missing instanceId claim');
  }
  return { instanceId };
}

function extractInstanceId(payload: JWTPayload): string | undefined {
  const claim = payload['instanceId'];
  if (typeof claim === 'string' && claim.length > 0) return claim;
  if (typeof payload.sub === 'string' && payload.sub.length > 0) return payload.sub;
  return undefined;
}

/**
 * Verify a token and confirm it is scoped to the given instance id.
 * Returns true only if valid AND for this exact instance.
 */
export async function isTokenValidFor(token: string, instanceId: string): Promise<boolean> {
  try {
    const claims = await verifyInstanceToken(token);
    return claims.instanceId === instanceId;
  } catch {
    return false;
  }
}
