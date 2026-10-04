/**
 * components/ui/button.tsx
 * The one shadcn primitive the landing page needs.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. CHOREOGRAPHY FOLLOWS THE BRIEF EXACTLY. Rest / hover / active are
 *    150ms on cubic-bezier(0.16, 1, 0.3, 1), which is precisely --ease-out and
 *    --duration-fast, so the transition curve is token-derived, not invented.
 *    Scale is driven by framer-motion (whileHover 1.02, whileTap 0.98) so it
 *    runs on the compositor; the glow and inner highlight are CSS transitions
 *    on box-shadow.
 *
 * 2. COLOURS COME FROM TOKENS. Backgrounds and text use gradient-aqua /
 *    text-on-accent / aqua-*; no hex literal appears in this file. The box-shadow
 *    values are the only literals, because the brief specifies their rgba
 *    channel-for-channel (0 8px 24px -> 0 12px 32px, inset 0 2px 4px).
 *
 * 3. FOCUS USES outline, NOT box-shadow. styles/globals.css puts a box-shadow
 *    ring on :focus-visible, which would be silently overridden by this
 *    component's own shadow utilities. `outline` is a separate property, so the
 *    2px aqua ring at 2px offset survives the hover glow instead of fighting it.
 *
 * 4. DISABLED BUTTONS DO NOT ANIMATE. Browsers do not dispatch pointer events on
 *    a disabled button, so whileHover/whileTap simply never fire; the
 *    `disabled:` variants then supply the 40% opacity and the not-allowed
 *    cursor. `pointer-events-none` is deliberately NOT used, because it would
 *    suppress the not-allowed cursor.
 *
 * 5. LOADING LOCKS THE WIDTH. The label stays in the DOM as an invisible sizer
 *    so the button cannot resize when the text is swapped for the spinner.
 */

'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

/** The shared press choreography. Exported so links can reuse it verbatim. */
export const buttonMotion = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] as const },
};

export const buttonVariants = cva(
  [
    'relative inline-flex select-none items-center justify-center gap-2 overflow-hidden',
    'font-semibold leading-none whitespace-nowrap',
    'transition-[box-shadow,background-color,border-color,color] duration-150 ease-camerlob-out',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400',
    'disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-40',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-gradient-aqua text-text-on-accent',
          // Rest: 0 8px 24px rgba(0,229,255,.25) + a 1px inner top highlight.
          'shadow-[0_8px_24px_rgba(0,229,255,0.25),inset_0_1px_0_0_rgba(255,255,255,0.25)]',
          'enabled:hover:bg-gradient-aqua-hover enabled:hover:shadow-[0_12px_32px_rgba(0,229,255,0.45),inset_0_1px_0_0_rgba(255,255,255,0.25)]',
          'enabled:active:shadow-inset',
        ],
        ghost: [
          'border border-aqua-500/40 bg-transparent text-aqua-400',
          'enabled:hover:border-aqua-500/70 enabled:hover:bg-aqua-500/10 enabled:hover:text-aqua-300',
          'enabled:active:bg-aqua-500/15',
        ],
        text: ['bg-transparent text-text-secondary', 'enabled:hover:text-aqua-400'],
        icon: [
          'bg-transparent text-text-secondary',
          'enabled:hover:bg-aqua-500/10 enabled:hover:text-aqua-400',
          'enabled:active:bg-aqua-500/20',
        ],
      },
      size: {
        sm: 'h-9 rounded-md px-3 text-sm',
        md: 'h-11 rounded-md px-5 text-button',
        lg: 'h-12 rounded-lg px-6 text-button',
        cta: 'h-14 rounded-lg px-7 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    VariantProps<typeof buttonVariants> {
  /** Declared explicitly because the motion base type's `children` is omitted. */
  children?: React.ReactNode;
  /** Swaps the label for a spinner without changing the button's width. */
  loading?: boolean;
  /** Announced while `loading` is true. */
  loadingLabel?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    loading = false,
    loadingLabel = 'Working',
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...buttonMotion}
      {...props}
    >
      {/* Width lock: the real label stays in flow but invisible. */}
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>
        {children}
      </span>
      {loading ? (
        <span className="absolute inset-0 grid place-items-center">
          <Loader2 aria-hidden="true" className="size-4 animate-spin text-text-on-accent" />
          <span className="sr-only">{loadingLabel}</span>
        </span>
      ) : null}
    </motion.button>
  );
});

/**
 * Class-only export for anchors. The navbar and footer contain links, not
 * buttons; they render `motion.a` so the same press choreography and the same
 * focus ring apply without pretending a link is a button.
 */
export function buttonClasses(
  options: VariantProps<typeof buttonVariants> & { className?: string } = {}
): string {
  const { className, ...variants } = options;
  return cn(buttonVariants(variants), className);
}
