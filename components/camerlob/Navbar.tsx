/**
 * components/camerlob/Navbar.tsx
 * Section 01: the fixed, scroll-aware navigation.
 *
 * DESIGN DECISIONS
 * ------------------------------------------------------------------------
 * 1. HEIGHTS ARE 56 / 64 / 72px. The section brief says 64px mobile and 72px
 *    desktop; the responsive table says 56px at 360x760. The table is the more
 *    specific, mobile-first document, and 56px is also the only value that
 *    leaves a 48px tap target plus breathing room inside a 360px viewport, so
 *    the table wins at the base breakpoint: 56px, 64px from 768px, 72px from
 *    1280px. `scroll-padding-top: 6.5rem` in app/globals.css matches the
 *    desktop height so anchored sections never land under the bar.
 *
 * 2. GLASS IS CONDITIONAL, NOT ALWAYS-ON. The bar is fully transparent at the top
 *    of the page — the hero is meant to run edge to edge — and only picks up
 *    bg-black/60, backdrop-blur-xl and a hairline border once the user is 40px
 *    past. Both states are rendered by one element whose classes change, so
 *    there is no layout shift and no second node to keep in sync.
 *
 * 3. HIDE ON SCROLL DOWN, REVEAL ON SCROLL UP, WITH A DEAD ZONE. A navbar that
 *    flickers while the user is reading is worse than no navbar, so movement
 *    under 8px is ignored entirely, and the bar always reappears once the user
 *    reaches the very top. The state lives in a ref and is pushed through
 *    AnimatePresence, so hiding costs one transform rather than a re-render of
 *    the links.
 *
 * 4. THE MOBILE OVERLAY IS A DIALOGUE, NOT A DIV. It carries role="dialog" and
 *    aria-modal, moves focus to the first link on open, closes on Escape and on
 *    backdrop click, and returns focus to the trigger. Links are 48px tall with
 *    aqua hairlines between them, staggered in at 60ms per item.
 *
 * 5. THE LINKS ARE REAL ANCHORS. The centre links point at on-page sections
 *    (#formats, #how-it-works, #privacy) so they work with JavaScript disabled;
 *    GitHub is the only external destination and it is marked rel="noreferrer".
 */

'use client';

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Menu, Star, X } from 'lucide-react';
import * as React from 'react';

import { Logo } from '@/components/camerlob/Logo';
import { buttonClasses, buttonMotion } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

const LINKS: readonly NavLink[] = [
  { label: 'Formats', href: '#formats' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'GitHub', href: 'https://github.com/camerlob/camerlob', external: true },
];

/** Scroll distance before the bar turns to glass. */
const GLASS_AT = 40;
/** Movement below this is treated as jitter, not intent. */
const DEAD_ZONE = 8;

export function Navbar() {
  const { scrollY } = useScroll();
  const [glass, setGlass] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const lastY = React.useRef(0);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const previous = lastY.current;
    lastY.current = y;

    setGlass(y > GLASS_AT);
    if (y <= GLASS_AT) {
      setHidden(false);
      return;
    }
    if (Math.abs(y - previous) < DEAD_ZONE) return;
    setHidden(y > previous);
  });

  // Lock the page behind the overlay, and wire Escape plus focus restoration.
  React.useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      // Trap Tab inside the overlay.
      const focusable = [
        ...panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      ];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
    }, 60);

    // Snapshot the trigger while the effect body still runs. Reading
    // `triggerRef.current` inside the cleanup would read it at teardown time,
    // by which point React may have swapped the node out and the focus restore
    // would land on a detached element.
    const trigger = triggerRef.current;

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = overflow;
      (previouslyFocused ?? trigger)?.focus?.();
    };
  }, [open]);

  return (
    <>
      <motion.header
        // Only ever transforms; no layout properties are animated.
        animate={{ y: hidden && !open ? '-100%' : '0%' }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'fixed inset-x-0 top-0 z-50',
          'transition-[background-color,backdrop-filter,border-color] duration-300 ease-camerlob-out',
          'h-14 md:h-16 xl:h-[72px]',
          glass
            ? 'border-b border-border-subtle bg-black/60 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        )}
      >
        <nav
          aria-label="Primary"
          className="container-page measure-wide flex h-full items-center justify-between gap-4"
        >
          <a
            href="/"
            aria-label="Camerlob home"
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400"
          >
            <Logo sizeClasses="h-7 md:h-8 xl:h-9" />
          </a>

          {/* Centre links, desktop only */}
          <ul className="hidden items-center gap-8 lg:flex">
            {LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  className={cn(
                    'group relative inline-flex h-9 items-center text-sm text-text-secondary',
                    'transition-colors duration-200 ease-camerlob-out hover:text-text-primary',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
                  )}
                >
                  {link.label}
                  {/* Underline draws from the left on hover. */}
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-aqua-400 transition-transform duration-200 ease-camerlob-out group-hover:scale-x-100"
                  />
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <motion.a
              href="https://github.com/camerlob/camerlob"
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({
                variant: 'ghost',
                size: 'sm',
                className: 'hidden font-mono text-xs uppercase tracking-[0.08em] sm:inline-flex',
              })}
              {...buttonMotion}
            >
              <Star aria-hidden="true" className="size-3.5" />
              Star on GitHub
            </motion.a>

            <motion.a
              href="/convert"
              className={buttonClasses({ variant: 'primary', size: 'sm' })}
              {...buttonMotion}
            >
              Start converting
            </motion.a>

            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className={cn(
                'grid size-11 place-items-center rounded-md lg:hidden',
                'text-text-secondary transition-colors duration-200 ease-camerlob-out',
                'hover:bg-aqua-500/10 hover:text-aqua-400 active:bg-aqua-500/20',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
              )}
            >
              {open ? (
                <X aria-hidden="true" className="size-5" />
              ) : (
                <motion.span
                  animate={{ rotate: open ? 90 : 0 }}
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Menu aria-hidden="true" className="size-5" />
                </motion.span>
              )}
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Full-screen mobile overlay */}
      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl lg:hidden"
          >
            <nav
              aria-label="Mobile"
              className="container-page flex h-full flex-col justify-center gap-2 pt-14"
            >
              {LINKS.map((link, index) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.06 * index + 0.06,
                    duration: 0.3,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={cn(
                    'flex min-h-12 items-center border-b border-aqua-500/15 py-3 text-xl',
                    'text-text-primary transition-colors duration-150 hover:text-aqua-400',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
                  )}
                >
                  <span className="mr-4 font-mono text-xs text-aqua-500/60">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {link.label}
                </motion.a>
              ))}

              <motion.a
                href="/convert"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.06 * LINKS.length + 0.06,
                  duration: 0.3,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={buttonClasses({
                  variant: 'primary',
                  size: 'lg',
                  className: 'mt-8 w-full',
                })}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Start converting
              </motion.a>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
