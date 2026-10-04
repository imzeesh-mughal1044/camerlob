/**
 * lib/constants/messages.ts
 * Every user-facing string in the product, in one place.
 *
 * Nothing in `app/` or `components/` may hardcopy UI text. Keeping it here
 * makes the product's voice reviewable in a single diff and keeps translation
 * out of the component tree.
 *
 * Source: Documents/UI-UX-BRIEF.md sections 8 and 12.
 */

export const MESSAGES = {
  brand: {
    name: 'Camerlob',
    tagline: 'Convert any image format to any other.',
    promise: 'Local, free, unlimited. Your files never leave your machine.',
    description:
      'Camerlob is a local-first image format converter. Convert between 40+ formats in batches of up to 20 files, entirely in your browser or on your own machine. No signup, no uploads, no watermark.',
  },

  nav: {
    convert: 'Convert',
    formats: 'Formats',
    howItWorks: 'How it works',
    faq: 'FAQ',
    github: 'GitHub',
    skipToContent: 'Skip to main content',
  },

  landing: {
    heroTitle: 'Convert any image format to any other.',
    heroSubtitle:
      'Forty-plus formats, batches of twenty, and not a single byte leaves your machine. Free, no signup, no watermark.',
    primaryCta: 'Start converting',
    secondaryCta: 'See supported formats',
    featuresTitle: 'Why Camerlob',
    features: [
      {
        title: 'Local first',
        body: 'Files are decoded in your browser or processed on your own machine. Nothing is uploaded, so there is no server to trust and no file size surcharge.',
      },
      {
        title: '40+ formats',
        body: 'Consumer raster, professional layered and vector, and sixteen camera RAW families, all in one tool.',
      },
      {
        title: 'Batches of 20',
        body: 'Queue up to twenty files, convert them with a concurrency-capped pipeline, then download them all as a single ZIP.',
      },
      {
        title: 'No watermark',
        body: 'The output is the file you asked for, byte for byte, with no branding, no expiry and no account attached.',
      },
      {
        title: 'Open source',
        body: 'MIT licensed and built in the open. Read the code, run it yourself, or self-host it with Docker.',
      },
      {
        title: 'Works offline',
        body: 'After the first load the client engine needs no network at all, so a plane, a train or a locked-down network is not a problem.',
      },
    ],
    howItWorksTitle: 'How it works',
    howItWorks: [
      {
        step: '1',
        title: 'Choose your formats',
        body: 'Pick a source format and a target format. Camerlob only shows the pairs that actually exist.',
      },
      {
        step: '2',
        title: 'Drop your files',
        body: 'Drag in up to twenty files, or browse. Each one is validated before conversion begins.',
      },
      {
        step: '3',
        title: 'Convert and download',
        body: 'Conversion runs locally, then you download the results individually or as one ZIP archive.',
      },
    ],
    formatsTitle: 'Supported formats',
    formatsSubtitle:
      'RAW and layered formats need the local engines. Run the engine check to see what this machine can do.',
    faqTitle: 'Frequently asked questions',
    faq: [
      {
        question: 'Do my files get uploaded anywhere?',
        answer:
          'No. Consumer raster formats are converted entirely in your browser. Formats that need a native engine are processed by a server running on your own machine, started by you. Nothing is stored, logged or transmitted.',
      },
      {
        question: 'Why do some formats say LOCAL ONLY?',
        answer:
          'RAW, layered and vector formats cannot be decoded by a browser. They need ImageMagick, LibRaw or Ghostscript installed on your machine. The badge tells you before you try, and the engine check tells you exactly what is missing.',
      },
      {
        question: 'Why is the batch limited to twenty files?',
        answer:
          'To keep memory predictable. Each file is decoded into memory, so the limit is what stops a browser tab from becoming unresponsive. You can run as many batches as you like.',
      },
      {
        question: 'Can I convert HEIC to JPG?',
        answer:
          'Yes, and it happens in your browser. HEIC and HEIF are decoded with heic2any and never uploaded.',
      },
      {
        question: 'Is it really free?',
        answer:
          'Yes. MIT licensed, no accounts, no metering and no telemetry. There is no server bill to pass on to you.',
      },
    ],
  },

  convert: {
    title: 'Convert images',
    stepFormats: 'Formats',
    stepUpload: 'Upload',
    stepConvert: 'Convert',
    sourceLabel: 'Convert from',
    targetLabel: 'Convert to',
    searchPlaceholder: 'Search 40+ formats',
    searchLabel: 'Search formats',
    dropzoneIdle: 'Drop your files here',
    dropzoneActive: 'Release to add your files',
    dropzoneHint: 'or click to browse. Up to 20 files.',
    dropzoneHintSingle: 'or click to browse. One file at a time or up to 20.',
    chooseFiles: 'Choose files',
    removeFile: 'Remove {name}',
    clearQueue: 'Clear all',
    convertAction: 'Convert',
    converting: 'Converting',
    convertMore: 'Convert more files',
    queueEmpty: 'No files queued',
    queueEmptyHint: 'Choose a target format, then add up to 20 files.',
    counterLabel: '{used} / {max} FILES',
    counterRemaining: '{remaining} slots left',
    counterFull: 'Batch limit reached',
    progressLabel: 'Conversion progress',
    progressDetail: '{done} of {total} converted',
    unsupportedPair: 'That conversion is not supported.',
    selectBothFormats: 'Choose a source and a target format to continue.',
  },

  result: {
    title: 'Conversion complete',
    subtitle: '{succeeded} of {total} files converted',
    subtitleWithFailures: '{succeeded} of {total} converted, {failed} failed',
    downloadAll: 'Download all as ZIP',
    downloadOne: 'Download {name}',
    copyName: 'Copy filename',
    copied: 'Filename copied',
    failedTitle: '{count} files failed',
    failedHint: 'The rest converted normally. Adjust the batch and try again for these.',
    sizeDelta: '{percent} smaller',
    sizeDeltaLarger: '{percent} larger',
    sizeSaved: 'Saved {bytes} in total',
    localBadge: 'Converted on this machine',
    emptyState: 'Nothing to download yet',
    emptyStateHint: 'Run a conversion and the results will appear here.',
    backToConvert: 'Back to the converter',
  },

  theme: {
    toggle: 'Toggle colour theme',
    toDark: 'Switch to dark mode',
    toLight: 'Switch to light mode',
  },

  engine: {
    client: 'In your browser',
    server: 'On this machine',
    localOnly: 'LOCAL ONLY',
    missing: '{engine} not installed',
    ready: 'All engines ready',
    degraded: 'Some formats are unavailable on this machine',
    checkPrompt: 'Run `pnpm check-engines` for details.',
  },

  errors: {
    E001: "That conversion isn't supported.",
    E002: 'This file is too large to convert.',
    E003: 'Maximum 20 files per batch.',
    // No {format} token. A corrupt file is reported by the engine that opened
    // it, and the engine's throw sites do not reliably carry the source format
    // into the message, so a token here is a literal that reaches the user.
    E004: 'This file appears to be damaged or is not a valid image.',
    E005: "Couldn't convert this file in your browser. Retrying on the server.",
    E006: "{engine} isn't installed. Run `pnpm check-engines`.",
    E007: 'This file took too long to convert and was stopped.',
    E008: 'Ran out of memory. Try fewer or smaller files.',
    E009: 'Something went wrong. Please try again.',
    E010: "This file isn't really a {format} file.",
  },

  footer: {
    tagline: 'Local-first image conversion. MIT licensed, no telemetry, no accounts.',
    product: 'Product',
    formats: 'Formats',
    resources: 'Resources',
    legal: 'Legal',
    about: 'About',
    roadmap: 'Roadmap',
    changelog: 'Changelog',
    contributing: 'Contributing',
    codeOfConduct: 'Code of Conduct',
    security: 'Security',
    license: 'MIT License',
    issues: 'Report an issue',
    discussions: 'Discussions',
    copyright: 'Copyright (c) 2025 Camerlob Contributors',
    madeWith: 'Built with Next.js, Tailwind CSS and sharp.',
  },

  common: {
    retry: 'Try again',
    reset: 'Reset',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    loading: 'Loading',
    copy: 'Copy',
    copied: 'Copied',
    notFoundTitle: 'Page not found',
    notFoundBody: 'That URL does not exist. The converter is one click away.',
    errorTitle: 'Something went wrong',
    errorBody: 'An unexpected error occurred. You can retry without losing your queue.',
  },
} as const;

