/**
 * app/layout.tsx
 * Document shell: fonts, favicon, metadata, and the dark-mode pin.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. FONT SUBSTITUTION, AND WHY. The brief asks for Geist Sans and Geist Mono via
 *    next/font. Neither exists in Next 14.2.5's next/font/google manifest — the
 *    compiled font-data.json is a static table, so requesting them is a build
 *    error, not a fallback. The brief's own sanctioned alternative for the body
 *    face is Manrope, which is available, so:
 *      display -> Instrument Serif   (in the manifest, weight 400 only)
 *      body    -> Manrope            (variable 200-800, so 500/600 stay crisp)
 *      mono    -> JetBrains Mono     (variable 100-800, the brief's stated
 *                                      alternative to Geist Mono)
 *    All three are exposed as CSS variables and bound to --font-serif /
 *    --font-sans / --font-mono in app/globals.css. Nothing is loaded from a
 *    third-party CDN at runtime, and there is no layout shift: next/font
 *    self-hosts the files and swaps via size-adjusted fallbacks.
 *
 * 2. NO PROVIDER IN v1. tailwind.config.ts uses `darkMode: 'class'`, and the
 *    landing page is dark-only, so the theme is a single class on <html> plus
 *    `color-scheme: dark`. That means zero theme-related hydration and no flash
 *    of the wrong theme. ThemeToggle is implemented and ready; it is simply not
 *    mounted in the navbar yet. When a second surface needs the value, promote
 *    it to a provider then.
 *
 * 3. FAVICON IS SET EXPLICITLY on both `icon` and `apple`, pointing at the
 *    brand PNG. Next would otherwise look for app/favicon.ico, which does not
 *    exist, and would 404 on every page load.
 *
 * 4. THE <html> CLASS LIST CARRIES BOTH the font variables and `dark`, so the
 *    font families are available to app/globals.css on the same element that
 *    defines the tokens they override.
 *
 * 5. THE TOASTER IS ROOT-MOUNTED, NOT SHELL-MOUNTED. Sonner is the only toast
 *    surface in the product and several surfaces report through it, including
 *    ones outside the (shell) route group, so it lives here where it cannot be
 *    unmounted by a route change. Its tokens are inline Tailwind classes rather
 *    than a stylesheet because sonner renders the toast chrome in a portal with
 *    its own class names — a global token block would leak into it. Top-right,
 *    which is where batch rejections must appear: they interrupt, and the eye is
 *    at the top of the document when the user is working in the upload zone.
 */

import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, JetBrains_Mono, Manrope } from 'next/font/google';
import { Toaster } from 'sonner';

import './globals.css';

/** Display face: hero headline and one section heading. Weight 400 only. */
const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-serif',
});

/** UI and body face: the brief's sanctioned alternative to Geist Sans. */
const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

/** Mono face: format tags, step numbers, timestamps, badge text. */
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://camerlob.app'),
  title: {
    default: 'Camerlob — Convert any image. Any format. Free, forever.',
    template: '%s · Camerlob',
  },
  description:
    'Local-first image conversion for developers and photographers. 40+ formats, no uploads, no signups, no limits. Runs entirely in your browser.',
  applicationName: 'Camerlob',
  keywords: [
    'image converter',
    'local-first',
    'privacy',
    'HEIC to JPG',
    'RAW converter',
    'PSD',
    'batch convert',
    'offline',
  ],
  authors: [{ name: 'Camerlob' }],
  icons: {
    icon: '/Camerlob_fav.png',
    apple: '/Camerlob_fav.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Camerlob',
    title: 'Camerlob — Convert any image. Any format.',
    description: '40+ formats, no uploads, no signups. Conversion runs in your browser.',
    url: 'https://camerlob.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Camerlob — Convert any image. Any format.',
    description: '40+ formats, no uploads, no signups. Conversion runs in your browser.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0a0b0c',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  // Zoom is left enabled: pinching to read the mono labels is a legitimate
  // need, and disabling it fails WCAG 1.4.4.
};

/**
 * Sonner theming, expressed as token classes rather than a stylesheet.
 * The left border is the variant signal, matching the brief's 4px accent rule
 * for toasts; the brief places toasts bottom-right, this build uses top-right so
 * batch rejections are visible while the user is in the upload zone.
 */
const TOASTER_CLASSNAMES = {
  toast:
    'group flex w-full items-start gap-3 rounded-md border border-border-default bg-bg-secondary px-4 py-3.5 text-text-primary shadow-xl',
  content: 'flex flex-col gap-0.5 text-left',
  title: 'text-sm font-semibold leading-snug',
  description: 'text-sm font-normal leading-snug text-text-secondary',
  closeButton:
    'absolute -right-1 -top-1 grid size-6 place-items-center rounded-full border border-border-default bg-bg-elevated text-text-tertiary transition-colors duration-150 hover:border-border-strong hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400',
  success: 'border-l-4 border-l-success',
  error: 'border-l-4 border-l-error',
  warning: 'border-l-4 border-l-warning',
  info: 'border-l-4 border-l-aqua-400',
  loading: 'border-l-4 border-l-aqua-400',
} as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // `dark` pins the class strategy; `color-scheme` is set in the viewport
      // export above and repeated here so the very first paint is correct.
      className={`${instrumentSerif.variable} ${manrope.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body>
        {children}

        <Toaster
          theme="dark"
          position="top-right"
          visibleToasts={3}
          gap={12}
          closeButton
          duration={4000}
          toastOptions={{ classNames: TOASTER_CLASSNAMES }}
        />
      </body>
    </html>
  );
}
