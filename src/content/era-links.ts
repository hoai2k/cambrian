/**
 * The three games as the pages that link them see them: a title, a folder, a date and a wordmark.
 *
 * Stated once here and derived everywhere else — the pick screen's menu of the other games
 * (`copy.sibling`/`siblings` in each era pack, via `eraLinks`) and the trilogy page's plate (`GAMES`
 * in src/ancientseas/page.ts) — because each used to spell all three out for itself, the "N million
 * years later" blurbs included, and a date written six times is a date that drifts. Pure data: no
 * roster, no `ACTIVE_ERA`, so the trilogy page can read it without pulling a game into its bundle.
 */
export type GameId = 'cambrian' | 'devonian' | 'triassic';

export interface GameEntry {
  readonly id: GameId;
  readonly title: string;
  /** The game's own folder, relative to the app root (the trilogy page). */
  readonly path: string;
  /** How long ago, in millions of years, as the game's own copy dates itself (`copy.taglineEm`). */
  readonly mya: number;
  /** The wordmark the interface draws (`npm run logos`). */
  readonly wordmark: string;
}

/** The trilogy, oldest first, which is also the order every menu of them is in. */
export const GAME_TABLE: readonly GameEntry[] = [
  { id: 'cambrian', title: 'Cambrian Conquest', path: 'cambrian/', mya: 508, wordmark: 'assets/brand/logo-header.webp' },
  { id: 'devonian', title: 'Devonian Domination', path: 'devonian/', mya: 375, wordmark: 'assets/devonian/brand/logo-header.webp' },
  { id: 'triassic', title: 'Triassic Triumph', path: 'triassic/', mya: 240, wordmark: 'assets/triassic/brand/logo-header.webp' },
];

export const gameEntry = (id: GameId): GameEntry => GAME_TABLE.find((g) => g.id === id)!;

/** A link from inside one game to another, as its pick screen draws it. */
export interface SiblingLink { readonly title: string; readonly path: string; readonly blurb: string; readonly logo: string }

/** How far apart two games are, said from inside the first: "133 million years later". */
export function yearsApart(from: GameId, to: GameId): string {
  const d = gameEntry(from).mya - gameEntry(to).mya;
  return `${Math.abs(d)} million years ${d > 0 ? 'later' : 'earlier'}`;
}

/**
 * The links an era pack carries (`copy.trilogy`, `copy.sibling`, `copy.siblings`): the trilogy's
 * own page, and the other two games in the trilogy's order — the first as `sibling`, the rest as
 * `siblings`, which is how the pick screen's menu lists them.
 */
export function eraLinks(from: GameId) {
  const others: SiblingLink[] = GAME_TABLE.filter((g) => g.id !== from)
    .map((g) => ({ title: g.title, path: g.path, blurb: yearsApart(from, g.id), logo: g.wordmark }));
  return {
    trilogy: { title: 'Ancient Seas Trilogy', path: '', blurb: 'All three games' },
    sibling: others[0],
    siblings: others.slice(1),
  };
}
