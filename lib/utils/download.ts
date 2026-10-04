/**
 * lib/utils/download.ts
 * Triggers a browser download for a `Blob` and cleans up the object URL.
 *
 * The URL is revoked in a `finally` block after the click has been dispatched.
 * Revoking it synchronously races the download in some browsers.
 */

/** Download a blob under the given filename. */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') {
    throw new Error('downloadBlob is browser-only.');
  }

  const url = URL.createObjectURL(blob);
  try {
    triggerAnchorClick(url, filename);
  } finally {
    // Give the browser a tick to start the transfer before releasing the URL.
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }
}

/** Shared anchor click, used by both the blob and data-URL paths. */
function triggerAnchorClick(url: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/** Convert a Blob to a `data:` URL, for JSON API responses. */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return bytesToDataUrl(new Uint8Array(buffer), blob.type);
}

/** Encode bytes as a `data:` URL with base64 payload. */
export function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  // Chunked to stay clear of the argument-count limit on large RAW files.
  const CHUNK = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += CHUNK) {
    const chunk = bytes.subarray(index, index + CHUNK);
    binary += String.fromCharCode(...chunk);
  }
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64');
  return `data:${mimeType || 'application/octet-stream'};base64,${base64}`;
}

/** Resolve a `data:` URL back into a Blob, for the client-side result path. */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/** Copy text to the clipboard, falling back to a hidden textarea. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path below.
  }

  if (typeof document === 'undefined') return false;

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}
