/**
 * components/camerlob/Logo.tsx
 * The wordmark, loaded from the brand asset with next/image.
 *
 * DESIGN DECISIONS
 * ------------------------------------------------------------------------
 * 1. INTRINSIC RATIO IS PRESERVED. CAMERLOB_nav.png is 995x251 (3.964:1). The
 *    width/height attributes describe that ratio so the navbar never shifts when
 *    the image decodes, and every size sets an explicit height with `w-auto`, so
 *    the mark is never distorted. Sizes follow the responsive table: 28px in the
 *    footer, 32px on tablet, 36px on desktop.
 *
 *    Pass either `height` (a fixed px height) or `sizeClasses` (responsive
 *    Tailwind classes). They are mutually exclusive; `sizeClasses` wins because
 *    responsive sizing is the common case in the navbar.
 *
 * 2. THE HOVER GLOW IS A drop-shadow FILTER, not a box-shadow. A box-shadow
 *    would draw a rectangle behind a transparent PNG; the filter traces the
 *    glyphs themselves, which is what "subtle aqua glow" should look like.
 *
 * 3. `priority` defaults to true because the mark is the largest above-the-fold
 *    paint on the landing page. The footer passes priority={false} so the same
 *    asset is deduplicated instead of preloaded twice.
 */

import Image from 'next/image';

import { cn } from '@/lib/utils/cn';

export interface LogoProps {
  /** Fixed height in px. Ignored when `sizeClasses` is set. */
  height?: number;
  /** Responsive Tailwind height classes, e.g. "h-7 md:h-8 xl:h-9". */
  sizeClasses?: string;
  /** Classes for the wrapping element (the glow/transition box). */
  className?: string;
  /** Preload the asset. Default true for the above-the-fold navbar. */
  priority?: boolean;
  /** Accessible name. Pass "" when adjacent visible text already names it. */
  alt?: string;
  /** Enable the aqua drop-shadow on hover. */
  glow?: boolean;
}

export function Logo({
  height = 36,
  sizeClasses,
  className,
  priority = true,
  alt = 'Camerlob',
  glow = true,
}: LogoProps) {
  return (
    <span
      className={cn(
        'relative inline-flex items-center transition-[filter] duration-200 ease-camerlob-out',
        glow && 'hover:[filter:drop-shadow(0_0_12px_rgba(0,229,255,0.35))]',
        className
      )}
    >
      <Image
        src="/CAMERLOB_nav.png"
        alt={alt}
        width={143}
        height={36}
        priority={priority}
        className={cn('w-auto', !sizeClasses && 'h-9', sizeClasses)}
        style={sizeClasses ? undefined : { height: `${height}px` }}
      />
    </span>
  );
}
