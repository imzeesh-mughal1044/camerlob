/**
 * lib/convert/canvas.ts
 * Canvas API wrapper: decode, draw, encode, release.
 *
 * Every operation here is main-thread work, so the two rules that keep a
 * 20-file batch responsive are enforced in this file rather than left to
 * callers: the canvas is resized to zero immediately after encoding, and every
 * object URL is revoked.
 */

import { ConversionError } from '@/lib/constants/errors';
import { DEFAULT_MAX_DIMENSION, DEFAULT_QUALITY } from '@/lib/constants/limits';
import type { ConversionOptions } from '@/types/engine';

/** Result of a canvas round-trip, including the dimensions actually used. */
export interface CanvasResult {
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
  /** True when the source exceeded `maxDimension` and was downscaled. */
  readonly downscaled: boolean;
}

/** Decode a `File` into an `ImageBitmap`, which avoids holding an `<img>` alive. */
export async function decodeToImageBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== 'function') {
    throw new ConversionError('E005', 'createImageBitmap is unavailable in this environment');
  }
  try {
    return await createImageBitmap(file);
  } catch (cause) {
    throw new ConversionError('E004', `Canvas decode failed for ${file.name}`, {}, { cause });
  }
}

/** Decode a `File` into an `HTMLImageElement`. Fallback for older Safari. */
export async function decodeToImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new ConversionError('E004', `Image decode failed for ${file.name}`));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Scale dimensions so the longest edge is at most `maxEdge`. Never upscales. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number = DEFAULT_MAX_DIMENSION
): { width: number; height: number; downscaled: boolean } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height, downscaled: false };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    downscaled: true,
  };
}

/** The MIME type the browser will produce for a given extension. */
export function canvasMimeFor(extension: string): string {
  switch (extension.toLowerCase().replace(/^\./, '')) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'jpg':
    case 'jpeg':
    case 'jfif':
      return 'image/jpeg';
    case 'bmp':
      return 'image/bmp';
    default:
      // JPEG is the only universally supported losless-free fallback.
      return 'image/jpeg';
  }
}

/** `true` when the browser can encode this extension via `canvas.toBlob`. */
export function canEncode(extension: string): boolean {
  return ['png', 'webp', 'avif', 'jpg', 'jpeg', 'jfif', 'bmp'].includes(
    extension.toLowerCase().replace(/^\./, '')
  );
}

/**
 * Convert a decoded image to a target format using a canvas.
 *
 * The canvas is released to zero width in a `finally` block: browsers cap the
 * total canvas area, and twenty retained 8000px canvases will exhaust it.
 */
export async function convertViaCanvas(
  source: ImageBitmap | HTMLImageElement,
  target: string,
  options: ConversionOptions = {}
): Promise<CanvasResult> {
  if (typeof document === 'undefined') {
    throw new ConversionError('E005', 'convertViaCanvas requires a DOM');
  }

  const naturalWidth = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const naturalHeight = 'naturalHeight' in source ? source.naturalHeight : source.height;

  if (!naturalWidth || !naturalHeight) {
    throw new ConversionError('E004', 'Decoded image reported zero dimensions');
  }

  const { width, height, downscaled } = fitWithin(
    naturalWidth,
    naturalHeight,
    options.maxDimension ?? DEFAULT_MAX_DIMENSION
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  try {
    const context = canvas.getContext('2d', { alpha: options.preserveAlpha ?? true });
    if (!context) {
      throw new ConversionError('E005', '2d canvas context unavailable');
    }

    // JPEG has no alpha channel; without this the transparent area turns black.
    if (canvasMimeFor(target) === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
    }

    context.drawImage(source, 0, 0, width, height);

    const mimeType = canvasMimeFor(target);
    const quality = (options.quality ?? DEFAULT_QUALITY) / 100;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new ConversionError('E005', `canvas.toBlob returned null for ${target}`));
        },
        mimeType,
        quality
      );
    });

    return { blob, width, height, downscaled };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    if ('close' in source && typeof source.close === 'function') {
      source.close();
    }
  }
}

/** Create a small object URL for a thumbnail, for the file card preview. */
export async function createThumbnailUrl(file: File, maxEdge = 96): Promise<string | null> {
  try {
    const bitmap = await decodeToImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return null;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    canvas.width = 0;
    canvas.height = 0;
    bitmap.close();
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    // A missing thumbnail is cosmetic; never fail a conversion over it.
    return null;
  }
}
