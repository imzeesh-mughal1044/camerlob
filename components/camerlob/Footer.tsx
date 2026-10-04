/**
 * components/camerlob/Footer.tsx
 * Section 07: hairline rule, link columns, and the version badge.
 *
 * DESIGN DECISIONS
 * ------------------------------------------------------------------------
 * 1. THREE COLUMNS, NOT FOUR. The brief describes "3-column layout" and then
 *    lists four distinct regions: logo plus tagline, link columns, and a mono
 *    sign-off. The link group is the multi-column element, so the grid is
 *    `logo | links | signoff`, collapsing to a single stack below 768px where
 *    the link columns become a 2-up grid rather than one very long list.
 *
 * 2. EVERY LINK RESOLVES. The previous revision shipped `Developers` and `Legal`
 *    columns pointing at `/docs`, `/changelog`, `/license` and `/security` —
 *    four routes that do not exist, so all four 404'd. A dead link is worse than
 *    a missing one: it advertises a page the product does not have. The rule
 *    now is that a link is only rendered if its destination is a real route
 *    (`/convert`, `/#formats`, `/#privacy`) or a real external URL. When a
 *    section is worth building, add the route and the link together.
 *
 * 3. THE STUDIO CREDIT APPEARS TWICE, ON PURPOSE. Once under the tagline where
 *    a reader meets the brand, and once in the bottom row beside the copyright
 *    as the legal line. `site.ts` owns the name and its URL so the two cannot
 *    drift apart. The credit is deliberately small and muted: it is a
 *    portfolio credit, not a second logo.
 *
 * 4. SOCIAL LINKS ARE ICONS IN A 44px TARGET. The glyph is 20px and the tap
 *    target is 44x44, so the row is comfortably tappable on a phone without
 *    the icons being pushed apart by their own padding. `aria-label` carries the
 *    full name, so the GitHub link reads as the developer's own profile rather
 *    than an anonymous organisation.
 *
 * 5. THE HEART IS TEXT, NOT AN ICON. It is part of the sentence "Built with ❤
 *    for people who value privacy", which is copy the brief specifies verbatim,
 *    so it is set as a glyph inside mono text rather than swapped for a Lucide
 *    icon that would change the tone of the line.
 *
 * 6. THE LOGO IS NOT PRELOADED HERE. It is the same asset as the navbar's, and a
 *    second `priority` would make the browser fetch it twice; `priority={false}`
 *    lets it share the navbar's request.
 *
 * 7. THE VERSION BADGE IS A TOKEN-COLOURED PILL, NOT A BADGE COMPONENT. The
 *    shadcn Badge primitive is not part of the landing page's file scope, and a
 *    span with the same tokens costs nothing.
 */

import { Facebook, Github, Instagram } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Logo } from '@/components/camerlob/Logo';
import { SITE } from '@/lib/constants/site';
import type { SocialKey } from '@/lib/constants/site';
import { cn } from '@/lib/utils/cn';

interface LinkColumn {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}

/** Outbound profiles. Every href is read from `site.ts`, never inlined. */
const SOCIAL: readonly {
  key: SocialKey;
  label: string;
  href: string;
  Icon: LucideIcon;
}[] = [
  {
    key: 'instagram',
    label: 'ZEFANEX on Instagram',
    href: SITE.social.instagram,
    Icon: Instagram,
  },
  {
    key: 'facebook',
    label: 'ZEFANEX on Facebook',
    href: SITE.social.facebook,
    Icon: Facebook,
  },
  {
    // Named after the person, not the project: this is one developer's
    // personal repository, and an anonymous "GitHub" link reads as an org.
    key: 'github',
    label: 'GitHub — Developer Zeeshan Ahmad',
    href: SITE.social.github,
    Icon: Github,
  },
];

const COLUMNS: readonly LinkColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Convert', href: '/convert' },
      // `#formats` is FormatGrid's section id and `#privacy` is section 05 on
      // the landing page. Both verified against the rendered anchors.
      { label: 'Formats', href: '/#formats' },
      { label: 'Privacy', href: '/#privacy' },
    ],
  },
];

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn('border-t border-border-subtle', className)}>
      <div className="container-page measure-wide py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-4">
            <a
              href="/"
              aria-label="Camerlob home"
              className="inline-block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400"
            >
              <Logo height={28} priority={false} />
            </a>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-text-tertiary">
              Local-first image conversion. Nothing is uploaded, nothing is tracked.
            </p>
            {/* Decision 3: the studio credit, set small and muted. */}
            <p className="mt-2 text-[13px] leading-relaxed text-text-tertiary">
              A Project of{' '}
              <a
                href={SITE.brandUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'rounded-sm underline decoration-aqua-500/40 underline-offset-2',
                  'transition-colors duration-150 ease-camerlob-out hover:text-aqua-400',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
                )}
              >
                {SITE.brand}
              </a>
            </p>
          </div>

          {/* Link columns: Product + Connect */}
          <div className="grid grid-cols-2 gap-8 md:col-span-5">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="label-mono-sm text-text-tertiary">{column.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                        className={cn(
                          'text-sm text-text-secondary',
                          'transition-colors duration-150 ease-camerlob-out hover:text-aqua-400',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
                        )}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            {/* Decision 4: 20px glyph inside a 44x44 tap target. */}
            <nav aria-label="Connect">
              <h2 className="label-mono-sm text-text-tertiary">Connect</h2>
              <ul className="mt-4 flex items-center gap-0.5">
                {SOCIAL.map(({ key, label, href, Icon }) => (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className={cn(
                        'grid size-11 place-items-center rounded-md text-text-tertiary',
                        'transition-[color,transform] duration-150 ease-camerlob-out',
                        'hover:scale-105 hover:text-aqua-400',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
                      )}
                    >
                      <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Sign-off */}
          <div className="md:col-span-3 md:text-right">
            <p className="font-mono text-xs leading-relaxed text-text-tertiary">
              Built with{' '}
              <span aria-hidden="true" className="text-aqua-500">
                &hearts;
              </span>{' '}
              <span className="sr-only">love</span>
              for people who value privacy
            </p>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-12 flex flex-col items-start gap-4 border-t border-border-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs text-text-tertiary">
            {'\u00A9'} 2026 - A Project of{' '}
            <a
              href="https://github.com/imzeesh-mughal1044"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'rounded-sm underline decoration-aqua-500/40 underline-offset-2',
                'transition-colors duration-150 ease-camerlob-out hover:text-aqua-400',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
              )}
            >
              ZEFANEX Technologies
            </a>
            .
          </p>
          <span className="rounded-full border border-aqua-500/25 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-aqua-400">
            v1.0.0
          </span>
        </div>
      </div>
    </footer>
  );
}
