import { NextResponse } from 'next/server';
import { z, type ZodSchema } from 'zod';
import type { ApiError } from '@pilote/types';

/**
 * Shared helpers for the REST API: typed JSON responses, the standard ApiError
 * envelope (mirrors components.schemas.ApiError in openapi.yaml), and a Zod
 * validation helper that throws a structured HttpError on bad input.
 */

/** Stable error codes used across the API. */
export type ApiErrorCode =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'conflict'
  | 'bad_request'
  | 'internal';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  validation: 400,
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal: 500,
};

/** A thrown error that route handlers translate into an ApiError JSON response. */
export class HttpError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

/** 200 (or custom) JSON success response. */
export function json<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

/** Build the standard error envelope as a typed NextResponse. */
export function errorResponse(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
  headers?: HeadersInit,
): NextResponse<ApiError> {
  const body: ApiError = {
    error: details === undefined ? { code, message } : { code, message, details },
  };
  return NextResponse.json(body, { status: STATUS_BY_CODE[code], headers });
}

/**
 * Translate any thrown value into an ApiError response. Use in a route's catch block:
 *   try { ... } catch (e) { return handleError(e); }
 */
export function handleError(err: unknown): NextResponse<ApiError> {
  if (err instanceof HttpError) {
    return errorResponse(err.code, err.message, err.details);
  }
  if (err instanceof z.ZodError) {
    return errorResponse('validation', 'Invalid request payload.', err.flatten());
  }
  if (err instanceof SyntaxError) {
    return errorResponse('bad_request', 'Malformed JSON body.');
  }
  const message =
    err instanceof Error ? err.message : 'An unexpected error occurred.';
  // Avoid leaking internals in production messages.
  console.error('[api] unhandled error:', err);
  return errorResponse(
    'internal',
    process.env.NODE_ENV === 'production' ? 'Internal server error.' : message,
  );
}

/**
 * Parse + validate a JSON request body against a Zod schema.
 * Throws HttpError('validation') with the flattened issues on failure.
 */
export async function validateJson<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError('bad_request', 'Request body must be valid JSON.');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError('validation', 'Invalid request payload.', result.error.flatten());
  }
  return result.data;
}

/** Validate an already-parsed value against a schema (throws on failure). */
export function validate<T>(value: unknown, schema: ZodSchema<T>): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError('validation', 'Invalid data.', result.error.flatten());
  }
  return result.data;
}
