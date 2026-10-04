/**
 * app/(shell)/convert/loading.tsx + app/(shell)/result/loading.tsx
 * Route-level Suspense fallbacks.
 *
 * WHY THERE ARE TWO, AND WHY THEY DIFFER
 * ------------------------------------------------------------------------
 * `app/loading.tsx` is the fallback for the root segment, which is where the
 * not-found and error screens live — those are instant, so a full-viewport
 * spinner would flash on a route that has nothing to load. Each shell route gets
 * its own fallback instead, sized to the content that is coming: the converter is
 * two columns of format grids, the result page is a card grid. Matching the shape
 * of the fallback to the shape of the page is what stops a navigation from feeling
 * like a hard cut.
 *
 * DESIGN DECISIONS
 * ------------------------------------------------------------------------
 * 1. THE APERTURE TURNS AT DIFFERENT SPEEDS PER ROUTE. 2s on the root loading
 *    screen, 2.6s here. Identical timings on every screen make the two feel like
 *    the same component pasted twice, which is exactly the generic feeling this
 *    product is avoiding.
 *
 * 2. SKELETON BARS, NOT SPINERS, FOR THE BODY. The iris says "working". The bars
 *    say "working, and here is the shape of what is coming", which stops the page
 *    from jumping when the content lands.
 *
 * 3. THE BARS SHIMMER WITH A TRANSLATION, NOT A WIDTH CHANGE, so the shimmer runs
 *    on the compositor. Under reduced motion the global stylesheet collapses the
 *    animation, leaving a static block at 40% opacity — still clearly a
 *    placeholder, no longer moving.
 *
 * 4. NO NAVBAR, NO FOOTER, NO AURORA. The shell is suspended with the page, so
 *    reproducing it here would flash chrome in and back out. This file renders
 *    only the region that is actually loading.
 */

export default function ConvertLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="container-page measure-wide pb-16 pt-28 md:pt-32"
    >
      <span className="sr-only">Loading the converter</span>

      <div className="flex items-center gap-4">
        <LoadingAperture />
        <div className="flex flex-1 flex-col gap-2">
          <span className="shimmer h-3 w-24 rounded-sm" />
          <span className="shimmer h-8 w-64 max-w-full rounded-sm" />
        </div>
      </div>

      <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-4 lg:gap-8">
        {/* Formats column */}
        <div className="flex flex-col gap-4">
          <span className="shimmer h-7 w-28 rounded-sm" />
          <span className="shimmer h-11 w-full rounded-md" />
          <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
            {Array.from({ length: 12 }, (_, index) => (
              <span key={index} className="shimmer h-14 rounded-md md:h-16" />
            ))}
          </div>
        </div>

        {/* Upload column */}
        <div className="flex flex-col gap-4">
          <span className="shimmer h-[200px] w-full rounded-xl md:h-[240px]" />
          <span className="shimmer h-16 w-full rounded-md" />
          <span className="shimmer h-16 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Six aqua blades, one revolution every 2.6s on the ease-in-out curve. */
function LoadingAperture() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className="aperture-spin-slow size-14 shrink-0 text-aqua-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="50" cy="50" r="42" opacity="0.35" />
      {Array.from({ length: 6 }, (_, index) => {
        const start = (index / 6) * Math.PI * 2;
        const end = start + Math.PI / 6;
        const mid = (start + end) / 2;
        const x1 = 50 + 42 * Math.cos(start);
        const y1 = 50 + 42 * Math.sin(start);
        const x2 = 50 + 42 * Math.cos(end);
        const y2 = 50 + 42 * Math.sin(end);
        const x3 = 50 + 14 * Math.cos(mid);
        const y3 = 50 + 14 * Math.sin(mid);
        return (
          <path
            key={index}
            d={`M 50 50 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 42 42 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z L ${x3.toFixed(2)} ${y3.toFixed(2)} Z`}
          />
        );
      })}
    </svg>
  );
}
