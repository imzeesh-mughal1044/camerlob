# Camerlob — API Reference

Four endpoints. All JSON. All under `app/api/`.

Two shapes are worth stating up front because they are deliberate choices rather
than transcription of the TRD:

- **Partial batch failure returns HTTP 200.** A 20-file batch where 19 succeed
  has a result worth rendering. The counts live in `summary`.
- **Errors are nested under `error`:** `{ "error": { "code", "message",
"retryable" } }`. The TRD's flat `{ code, message }` is a defensible reading;
  the helpers in `lib/utils/api-response.ts` emit the nested form, and this
  document records that as a deviation.

---

## `GET /api/health`

Engine availability. Probes are cached for 60s, so this is cheap to call.

```json
{
  "status": "degraded",
  "engines": [
    { "name": "sharp", "available": true, "required": false, "version": "0.33.4" },
    { "name": "imagemagick", "available": false, "required": true },
    { "name": "libraw", "available": false, "required": true },
    { "name": "ghostscript", "available": false, "required": false },
    { "name": "client", "available": true, "required": false, "version": "browser" }
  ],
  "checkedAt": "2026-09-26T15:41:07.512Z"
}
```

`status` is `ok` only when every `required: true` engine is available. There is no
top-level `version`; versions are per engine. `hooks/useEngineStatus.ts` accepts
this shape and also a boolean-map shape from an older server.

`200` even when `degraded` — the endpoint worked, and the answer is "no".

---

## `GET /api/formats`

The whole matrix, for rendering the picker.

```json
{
  "sources": [
    {
      "id": "jpg",
      "label": "JPG",
      "category": "raster",
      "accept": ".jpg,.jpeg,.jfif",
      "targets": [{ "to": "png", "engine": "sharp", "clientSide": true }]
    }
  ],
  "targets": [{ "id": "png", "label": "PNG", "category": "raster" }],
  "maxFiles": 20,
  "maxFileSizeMb": 100,
  "maxBatchSizeMb": 500
}
```

40 sources, 11 targets, 169 pairs. `engine` is the resolved server engine
(`EngineName`), which is not the same as the matrix's `client` flag — `clientSide`
on each target says whether a browser could do that pair instead. `maxFileSizeMb`
is the **client** limit; the server enforces 50MB per file (E002).

---

## `GET /api/formats/[format]`

One source, with the reason behind each target.

```json
{
  "format": "jpg",
  "label": "JPG",
  "category": "raster",
  "accept": ".jpg,.jpeg,.jfif",
  "clientSide": true,
  "targets": [
    {
      "to": "png",
      "engine": "sharp",
      "clientSide": true,
      "reason": "jpg to png is handled entirely in-process by sharp, with imagemagick as a fallback."
    },
    {
      "to": "ico",
      "engine": "imagemagick",
      "clientSide": false,
      "reason": "jpg or ico needs a delegate only ImageMagick has."
    }
  ]
}
```

`404` with `E001` for an unknown format. `accept` is the string to put on the file
input — `jpg` → `.jpg,.jpeg,.jfif`, `heic` → `.heic,.heif`.

---

## `POST /api/convert`

`multipart/form-data`.

| Field          | Type    | Notes                                  |
| -------------- | ------- | -------------------------------------- |
| `files`        | File[]  | 1–20 entries, each ≤50MB, batch ≤500MB |
| `sourceFormat` | string  | matrix source id                       |
| `targetFormat` | string  | matrix target id                       |
| `quality`      | 1–100   | optional, default 90                   |
| `clientSide`   | boolean | optional; `true` is refused with 400   |

The declared `sourceFormat` is a claim, not a fact — the bytes decide, and a
mismatch is E010.

```json
{
  "results": [
    {
      "originalName": "holiday.png",
      "filename": "holiday.webp",
      "engine": "sharp",
      "size": 102,
      "mimeType": "image/webp",
      "width": 120,
      "height": 80,
      "durationMs": 84,
      "dataUrl": "data:image/webp;base64,UklGR..."
    }
  ],
  "failures": [],
  "summary": { "total": 1, "succeeded": 1, "failed": 0, "totalDurationMs": 84 }
}
```

Files come back inline as `dataUrl`; nothing is written to a permanent location
after the response, and the temp directory is removed in a `finally` before the
response is sent. Duplicate names in one batch are disambiguated
(`same.webp`, `same-2.webp`, `same-3.webp`).

**Partial failure is still `200`:**

```json
{
  "results": [{ "originalName": "holiday.png", "filename": "holiday.webp", "...": "..." }],
  "failures": [
    {
      "originalName": "bad1.png",
      "code": "E004",
      "message": "This file appears to be damaged or isn't really a png file.",
      "retryable": false
    }
  ],
  "summary": { "total": 4, "succeeded": 1, "failed": 3, "totalDurationMs": 15 }
}
```

A `4xx` means the **request** was wrong and there is nothing per-file to report:

| Status | Code                     | Cause                                                                        |
| ------ | ------------------------ | ---------------------------------------------------------------------------- |
| 400    | E001                     | pair not in the matrix; no files; `quality` out of range; `clientSide: true` |
| 405    | E001                     | method is not POST                                                           |
| 413    | E002                     | a file is over 50MB                                                          |
| 400    | E003                     | more than 20 files                                                           |
| 500    | E004/E005/E007/E008/E009 | see `Documents/ERROR-CODES.md`                                               |

---

## Client

`GET` → `405`. Every response carries `Cache-Control: no-store` — a conversion
result or a health probe must not be served from a cache after the user installs
an engine.
