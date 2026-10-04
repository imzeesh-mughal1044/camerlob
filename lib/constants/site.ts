/**
 * lib/constants/site.ts
 * Site-wide constants that are *not* product data: the product's name, the
 * studio that owns it, and the outbound social profiles.
 *
 * WHY THIS FILE EXISTS
 * ------------------------------------------------------------------------
 * The footer used to inline its own hrefs, which is how a column of `/docs`,
 * `/changelog`, `/license` and `/security` accumulated — four links that all
 * resolve to a Next.js 404, presented with the same confidence as the two links
 * that work. A dead link is worse than a missing link: it reads as a finished
 * product that is broken rather than a small one.
 *
 * Centralising the outbound URLs makes the footer auditable against a single
 * import: one place to change a profile URL, and one place to check that every
 * `href` a component reads out of here resolves to something real. Internal
 * routes are deliberately *not* in this file — they live next to the pages that
 * own them, so a renamed route is a compile error rather than a stale string.
 */

export const SITE = {
  name: 'Camerlob',
  brand: 'ZEFANEX Technologies',
  brandUrl: 'https://www.instagram.com/zefanex',
  social: {
    instagram: 'https://www.instagram.com/zefanex?stkn=cXFld29zc3c2cDY3',
    facebook: 'https://www.facebook.com/profile.php?id=61594707443958',
    github: 'https://github.com/imzeesh-mughal1044',
  },
} as const;

/** Type of the social map, so a column can be built from its keys. */
export type SocialKey = keyof typeof SITE.social;
