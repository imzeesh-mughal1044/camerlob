/**
 * lib/utils/cn.ts
 * Tailwind class merger. Combines `clsx` conditional composition with
 * `tailwind-merge` conflict resolution, so a caller can always override a
 * component's defaults from the outside.
 *
 * This is the only place className strings are assembled; shadcn/ui primitives
 * and Camerlob components all import `cn` from here.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class values and resolve Tailwind conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type { ClassValue };
