/**
 * app/loading.tsx
 * Root-segment Suspense fallback. Chrome-free, because the shell is suspended
 * along with the page.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. NO AURORA. The not-found and error screens are what this mostly stands in
 *    front of, and both are instant — a full-viewport canvas behind a spinner
 *    that flashes for 80ms is pure cost. It renders in well under the frame the
 *    user would notice.
 *
 * 2. THE SIX BLADES TURN IN 2s, EASE-IN-OUT, AS SPECIFIED. A 2s revolution is
 *    fast enough to read as "active" and slow enough not to strobe. Six blades
 *    rather than the hero's full aperture because at 120px the iris reads as a
 *    spinner unless the blades are visible, and it is the blade count that says
 *    "this is Camerlob" rather than "this is a loading ring".
 *
 * 3. THE THREE DOTS STAGGER BY 300ms AND LOOP. `animation-delay` steps of 300ms
 *    with a 900ms cycle give a travelling pulse — dot, dot, dot, pause — which is
 *    the sequence people read as "typing" or "thinking". Fixed delays rather than
 *    framer keeps the whole thing in CSS, so it costs nothing on the main thread
 *    and the reduced-motion block can collapse it.
 *
 * 4. THE FADE-IN IS 200ms, ONCE, ON THE WHOLE BLOCK. Animating each element
 *    separately would stagger the composition apart; one fade keeps the aperture
 *    and its caption as a single object arriving.
 */

export default function RootLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="loading-fade-in flex min-h-svh flex-col items-center justify-center gap-6"
    >
      <span className="sr-only">Loading</span>

      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="aperture-spin size-[120px] text-aqua-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      >
        {Array.from({ length: 6 }, (_, index) => {
          const start = (index / 6) * Math.PI * 2;
          const end = start + Math.PI / 6;
          const mid = (start + end) / 2;
          const x1 = 50 + 46 * Math.cos(start);
          const y1 = 50 + 46 * Math.sin(start);
          const x2 = 50 + 46 * Math.cos(end);
          const y2 = 50 + 46 * Math.sin(end);
          const x3 = 50 + 15 * Math.cos(mid);
          const y3 = 50 + 15 * Math.sin(mid);
          return (
            <path
              key={index}
              d={`M 50 50 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 46 46 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z L ${x3.toFixed(2)} ${y3.toFixed(2)} Z`}
            />
          );
        })}
      </svg>

      <p
        aria-hidden="true"
        className="flex items-center gap-1 font-mono text-xs uppercase tracking-[0.18em] text-text-tertiary"
      >
        {'// LOADING'}
        <span className="flex items-center">
          <span className="dot-pulse size-1 rounded-full bg-aqua-400" />
          <span className="dot-pulse size-1 rounded-full bg-aqua-400" />
          <span className="dot-pulse size-1 rounded-full bg-aqua-400" />
        </span>
      </p>
    </div>
  );
}
