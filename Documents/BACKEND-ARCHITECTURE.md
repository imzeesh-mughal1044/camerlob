# Camerlob — Backend Architecture

What the server actually does when a file is converted, and why each stage is
where it is.

## Request flow

```
client  POST /api/convert  (multipart, N files)
   │
   ├─ convertRequestSchema.parse        zod: sourceFormat, targetFormat, quality
   │                                   1..20 files, per-file ≤50MB, batch ≤500MB
   ├─ detectFormatFromBuffer(bytes)    the ONLY thing that decides the format
   ├─ formatsEquivalent(detected, declared)?   no → E010
   ├─ shouldUseClientSide(...)?        yes → 400, run it in the browser
   ├─ planExecutionChain(source, target)
   │     ├─ isConversionSupported?     no → E001
   │     ├─ getEngineFor(...)          capability order, see FORMAT-MATRIX.md
   │     ├─ getFallbackEngines(...)
   │     └─ prune engines that are not available
   ├─ runWithConcurrency(3)
   │     └─ executeWithFallback
   │           ├─ spawn / sharp, temp files, finally-cleanup
   │           ├─ retryable error or E006? → next engine
   │           └─ otherwise → throw, one attempt only
   └─ { results, failures, summary }   partial failure is still HTTP 200
```

## Layering

| Directory               | May import                                              | Never                                                       |
| ----------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| `types/`                | nothing                                                 | anything at runtime — these are pure types, erased at build |
| `lib/constants/`        | `types/`                                                | engines, Next, `node:*`                                     |
| `lib/utils/`            | `types/`, `constants/`                                  | engines, Next                                               |
| `lib/convert/engines/`  | `types/`, `constants/`, `utils/`, `spawn`, `temp-files` | the router, `formats.ts`, Next `Response`                   |
| `lib/convert/router.ts` | engines                                                 | Next                                                        |
| `app/api/*/route.ts`    | router, validation, api-response                        | engines directly                                            |

Two rules do most of the work here:

- **Engines never know about HTTP.** An adapter throws `ConversionError`; it does
  not build a `Response` and does not set a status. That is what lets the same
  adapter serve a batch route, a test, and a future CLI unchanged.
- **`types/` stays pure.** A `import type` that survives into emitted JavaScript
  is a bug, because a server-only enum dragged into a client component leaks the
  server's shape into the bundle.

## Engine resolution is capability-driven

The matrix records which pairs are allowed. It does not record which engine will
handle them — the runtime does, from the format's category and the actual
capabilities of the installed binaries. A matrix row that says `sharp` for a pair
sharp cannot encode would be caught by `backend:audit`, but the resolver does not
trust the row anyway. See `Documents/FORMAT-MATRIX.md` for the ordering and the
measured sharp capability table.

## Availability and health

`lib/convert/engines/detect.ts` probes each engine once and caches the result for
`HEALTH_CACHE_SECONDS` (60):

- **sharp** — a dynamic import, so it works with no binary on the machine.
- **imagemagick** — tries the configured path, then `magick`, then `convert`, to
  cover ImageMagick 7 and 6.
- **libraw** — `dcraw_emu -v`.
- **ghostscript** — `gs --version`.

`status` is `ok` only when every engine with `required: true` is available;
otherwise `degraded`. A machine with only sharp installed is honestly `degraded`,
which is the correct answer: RAW, layered, BMP, ICO and PDF cannot be done there.

Probes are cached but failures are remembered, so a user who has not installed
LibRaw does not pay for a `dcraw_emu` spawn on every mount.

## Process execution

`lib/convert/engines/spawn.ts` is the only place a subprocess starts.

- `shell: false`, always, with an argument array. There is no string to quote and
  no separator to escape, so a filename like `; rm -rf ~` is just a filename.
- `maxBuffer` is set; an engine that prints megabytes is truncated, not buffered
  into the heap.
- The timeout kills the child, and the error becomes E007.
- stderr is captured for the log and never put in a response body.

## Temp files

`lib/utils/temp-files.ts` creates a run-scoped directory per conversion, with
random names, inside the system temp dir or `TEMP_DIR`. Every engine call is
wrapped so the directory is removed in a `finally`, including on timeout and on
throw. Two independent sweeps (interval and max-age) catch anything a hard kill
left behind, since a `SIGKILL` never runs a `finally`. Filenames from the client
are sanitised to a bare basename before they are ever joined to a path — the
`accept` path, the download filename, and the temp name are all sanitised
separately, because one of them being safe says nothing about the others.

## Format verification

The declared `sourceFormat` and the filename extension are both treated as claims.
`detectFormatFromBuffer` reads the magic bytes — and deliberately takes **no
filename argument at all**, so there is no argument a caller could pass to
influence the answer. If the bytes contradict the claim, the result is E010 and
no engine is invoked. `formatsEquivalent` then permits the legitimate alias cases
(`.jpeg` submitted as `jpg`) instead of rejecting a correct file over spelling.

This runs before engine selection, which is why a PNG submitted as `cr2` returns
E010 and not E006, even though LibRaw is also missing: the request was already
wrong before engine availability became relevant.

## The client bridge

`EngineName` includes a `client` value so the browser path is a real step in the
plan rather than a boolean bolted on. `planExecutionChain({ preferClient })` puts
`client` first only when the browser can genuinely do the pair — checked with
`canBrowserConvert`, which requires both ends to be browser-encodable and the
input under the client size limit. The server does not "optimise" to the client
otherwise.

`POST /api/convert` will refuse `clientSide: true` with a 400 telling the user to
convert locally rather than uploading the file, which is the whole point of having
chosen it.

## Batch semantics

- At most `MAX_CONCURRENCY` (3) engines run at once; a 20-file batch is not 20
  simultaneous processes.
- One file's failure never fails the batch. `results` and `failures` are returned
  side by side with a `summary`, and the status is 200 — a partial success is a
  success, and a UI that shows "19 of 20 converted, 1 failed" should not have to
  parse a 4xx to learn that.
- A 4xx from the endpoint means **the request itself** was wrong (bad pair, no
  files, too many, quality out of range, client-side refusal) and there is no
  per-file result to report.
