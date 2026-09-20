/**
 * Every word the trilogy page says.
 *
 * Its own file rather than a slice of `src/content/strings.ts`, because this page belongs to no
 * game: it is the site root, it must not read `ACTIVE_ERA`, and it must not pull a game's content
 * module into its bundle (see `src/ancientseas/page.ts`). So the three games' names and taglines
 * live in `page.ts` beside their paths and their art — they are what a link *points at* — and what
 * is here is what the page says around them.
 *
 * Keys are named for where a visitor reads them: `head.` is the header of the first draft,
 * `plate.` the composition that ships, `badge.` the mark on a game that is not out yet.
 */
export const PAGE_TEXT = {
  /** The trilogy's own name, typeset until the engraved wordmark is delivered. */
  title: {
    line: 'Ancient Seas',
    sub: 'Trilogy',
    /** Alt text on the delivered wordmark, and the page's own accessible heading. */
    alt: 'Ancient Seas Trilogy',
  },
  /** The header of the first draft (`?version=1`); the composition that ships has no eyebrow. */
  head: {
    eyebrow: 'Three games · one sea · five hundred million years',
    rule: '— ❧ —',
  },
  /** The plate itself, and the list of games on it. */
  plate: {
    gamesLabel: 'The three games',
  },
  /** A game that is drawn and named but not yet a way in. */
  badge: {
    comingSoon: 'Coming soon',
    /** The accessible name of such a game, which is not a link. */
    label: (title: string, badge: string) => `${title} — ${badge}`,
  },
} as const;
