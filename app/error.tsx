/**
 * app/error.tsx
 * The root-segment error boundary. This is a CLIENT component — it owns state and
 * an effect, so it cannot live in a server component.
 *
 * WHY IT LIVES OUTSIDE (shell)
 * ------------------------------------------------------------------------
 * The shell wraps `children` in `AnimatePresence`, and a server render error
 * unwinds the React tree on the server. A boundary that lives inside the segment
 * it is meant to catch is not always mounted by the time the error is thrown, so
 * the error would escalate past the app entirely and render Next's stock "digest"
 * screen. At the root it is always mounted.
 *
 * WHY IT REDRAWS THE AURORA ITSELF
 * ------------------------------------------------------------------------
 * Because the shell unmounted, `AnimatedBackground` is gone, and an error page
 * without the product's defining background looks like a different site. The
 * alternative — restructuring the shell so chrome and page are separate segments —
 * is a routing change well beyond this screen, so the canvas is re-instantiated
 * here, damped the same way as the 404. This duplication is deliberate and
 * temporary; it is noted in app/not-found.tsx as well.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE DIGEST IS SHOWN. Next.js hands the boundary a `digest` string precisely
 *    so a user can quote it in a bug report, and this product has no telemetry.
 *    Hiding it would make the most common support question unanswerable. It is
 *    presented as a monospace token, not as an error message, so it reads as an
 *    identifier rather than as a failure.
 *
 * 2. "TRY AGAIN" IS PRIMARY AND `reset()` IS ITS ONLY ACTION. Next's documented
 *    recovery path for a client-side render failure is `reset()`, which re-renders
 *    the segment without a full reload. "Back home" is secondary and uses
 *    `window.location.assign`, because a client-side push from a broken segment
 *    can land in the same broken tree; a hard navigation cannot.
 *
 * 3. THE COPIES ARE DISTINCT BECAUSE THE FIXES ARE DISTINCT. The 404 tells the
 *    user where to go; the error tells them what to try. "This format doesn't
 *    exist" would be a lie here — the format exists, something broke.
 *
 * 4. THE APERTURE IS DRAINED, NOT SPUN. Amber, 3s, and it sits still enough to
 *    read as "something is wrong" rather than "something is loading". Spinning
 *    aqua on an error page is the visual language of a fetch that might still
 *    succeed; this one is not going to.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import * as React from 'react';

import { AnimatedBackground } from '@/components/camerlob/AnimatedBackground';
import { buttonClasses, buttonMotion } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

const OUT = [0.16, 1, 0.3, 1] as const;

export interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const reduceMotion = useReducedMotion();
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  // Log the real error for local development only. The brief forbids console
  // noise in the console the user inspects; this boundary is exactly the place
  // where a swallowed error would be undebuggable, so the trade is made
  // explicitly and only when the bundle is a dev build.
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[camerlob] render error', error);
    }
  }, [error]);

  const goHome = () => {
    // A client-side push from a crashed segment can re-enter the crashed tree, so
    // recovery is a hard navigation. See decision 2.
    window.location.assign('/');
  };

  return (
    <div className="relative min-h-svh">
      <div aria-hidden="true" className="[&_canvas]:saturate-[0.4]">
        <AnimatedBackground />
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-black/65" />

      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center px-6 py-20 text-center">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.45, ease: OUT }}
          className="flex w-full max-w-[36rem] flex-col items-center"
        >
          <p className="label-mono">{'// Something broke'}</p>

          {/* Decision 4: amber, drained, no celebratory motion. */}
          <div className="mt-6 flex items-center gap-3">
            <AlertTriangle aria-hidden="true" className="size-7 text-error" strokeWidth={1.5} />
            <h1 className="font-serif text-[2.25rem] leading-[1.05] tracking-[-0.02em] text-text-primary sm:text-[3rem]">
              We hit a snag.
            </h1>
          </div>

          <p className="measure-prose mt-5 text-base text-text-secondary">
            Something went wrong on our end, not yours. Your files never left this machine. Try
            again — if it keeps happening, the details below will help.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className={cn(buttonClasses({ variant: 'primary', size: 'md' }), 'gap-2')}
            >
              <motion.span className="inline-flex items-center gap-2" {...buttonMotion}>
                <RotateCcw aria-hidden="true" className="size-4" strokeWidth={1.75} />
                Try again
              </motion.span>
            </button>

            <button
              type="button"
              onClick={goHome}
              className={cn(buttonClasses({ variant: 'ghost', size: 'md' }), 'gap-2')}
            >
              <motion.span className="inline-flex items-center gap-2" {...buttonMotion}>
                <Home aria-hidden="true" className="size-4" strokeWidth={1.75} />
                Back home
              </motion.span>
            </button>
          </div>

          {/* Decision 1: the digest is the only diagnostic this product can offer. */}
          {error.digest ? (
            <div className="mt-10 w-full">
              <button
                type="button"
                onClick={() => setDetailsOpen((open) => !open)}
                aria-expanded={detailsOpen}
                aria-controls="error-details"
                className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400 enabled:hover:text-text-secondary"
              >
                {detailsOpen ? 'Hide' : 'Show'} details
              </button>

              {detailsOpen ? (
                <dl
                  id="error-details"
                  className="mt-4 flex flex-col gap-2 rounded-lg border border-border-subtle bg-black/40 p-4 text-left"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                    <dt className="w-24 shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
                      Reference
                    </dt>
                    <dd className="break-all font-mono text-xs text-text-secondary">
                      {error.digest}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                    <dt className="w-24 shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
                      Message
                    </dt>
                    <dd className="break-words font-mono text-xs text-text-secondary">
                      {error.message || 'An unknown error occurred.'}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
