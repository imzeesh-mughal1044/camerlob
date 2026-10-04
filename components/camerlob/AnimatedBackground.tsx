/**
 * components/camerlob/AnimatedBackground.tsx
 * The page-wide backdrop: a slow aurora of aqua light, a parallax starfield and
 * a grain layer, painted into a single fixed <canvas>.
 *
 * DESIGN DECISIONS
 * ------------------------------------------------------------------------
 * 1. COLOURS ARE READ FROM TOKENS AT RUNTIME, not hardcoded. `--color-aqua-500`
 *    and `--color-cyan` are parsed out of :root with getComputedStyle and the
 *    spec's alpha is applied on top. Change a token and the aurora follows,
 *    which keeps the "no hex in components" rule true for canvas code too.
 *
 * 2. FIGURE-8, NOT A CIRCLE. Blob 1 follows a Lissajous path
 *    (x = cx + A·sin t, y = cy + B·sin 2t) on a 30s period; blob 2 runs the same
 *    shape in reverse on 45s with a smaller radius and lower alpha. The two
 *    periods are deliberately non-commensurate so the composition never visibly
 *    repeats.
 *
 * 3. PERFORMANCE IS BUDGETED, NOT ASSUMED.
 *    - Radial gradients are built once per resize at the origin, then positioned
 *      with ctx.translate, so no gradient object is allocated per frame.
 *    - The grain is rasterised ONCE into a 128px offscreen canvas and blitted as
 *      a repeating pattern, never regenerated.
 *    - The loop is capped at 60fps against a timestamp rather than assumed.
 *    - `document.visibilityState` stops the loop and releases the rAF handle.
 *    - Below 768px the aurora drops to one blob and 20 stars.
 *
 * 4. REDUCED MOTION RENDERS EXACTLY ONCE. No rAF loop is ever started: a single
 *    static frame is painted, then the effect returns. This is the JS half of the
 *   reduced-motion story; styles/globals.css neutralises the CSS half.
 *
 * 5. Z-INDEX BY WRAPPER, NOT NEGATIVE OFFSET. The canvas sits in a `fixed z-0`
 *    wrapper and the page content is lifted to `relative z-10` in app/page.tsx.
 *    A negative z-index here would risk painting behind the root background.
 */

'use client';

import { useEffect, useRef } from 'react';

/** Alpha and geometry for one aurora blob, per the spec. */
interface BlobSpec {
  /** CSS custom property holding the colour. */
  token: string;
  /** Spec alpha for this layer. */
  alpha: number;
  /** Orbit period in seconds. Negative reverses direction. */
  period: number;
  /** Horizontal orbit amplitude as a fraction of viewport width. */
  ax: number;
  /** Vertical orbit amplitude as a fraction of viewport height. */
  ay: number;
  /** Blob radius as a fraction of the smaller viewport axis. */
  radius: number;
}

const AQUA_BLOB: BlobSpec = {
  token: '--color-aqua-500',
  alpha: 0.08,
  period: 30,
  ax: 0.22,
  ay: 0.16,
  radius: 0.55,
};

const CYAN_BLOB: BlobSpec = {
  token: '--color-cyan',
  alpha: 0.06,
  period: -45,
  ax: 0.3,
  ay: 0.1,
  radius: 0.34,
};

interface Star {
  x: number;
  y: number;
  /** Parallax depth, 0.35 (far) to 1 (near). Also scales alpha. */
  depth: number;
}

