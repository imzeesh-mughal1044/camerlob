# Camerlob — Error Codes

Every failure in the conversion pipeline is a `ConversionError` carrying a code
from `ERROR_CODES` (`types/error.ts`). The table lives in one place,
`lib/constants/errors.ts`, and both the client and the server import it — there is
no second list to drift.

## Why codes at all

A user does not care that `magick` exited 127. They care whether to try again,
install something, or give up. Every code below answers exactly one of those three
questions, and carries an HTTP status and two booleans that the router uses to
decide what to do next without any per-call-site branching.

| Code | HTTP | Meaning                                                           | Retryable | Escalates |
| ---- | ---- | ----------------------------------------------------------------- | --------- | --------- |
| E001 | 400  | The conversion is not supported.                                  | no        | no        |
| E002 | 413  | The file exceeds the size limit.                                  | no        | no        |
| E003 | 400  | Too many files in one batch.                                      | no        | no        |
| E004 | 500  | The input is damaged, truncated, or not the format it claims.     | no        | yes       |
| E005 | 500  | A browser-side conversion failed and was escalated to the server. | yes       | yes       |
| E006 | 500  | The engine that owns this format is not installed.                | no        | no        |
| E007 | 500  | The engine exceeded its timeout and was killed.                   | yes       | yes       |
| E008 | 500  | The engine ran out of memory.                                     | no        | yes       |
| E009 | 500  | An unclassified engine failure.                                   | yes       | yes       |
| E010 | 400  | The bytes do not match the declared format.                       | no        | no        |

**Retryable** means "the same bytes through the same path might succeed later" —
a timeout, a transient crash, an unknown failure. It does _not_ mean "retry now";
it authorises the router to try the next engine in the fallback chain.

**Escalates** means "a different engine is worth trying". A corrupt file (E004) and
a missing engine (E006) both fail the whole chain, so escalating them only wastes
time; E004 escalates because a truncated JPEG can sometimes be read by a more
forgiving decoder, and E006 deliberately does _not_ escalate because the engine is
missing everywhere on the machine, not just in this attempt.

## The two codes that are easy to confuse

**E001 vs E010.** Both are HTTP 400 and both mean "no", but they are different
faults and the difference is worth keeping:

- E001 — the _pair_ is not in the matrix. Asking for `png → psd` is a mistake in
  the request. Retrying cannot help.
- E010 — the _bytes_ contradict the declared source. A file called `.cr2` that is
  actually a PNG is either a bug or an attack. E010 is raised by the magic-byte
  check before any engine is invoked, which is why uploading a PNG as `cr2`
  returns E010 rather than E006 even though LibRaw is also missing. Byte
  verification happens first, on purpose.

**E004 vs E010.** Both mean "these bytes are not what you said". E004 is raised
when the format is _correct_ but the data is damaged or truncated; E010 when the
format itself is wrong. The messages differ because the user actions differ:
E010 means re-pick the format, E004 means the file is broken.

## Message safety

`messageFor(code, vars)` interpolates only a closed set of tokens — `{format}`,
`{engine}`, `{limit}`, `{count}`, `{max}` — where the values come from the format
registry and the limits table, never from a user-supplied string. An adapter that
wants a specific message passes a safe `message` to `makeConversionError`; the
fallback is the table's template. Engine stderr is **never** interpolated into a
response body. It goes to the server log via `logConversionError` and the client
receives the template message plus the code. This is what keeps a crafted
filename or a hostile image's embedded EXIF out of the JSON we hand back.

## Client shape

`serialiseConversionError` produces the `error` object the API returns. It carries
the code, the message and `retryable` — and nothing else:

```json
{
  "error": {
    "code": "E006",
    "message": "imagemagick isn't installed. Run `pnpm check-engines`.",
    "retryable": false
  }
}
```

No stack traces, no paths, no engine stderr, no `path` to a binary. Note this is
nested under `error`, where a flat `{ code, message }` body would also have been a
defensible reading of the TRD; the nested shape is what the helpers in
`lib/utils/api-response.ts` emit, and `Documents/API-REFERENCE.md` records it as a
deviation rather than pretending the TRD said so.

## Status mapping

`statusForError(error)` returns `ERRORS[code].http` for a `ConversionError` and
`ERRORS.E009.http` (500) for anything else. An unrecognised value reaching the API
is a 500 with E009, never a 500 with an empty body and never a leaked message.
