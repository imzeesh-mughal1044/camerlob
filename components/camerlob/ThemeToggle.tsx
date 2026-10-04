/**
 * components/camerlob/ThemeToggle.tsx
 * Wired for a future release, deliberately not rendered in v1.
 *
 * DESIGN DECISIONS
 * ------------------------------------------------------------------------
 * 1. NO PROVIDER IS NEEDED YET. tailwind.config.ts uses `darkMode: 'class'`, so
 *    the entire theme switch is one class on <html>. app/layout.tsx sets it
 *    server-side and pins `color-scheme: dark`, which means the v1 landing page
 *    is dark-only with no flash of the wrong theme and no React context to
 *    hydrate. When a second surface needs the value, promote this to a provider
 *    at that point rather than shipping a context nobody reads.
 *
 * 2. STATE IS READ FROM THE DOM, NOT FROM REACT STATE. On mount it inspects the
 *    class list and localStorage, so the button can never disagree with the
 *    document. Every mutation writes both.
 *
 * 3. IT IS EXPORTED BUT UNMOUNTED. Navbar deliberately does not import it, per
 *    the brief. It compiles, is type-checked, and is one line away in the navbar
 *    when the toggle is switched on — which is why it is kept honest rather than
 *    commented out.
 */

'use client';

import { Moon, Sun } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

const STORAGE_KEY = 'camerlob-theme';

export interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [dark, setDark] = React.useState(true);

  React.useEffect(() => {
    const root = document.documentElement;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const prefersDark =
      stored === 'dark' ||
      (stored === null && !window.matchMedia('(prefers-color-scheme: light)').matches);
    root.classList.toggle('dark', prefersDark);
    setDark(prefersDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    window.localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={dark}
      className={cn(
        'grid size-11 place-items-center rounded-md',
        'text-text-secondary transition-colors duration-200 ease-camerlob-out',
        'hover:bg-aqua-500/10 hover:text-aqua-400',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400',
        className
      )}
    >
      {dark ? (
        <Sun aria-hidden="true" className="size-5" />
      ) : (
        <Moon aria-hidden="true" className="size-5" />
      )}
    </button>
  );
}