/** Convenience alias so components can type props against the copy table. */
export type Messages = typeof MESSAGES;

/**
 * Interpolate `{token}` placeholders. Values are HTML-escaped by React when
 * rendered as text, so this performs no escaping of its own.
 */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}

/**
 * `ERROR_MESSAGES` — the user-facing copy for every stable error code.
 *
 * WHY THIS EXISTS ALONGSIDE `MESSAGES.errors` AND `ERRORS`
 * ------------------------------------------------------------------------
 * Three tables now answer "what do we tell the user", and each answers for a
 * different caller:
 *
 *  - `ERRORS` (`lib/constants/errors.ts`) is the contract. It carries the HTTP
 *    status, the retry semantics and the developer hint, and its `message` is
 *    the server's own wording. A route that throws a `ConversionError` renders
 *    this and cannot get it wrong.
 *  - `MESSAGES.errors` is the product voice: warmer, shorter, written for the
 *    brief's section 8. It is what the copy review looks at.
 *  - `ERROR_MESSAGES` below is the single place the *upload and conversion
 *    surfaces* — drop zone toasts, file-card pills, the result page's failure
 *    rows — read from.
 *
 * The three are kept in step by having the last one carry the same `E001`-`E010`
 * key set. `MESSAGES.errors` is left untouched because it is the reviewed copy
 * and several landing-page strings quote it; `ERROR_MESSAGES` adds the two
 * upload-path codes the surfaces above need to distinguish, which is the whole
 * reason they are separate objects rather than one merged table.
 *
 * The `{format}` and `{engine}` tokens are interpolated by
 * {@link errorMessage}. Neither token is ever filled with a file path, a stack
 * frame or a binary path — the same constraint `ERRORS` documents.
 */
