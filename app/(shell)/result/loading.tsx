/**
 * app/(shell)/result/loading.tsx
 * Route-level Suspense fallback for /result.
 *
 * WHY IT DIFFERS FROM THE CONVERTER'S
 * ------------------------------------------------------------------------
 * The result page is a card grid, so its fallback is a card grid: three columns
 * of 4:3 frames with two text bars under each. A fallback shaped like the
 * converter's two-column split would be wrong the moment it appeared, and the
 * mismatch is more jarring than the wait itself.
 *
 * DESIGN DECISIONS
 * ------------------------------------------------------------------------
 * 1. THE SUMMARY BLOCK IS PRESENT BUT EMPTY-SHAPED. Four stat tiles are
 *    shimmered, so the eye lands where the numbers will be instead of scanning
 *    for them after the swap.
 *
 * 2. NO NAVBAR, NO FOOTER, NO AURORA — same reasoning as the converter's
 *    fallback: the shell is suspended with the page.
 *
 * 3. THE APERTURE IS SLOWER HERE (3.2s) THAN ON THE CONVERTER (2.6s). The result
 *    page is a destination, not a workspace, and a slower rotation reads as
 *    "settling" rather than "working".
 */

export default function ResultLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="container-page measure-wide pb-16 pt-28 md:pt-32"
    >
      <span className="sr-only">Loading your results</span>

      <div className="flex items-center gap-4">
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          className="aperture-spin-slower size-14 shrink-0 text-aqua-400"
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
        <div className="flex flex-1 flex-col gap-2">
          <span className="shimmer h-3 w-20 rounded-sm" />
          <span className="shimmer h-8 w-52 max-w-full rounded-sm" />
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className="shimmer h-[68px] rounded-lg" />
        ))}
      </div>

      {/* Card grid: 1 / 2 / 3 columns, matching the real page exactly. */}
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="flex flex-col overflow-hidden rounded-xl border border-border-subtle"
          >
            <span className="shimmer aspect-[4/3] w-full" />
            <span className="flex flex-col gap-2 p-4">
              <span className="shimmer h-3 w-4/5 rounded-sm" />
              <span className="shimmer h-3 w-1/2 rounded-sm" />
              <span className="shimmer mt-2 h-9 w-full rounded-md" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