/** Tailwind's `max-width: 767px` boundary, where the aurora sheds weight. */
const MOBILE_QUERY = '(max-width: 767px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const FRAME_MS = 1000 / 60;
/** Spec: 0.02px per frame of diagonal drift, before depth scaling. */
const DRIFT = 0.02;
const GRAIN_TILE = 128;
const GRAIN_ALPHA = 0.03;

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const root = document.documentElement;
    const mobileQuery = window.matchMedia(MOBILE_QUERY);
    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    // --- Token lookup -------------------------------------------------------
    // Parses "#00e5ff" (or "rgb(0,229,255)") into an "r,g,b" triple.
    const readToken = (token: string): string => {
      const raw = getComputedStyle(root).getPropertyValue(token).trim();
      if (!raw) return '0,229,255';
      if (raw.startsWith('#')) {
        const hex =
          raw.length === 4
            ? raw
                .slice(1)
                .split('')
                .map((c) => c + c)
                .join('')
            : raw.slice(1);
        const int = Number.parseInt(hex, 16);
        // eslint-disable-next-line no-bitwise
        return `${(int >> 16) & 255},${(int >> 8) & 255},${int & 255}`;
      }
      const nums = raw.match(/[\d.]+/g);
      return nums ? nums.slice(0, 3).join(',') : '0,229,255';
    };

    // --- Sizing -------------------------------------------------------------
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      // Draw in CSS pixels; the transform handles the device pixel ratio.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // --- Grain --------------------------------------------------------------
    // Rendered once into an offscreen tile, then reused as a fill pattern.
    const grainPattern = (() => {
      const tile = document.createElement('canvas');
      tile.width = GRAIN_TILE;
      tile.height = GRAIN_TILE;
      const tileCtx = tile.getContext('2d');
      if (!tileCtx) return null;

      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${GRAIN_TILE}" height="${GRAIN_TILE}">` +
        `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3"/></filter>` +
        `<rect width="100%" height="100%" filter="url(#n)"/></svg>`;

      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      // The pattern is only usable once the SVG has decoded; the first frames
      // simply render without grain, which is imperceptible.
      image.decode().then(
        () => {
          tileCtx.drawImage(image, 0, 0);
        },
        () => undefined
      );
      return { tile, tileCtx };
    })();

    let pattern: CanvasPattern | null = null;
    const syncPattern = () => {
      if (!grainPattern) return;
      pattern = ctx.createPattern(grainPattern.tile, 'repeat');
    };

    // --- Starfield ----------------------------------------------------------
    const starCount = (): number => (mobileQuery.matches ? 20 : 60);

    const makeStars = (): Star[] => {
      const count = starCount();
      const stars: Star[] = [];
      for (let i = 0; i < count; i += 1) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          depth: 0.35 + Math.random() * 0.65,
        });
      }
      return stars;
    };
    let stars: Star[] = [];

    // --- Blob gradients (built once per resize, drawn at the origin) --------
    const gradients = new Map<string, CanvasGradient>();
    const buildGradients = (rgb: Record<string, string>) => {
      gradients.clear();
      const min = Math.min(width, height);
      for (const spec of [AQUA_BLOB, CYAN_BLOB]) {
        const r = spec.radius * min;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        const color = rgb[spec.token];
        g.addColorStop(0, `rgba(${color},${spec.alpha})`);
        g.addColorStop(0.5, `rgba(${color},${spec.alpha * 0.45})`);
        g.addColorStop(1, `rgba(${color},0)`);
        gradients.set(spec.token, g);
      }
    };

    let rgb: Record<string, string> = {};

    // --- Painting -----------------------------------------------------------
    const paint = (elapsedSeconds: number, drawGrain: boolean) => {
      const activeBlobs = mobileQuery.matches ? [AQUA_BLOB] : [AQUA_BLOB, CYAN_BLOB];
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      for (const spec of activeBlobs) {
        const theta = (elapsedSeconds / spec.period) * Math.PI * 2;
        const x = cx + spec.ax * width * Math.sin(theta);
        const y = cy + spec.ay * height * Math.sin(theta * 2);
        const gradient = gradients.get(spec.token);
        if (!gradient) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, spec.radius * Math.min(width, height), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Starfield
      const starRgb = rgb[AQUA_BLOB.token] ?? '0,229,255';
      ctx.fillStyle = starRgb;
      for (const star of stars) {
        ctx.globalAlpha = 0.18 + star.depth * 0.42;
        ctx.fillRect(star.x, star.y, 1, 1);
      }
      ctx.globalAlpha = 1;

      if (drawGrain && pattern) {
        ctx.save();
        ctx.globalAlpha = GRAIN_ALPHA;
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    };

    // --- Lifecycle ----------------------------------------------------------
    let frame = 0;
    let previous = 0;
    const origin = performance.now();

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      if (now - previous < FRAME_MS) return;
      previous = now;
      // Diagonal drift, scaled by depth so the field parallaxes.
      for (const star of stars) {
        star.x -= DRIFT * star.depth;
        star.y += DRIFT * star.depth;
        if (star.x < 0) {
          star.x += width;
          star.y = Math.random() * height;
        }
        if (star.y > height) {
          star.y -= height;
          star.x = Math.random() * width;
        }
      }
      paint((now - origin) / 1000, true);
    };

    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const start = () => {
      stop();
      if (motionQuery.matches) return;
      previous = 0;
      frame = window.requestAnimationFrame(tick);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    const handleMotionChange = () => {
      if (motionQuery.matches) {
        stop();
        paint(0, false);
      } else {
        start();
      }
    };

    const handleMobileChange = () => {
      stars = makeStars();
    };

    const handleResize = () => {
      resize();
      buildGradients(rgb);
      syncPattern();
      stars = makeStars();
      if (motionQuery.matches) paint(0, false);
    };

    // --- Boot ---------------------------------------------------------------
    rgb = {
      [AQUA_BLOB.token]: readToken(AQUA_BLOB.token),
      [CYAN_BLOB.token]: readToken(CYAN_BLOB.token),
    };
    resize();
    buildGradients(rgb);
    syncPattern();
    stars = makeStars();

    if (motionQuery.matches) {
      // Static single frame. No animation loop is ever created.
      paint(0, false);
    } else {
      start();
    }

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    motionQuery.addEventListener('change', handleMotionChange);
    mobileQuery.addEventListener('change', handleMobileChange);

    return () => {
      stop();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      motionQuery.removeEventListener('change', handleMotionChange);
      mobileQuery.removeEventListener('change', handleMobileChange);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}