export const ERROR_MESSAGES = {
  E001: "That format pair isn't supported.",
  E002: 'That file is larger than the 50 MB limit.',
  E003: 'A batch holds at most 20 files.',
  // Placeholder-free by design — see the note on `MESSAGES.errors.E004`. This is
  // the copy the upload and conversion surfaces actually render, and it is read
  // with no vars at all, so a token would print verbatim.
  E004: "That file couldn't be read as a valid image.",
  E005: "This format can't be converted in the browser.",
  E006: '{engine} is not installed on this machine.',
  E007: 'That file took too long to convert and was stopped.',
  E008: 'Ran out of memory. Try fewer or smaller files.',
  E009: 'Something went wrong. Please try again.',
  E010: 'That file is really a {format} file, not a {expected} file.',
} as const satisfies Record<string, string>;

/** Every error code the UI has copy for. */
export type ErrorMessageCode = keyof typeof ERROR_MESSAGES;

/**
 * Look up user-facing copy for an error code.
 *
 * Unknown codes resolve to the E009 string rather than `undefined`. A code
 * arriving from a server that is newer than this bundle must still produce a
 * sentence a user can read, and "something went wrong" is the only honest
 * response to a code this build has never heard of.
 *
 * @param code Stable error code, e.g. `E010`.
 * @param vars Values for the `{format}` and `{engine}` tokens. A token with no
 *   value is left as-is, matching `interpolate` rather than printing `undefined`.
 */
export function errorMessage(code: string, vars: Record<string, string | number> = {}): string {
  const template: string = ERROR_MESSAGES[code as ErrorMessageCode] ?? ERROR_MESSAGES.E009;
  return interpolate(template, vars);
}
