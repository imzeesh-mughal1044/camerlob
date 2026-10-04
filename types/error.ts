/**
 * types/error.ts
 * The error-code vocabulary, as a type.
 *
 * WHY THIS LIVES IN `types/` AND NOT IN `lib/constants/errors.ts`
 * ------------------------------------------------------------------------
 * The runtime table (`ERRORS`, the `ConversionError` class, the serialiser) must
 * live in `lib/`, because it has behaviour. The *code union* is a pure type, and
 * Documents/FOLDER-ARCHITECTURE.md 6.1 forbids `types/` from importing `lib/`.
 * `ConversionErrorInfo` in `types/conversion.ts` needs to name a code, so the
 * union has to be reachable from the type layer. Rather than weaken that rule,
 * the union is declared here and re-exported from `lib/constants/errors.ts`, so
 * every existing `import type { ErrorCode } from '@/lib/constants/errors'` keeps
 * working unchanged.
 *
 * This module contains no runtime code, per FOLDER-ARCHITECTURE.md 4.9.
 */

/**
 * Stable error codes, E001-E010.
 *
 * These strings are part of the public API contract: they are returned in
 * response bodies and are matched by the frontend. Renaming one is a breaking
 * change. The meanings are tabulated in `Documents/ERROR-CODES.md`.
 *
 * - E001 unsupported conversion pair
 * - E002 file too large
 * - E003 too many files
 * - E004 corrupt or unreadable file
 * - E005 engine failed, retryable
 * - E006 required engine missing on the server
 * - E007 conversion timed out
 * - E008 out of memory
 * - E009 all engines failed, or unclassified throw
 * - E010 declared format does not match the file's actual bytes
 */
export type ErrorCode =
  | 'E001'
  | 'E002'
  | 'E003'
  | 'E004'
  | 'E005'
  | 'E006'
  | 'E007'
  | 'E008'
  | 'E009'
  | 'E010';
