/**
 * lib/utils/api-response.ts
 * The single place an error becomes an HTTP response.
 *
 * WHY A HELPER
 * ------------------------------------------------------------------------
 * `detail` — the stack, the spawn argv, the engine's stderr — must never reach
 * the network. Enforcing that in one function means a new route cannot get it
 * wrong by hand-rolling a `NextResponse.json({ message: error.message })`, which
 * is exactly how a stack trace ends up in a browser console on a public site.
 *
 * So every route funnels its failures through {@link errorResponse}, and the
 * serialisation of a `ConversionError` happens in exactly one place.
 */

import { NextResponse } from 'next/server';

import {
  ConversionError,
  serialiseConversionError,
  statusForError,
  toConversionError,
} from '@/lib/constants/errors';

/** Headers every API response carries. */
const NO_STORE = {
  // Engine availability and format support change when a user installs a binary
  // or edits a matrix, so nothing here may be cached by a browser or a CDN.
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  // Stop a response being sniffed as something other than JSON.
  'Content-Type': 'application/json',
} as const;

/** A successful JSON response. */
export function jsonResponse<T>(body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/**
 * An error response, in the shape every route uses.
 *
 * The body is `{ error: { code, message, retryable } }` — deliberately *not* the
 * flat `{ success, code, message }` of TRD 8.1, and deliberately not the
 * `{ results, failures, summary }` of a successful batch. An error is not a
 * batch with zero successes, and conflating the two means a client has to guess
 * which shape it received. This deviation is recorded in
 * `Documents/API-REFERENCE.md`.
 */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  retryable = false
): NextResponse<{ error: { code: string; message: string; retryable: boolean } }> {
  return NextResponse.json({ error: { code, message, retryable } }, { status, headers: NO_STORE });
}

/**
 * Turn any thrown value into an error response.
 *
 * An unrecognised throw becomes E009 with a generic message; its stack goes to
 * the server log via `console.error` and stops there.
 */
export function errorResponseFrom(error: unknown): NextResponse<{
  error: { code: string; message: string; retryable: boolean };
}> {
  const conversionError: ConversionError = toConversionError(error);

  // Log the private half. Never the response.
  console.error(
    `[camerlob] ${conversionError.code} ${conversionError.detail || conversionError.message}`
  );

  const serialised = serialiseConversionError(conversionError);
  return errorResponse(
    statusForError(conversionError),
    serialised.code,
    serialised.message,
    serialised.retryable
  );
}

/** A 405 for a method a route does not implement. */
export function methodNotAllowed(allowed: readonly string[]): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: 'E001',
        message: `Method not allowed. Use ${allowed.join(' or ')}.`,
        retryable: false,
      },
    },
    { status: 405, headers: { ...NO_STORE, Allow: allowed.join(', ') } }
  );
}
