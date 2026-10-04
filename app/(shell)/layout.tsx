/**
 * app/(shell)/layout.tsx
 * The chrome every product page shares: aurora, navbar, main landmark, footer.
 *
 * WHY A ROUTE GROUP
 * ------------------------------------------------------------------------
 * `(shell)` adds no path segment, so `/`, `/convert` and `/result` all keep the
 * URLs they had while gaining one chrome implementation. The pages that must NOT
 * have chrome — not-found, error, and the standalone loading screen — simply live
 * outside the group at `app/`, and the root layout stays chrome-free.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. IT IS A CLIENT COMPONENT. MotionConfig and PageTransition both need
 *    `usePathname`, and a server layout cannot call either. The `children` it
 *    receives are still server components: the client boundary is this file, not
 *    the page tree, so nothing about the pages' rendering moves to the client.
 *
 * 2. CHROME IS RENDERED EXACTLY ONCE, HERE. The landing page used to mount the
 *    navbar, footer, aurora, skip link and <main> landmark itself. Those five
 *    moved up into this file when /convert and /result joined the group; the
 *    landing page now renders only its seven sections. Duplicating them per page
 *    would have produced two navbars on the first route that forgot to be edited.
 *
 * 3. THE AURORA IS ABOVE THE BACKGROUND BUT BELOW THE CONTENT, NEVER BEHIND IT.
 *    AnimatedBackground owns a `fixed z-0` wrapper; this file's `relative z-10`
 *    column holds everything else. No negative z-index anywhere, so the canvas can
 *    never be painted underneath the root background colour.
 *
 * 4. `<main>` IS `flex-1` INSIDE A MIN-H-SVH COLUMN. The landing hero is
 *    `min-h-svh`, which already fills the viewport, so flex-1 changes nothing
 *    there. On the shorter /convert and /result pages it is what pushes the footer
 *    to the bottom of the document instead of leaving it stranded mid-screen.
 *
 * 5. THE SKIP LINK TARGETS #main, WHICH IS HERE. It is rendered here rather than
 *    per page for the same reason the landmark is: one skip link, one target, no
 *    chance of a page forgetting to give the link something to jump to.
 */

'use client';

import { MotionConfig } from 'framer-motion';
import * as React from 'react';

import { AnimatedBackground } from '@/components/camerlob/AnimatedBackground';
import { Footer } from '@/components/camerlob/Footer';
import { Navbar } from '@/components/camerlob/Navbar';
import { PageTransition } from '@/components/camerlob/PageTransition';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <AnimatedBackground />

      <div className="relative z-10 flex min-h-svh flex-col">
        <Navbar />

        <main id="main" className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>

        <Footer />
      </div>
    </MotionConfig>
  );
}
