import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Tailwind CSS configuration for Camerlob.
 *
 * Every colour resolves to a CSS custom property declared in `styles/tokens.css`.
 * Components must never hardcode a hex value: if a colour is missing here, add
 * the token first, then map it here.
 *
 * Alpha modifiers (`bg-aqua-500/10`) work because each token also publishes a
 * space-separated RGB channel triplet consumed via `rgb(var(--x-ch) / <alpha-value>)`.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', md: '1.5rem', lg: '2.5rem' },
      screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
    },
    extend: {
      colors: {
        // ---- Black scale (UI-UX-BRIEF 16) ----
        'black-0': 'rgb(var(--color-black-0-ch) / <alpha-value>)',
        'black-50': 'rgb(var(--color-black-50-ch) / <alpha-value>)',
        'black-100': 'rgb(var(--color-black-100-ch) / <alpha-value>)',
        'black-200': 'rgb(var(--color-black-200-ch) / <alpha-value>)',
        'black-300': 'rgb(var(--color-black-300-ch) / <alpha-value>)',
        'black-400': 'rgb(var(--color-black-400-ch) / <alpha-value>)',
        'black-500': 'rgb(var(--color-black-500-ch) / <alpha-value>)',
        'black-600': 'rgb(var(--color-black-600-ch) / <alpha-value>)',
        'black-700': 'rgb(var(--color-black-700-ch) / <alpha-value>)',
        'black-800': 'rgb(var(--color-black-800-ch) / <alpha-value>)',
        'black-900': 'rgb(var(--color-black-900-ch) / <alpha-value>)',
        'black-950': 'rgb(var(--color-black-950-ch) / <alpha-value>)',

        // ---- Aqua scale (UI-UX-BRIEF 16) ----
        'aqua-50': 'rgb(var(--color-aqua-50-ch) / <alpha-value>)',
        'aqua-100': 'rgb(var(--color-aqua-100-ch) / <alpha-value>)',
        'aqua-200': 'rgb(var(--color-aqua-200-ch) / <alpha-value>)',
        'aqua-300': 'rgb(var(--color-aqua-300-ch) / <alpha-value>)',
        'aqua-400': 'rgb(var(--color-aqua-400-ch) / <alpha-value>)',
        'aqua-500': 'rgb(var(--color-aqua-500-ch) / <alpha-value>)',
        'aqua-600': 'rgb(var(--color-aqua-600-ch) / <alpha-value>)',
        'aqua-700': 'rgb(var(--color-aqua-700-ch) / <alpha-value>)',
        'aqua-800': 'rgb(var(--color-aqua-800-ch) / <alpha-value>)',
        'aqua-900': 'rgb(var(--color-aqua-900-ch) / <alpha-value>)',

        // ---- Semantic ----
        success: 'rgb(var(--color-success-ch) / <alpha-value>)',
        'success-hover': 'rgb(var(--color-success-hover-ch) / <alpha-value>)',
        warning: 'rgb(var(--color-warning-ch) / <alpha-value>)',
        'warning-hover': 'rgb(var(--color-warning-hover-ch) / <alpha-value>)',
        error: 'rgb(var(--color-error-ch) / <alpha-value>)',
        'error-hover': 'rgb(var(--color-error-hover-ch) / <alpha-value>)',
        info: 'rgb(var(--color-info-ch) / <alpha-value>)',
        'info-hover': 'rgb(var(--color-info-hover-ch) / <alpha-value>)',
        cyan: 'rgb(var(--color-cyan-ch) / <alpha-value>)',
        'cyan-hover': 'rgb(var(--color-cyan-hover-ch) / <alpha-value>)',

        // ---- Surfaces ----
        'bg-primary': 'rgb(var(--color-bg-primary-ch) / <alpha-value>)',
        'bg-secondary': 'rgb(var(--color-bg-secondary-ch) / <alpha-value>)',
        'bg-tertiary': 'rgb(var(--color-bg-tertiary-ch) / <alpha-value>)',
        'bg-elevated': 'rgb(var(--color-bg-elevated-ch) / <alpha-value>)',
        'bg-overlay': 'rgb(var(--color-bg-overlay-ch) / <alpha-value>)',

        // ---- Borders ----
        'border-subtle': 'rgb(var(--color-border-subtle-ch) / <alpha-value>)',
        'border-default': 'rgb(var(--color-border-default-ch) / <alpha-value>)',
        'border-muted': 'rgb(var(--color-border-muted-ch) / <alpha-value>)',
        'border-strong': 'rgb(var(--color-border-strong-ch) / <alpha-value>)',

        // ---- Text ----
        'text-primary': 'rgb(var(--color-text-primary-ch) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary-ch) / <alpha-value>)',
        'text-tertiary': 'rgb(var(--color-text-tertiary-ch) / <alpha-value>)',
        'text-disabled': 'rgb(var(--color-text-disabled-ch) / <alpha-value>)',
        'text-on-accent': 'rgb(var(--color-text-on-accent-ch) / <alpha-value>)',

        // ---- Accents ----
        'aqua-primary': 'rgb(var(--color-aqua-primary-ch) / <alpha-value>)',
        'aqua-hover': 'rgb(var(--color-aqua-hover-ch) / <alpha-value>)',
        'aqua-active': 'rgb(var(--color-aqua-active-ch) / <alpha-value>)',
        'aqua-muted': 'rgb(var(--color-aqua-muted-ch) / <alpha-value>)',
      },
      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        DEFAULT: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
        // Display face for the hero and one section heading.
        // Wired to the next/font variable set in app/globals.css.
        serif: 'var(--font-serif)',
      },
      fontSize: {
        display: [
          'var(--text-display)',
          { lineHeight: 'var(--lh-display)', letterSpacing: 'var(--ls-display)' },
        ],
        h1: ['var(--text-h1)', { lineHeight: 'var(--lh-h1)', letterSpacing: 'var(--ls-h1)' }],
        h2: ['var(--text-h2)', { lineHeight: 'var(--lh-h2)', letterSpacing: 'var(--ls-h2)' }],
        h3: ['var(--text-h3)', { lineHeight: 'var(--lh-h3)', letterSpacing: 'var(--ls-h3)' }],
        h4: ['var(--text-h4)', { lineHeight: 'var(--lh-h4)', letterSpacing: 'var(--ls-h4)' }],
        'body-lg': ['var(--text-body-lg)', { lineHeight: 'var(--lh-body-lg)' }],
        body: ['var(--text-body)', { lineHeight: 'var(--lh-body)' }],
        'body-sm': ['var(--text-body-sm)', { lineHeight: 'var(--lh-body-sm)' }],
        caption: [
          'var(--text-caption)',
          { lineHeight: 'var(--lh-caption)', letterSpacing: 'var(--ls-caption)' },
        ],
        button: [
          'var(--text-button)',
          { lineHeight: 'var(--lh-button)', letterSpacing: 'var(--ls-button)' },
        ],
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        'glow-sm': 'var(--glow-sm)',
        'glow-md': 'var(--glow-md)',
        'glow-lg': 'var(--glow-lg)',
        inset: 'var(--shadow-inset)',
        'card-hover': 'var(--shadow-card-hover)',
        focus: 'var(--focus-ring)',
      },
      backgroundImage: {
        'gradient-aqua': 'var(--gradient-aqua)',
        'gradient-aqua-hover': 'var(--gradient-aqua-hover)',
        'gradient-aqua-glow': 'var(--gradient-aqua-glow)',
        'gradient-card-hover': 'var(--gradient-card-hover)',
        'gradient-progress': 'var(--gradient-progress)',
      },
      transitionTimingFunction: {
        'camerlob-out': 'var(--ease-out)',
        'camerlob-in': 'var(--ease-in)',
        'camerlob-in-out': 'var(--ease-in-out)',
        spring: 'var(--spring)',
      },
      transitionDuration: {
        instant: 'var(--duration-instant)',
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
        slower: 'var(--duration-slower)',
      },
      spacing: {
        18: 'var(--space-18)',
        22: 'var(--space-22)',
        30: 'var(--space-30)',
      },
      maxWidth: {
        toast: 'var(--toast-width)',
        container: 'var(--container-xl)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        // Hero iris. Declared in CSS rather than Framer Motion because the hover
        // interaction only changes `animation-duration` on an already-running
        // animation, which retimes it in place. A JS-driven rotation would be
        // torn down and rebuilt on every hover and the blades would snap back
        // to 0deg. Both entries name the same keyframe set on purpose.
        'aperture-rotate': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s var(--ease-out)',
        'accordion-up': 'accordion-up 0.2s var(--ease-out)',
        'aperture-rotate': 'aperture-rotate 60s linear infinite',
        // 60s -> 45s on hover. Same animation name, so the rotation never
        // restarts; only its period shortens.
        'aperture-rotate-fast': 'aperture-rotate 45s linear infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
