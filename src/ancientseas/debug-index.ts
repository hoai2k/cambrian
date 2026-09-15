/**
 * What `?debug` on the trilogy page lists: every viewer, bench and debug parameter the site has.
 *
 * These tools were always reachable only by knowing the parameter, which meant knowing the tool
 * existed — they are named in CLAUDE.md, in docs, and in the commit that added each one, and
 * nowhere a person can click. This is the index, and the site root is where it belongs: the tools
 * span all three games and several standalone pages, so no one game's page is their home.
 *
 * Pure data — no DOM, no React — so `npm run ancientseas` can check every entry headless: that the
 * page behind each link actually exists, that no two entries claim the same URL, and that nothing
 * here points at a game parameter the code no longer reads.
 *
 * Adding a tool here does not create one. Each entry describes something that already works; the
 * `reads` field names the module whose parameter check makes it work, so an entry cannot quietly
 * outlive the feature it advertises.
 */
import { GAMES, type GameLink } from './page';

/** A standalone page: its own entry point, opened by address rather than by a parameter. */
export interface DebugPage {
  readonly id: string;
  readonly name: string;
  /** Relative to the app root, which is this page. */
  readonly path: string;
  /** The file that has to exist for the link to resolve, relative to the repository root. */
  readonly entry: string;
  readonly blurb: string;
  /** Deeper links into the same page, each a full query string without the leading '?'. */
  readonly modes?: readonly { readonly name: string; readonly query: string; readonly blurb: string }[];
}

/** A parameter added to a game's own URL, which every game answers the same way. */
export interface DebugParam {
  readonly id: string;
  readonly name: string;
  /** The query string, without the leading '?'. */
  readonly query: string;
  /** The module whose check reads it, relative to the repository root. */
  readonly reads: string;
  readonly blurb: string;
  /** True when it replaces the game rather than changing it. */
  readonly replacesGame: boolean;
}

export const DEBUG_PAGES: readonly DebugPage[] = [
  {
    id: 'viewer', name: 'Specimen viewer', path: 'viewer/', entry: 'viewer/index.html',
    blurb: 'Every creature and prop in all three eras, on a turntable: its clips, its reduced model, its colour schemes, and the ⚠ badge and reason for anything whose art is still queued. Which specimen is open lives in the URL, so a link comes back to it.',
    modes: [
      {
        name: 'Sculpt', query: 'specimen=cambrian:anomalocaris&mode=sculpt',
        blurb: 'Reshape a body on side and top drawings — twenty stations, the eyes and the mouth — and export the change as a sculpt file for its builder. Offered only where a builder authors a profile table by hand, so the Cambrian and the Devonian; a Triassic animal opens the plain view instead.',
      },
      {
        name: 'Mark region', query: 'specimen=triassic:placodus&mode=mark',
        blurb: 'Paint the geometry that should not be there — a spare tail, an extra fin welded to the body — and export the vertices as a region file for tools/triassic/cut-region.py. Marks on whatever body is on stage, the raw generated mesh included.',
      },
      {
        name: 'Stretch', query: 'specimen=triassic:dinocephalosaurus&mode=stretch',
        blurb: 'Lengthen a run of a body between two cuts: the fault a profile table cannot reach, a neck that is simply the wrong length. On a raw generation it is an edit; on a built body it is a measurement for that animal’s builder.',
      },
    ],
  },
  {
    id: 'workbench', name: 'Workbench', path: 'workbench/', entry: 'workbench/index.html',
    blurb: 'The development benches, each picked with ?edit=. The page itself lists them, so a new bench appears here without this entry changing.',
    modes: [
      { name: 'Environment', query: 'edit=environment', blurb: 'Every biome painting, every radar glyph, and every instanced seabed prop on its own turntable \u2014 loaded from the same manifest the game places them from, so a prop that fails to load here fails in the sea.' },
      { name: 'Audio', query: 'edit=audio', blurb: 'Every sound the game can make, on one page and played through the real audio module \u2014 the same file pick, volume shaping and distance falloff \u2014 with both eras\u2019 libraries registered and each sample\u2019s measured level beside it.' },
    ],
  },
  {
    id: 'research-triassic', name: 'Triassic reference viewer', path: 'research/triassic/', entry: 'public/research/triassic/index.html',
    blurb: 'Where a Triassic subject’s canonical pose is chosen: our drawings against the references, one decision per subject — greenlight, redraw, or regenerate. Keeps nothing in the browser; a reviewer’s clicks are unsaved until exported and applied.',
  },
  {
    id: 'research-devonian', name: 'Devonian reference viewer', path: 'research/devonian/', entry: 'public/research/devonian/index.html',
    blurb: 'The same reference viewer over the Devonian roster, against that era\u2019s canonical images. Both are generated by npm run <era>:viewer from docs/, which is never published \u2014 the copy under public/ is the one the site serves.',
  },
  {
    id: 'stats', name: 'Visitor stats', path: 'stats/', entry: 'stats/index.html',
    blurb: 'Who visits, and nothing else: one GoatCounter site, with a chip per game. Prints its own setup steps when no site code is configured, so "nobody played it" and "we were never counting" cannot be confused.',
  },
];

export const DEBUG_PARAMS: readonly DebugParam[] = [
  {
    id: 'local', name: 'Local state editor', query: 'debug=local', reads: 'src/shared/debug.ts', replacesGame: true,
    blurb: 'Opens instead of the game and edits that era’s saved state — the codex, settings, records, everything kept in localStorage. It replaces the game deliberately: the editor is for a save the game is not holding open.',
  },
  {
    id: 'game', name: 'Match recorder', query: 'debug=game', reads: 'src/shared/debug.ts', replacesGame: false,
    blurb: 'Arms the recorder inside the ordinary game: the pause menu grows one button that walks Start → End → Export and hands over a JSON file of the match — the input, the body, the bodies near it, and the simulation’s own account of each frame. For answering "why did that not work" with the match’s numbers.',
  },
  {
    id: 'select', name: 'Open on the roster', query: 'screen=select', reads: 'src/app/App.tsx', replacesGame: false,
    blurb: 'Skips the title screen and opens on the pick screen. Not only a debug tool — it is how each game’s menu links across to another — but it saves a press every reload while working on the roster. Read once and then wiped from the address bar.',
  },
];

/** Parameters that apply to this page rather than to a game. */
export const DEBUG_SELF: readonly DebugParam[] = [
  {
    id: 'version', name: 'The first draft of this plate', query: 'version=1', reads: 'src/ancientseas/page.ts', replacesGame: false,
    blurb: 'The earlier trilogy page: the three title paintings whole on a dark ground, before the single composed plate. Kept for comparing drafts, which is why neither draft ever draws a link to the other — this index is not a draft, and is not offered to a visitor.',
  },
];

/** Every game the index offers the parameters against, the not-yet-open one included: it opens by address. */
export const DEBUG_GAMES: readonly GameLink[] = GAMES;

/** The URL a parameter opens on one game, relative to the app root. */
export const paramHref = (game: GameLink, param: DebugParam) => `${game.path}?${param.query}`;
/** The URL a page's mode opens, relative to the app root. */
export const modeHref = (page: DebugPage, query: string) => `${page.path}?${query}`;

/** Every URL the index draws, for the check that no two entries collide. */
export function everyHref(): string[] {
  return [
    ...DEBUG_PAGES.flatMap((p) => [p.path, ...(p.modes ?? []).map((m) => modeHref(p, m.query))]),
    ...DEBUG_PARAMS.flatMap((p) => DEBUG_GAMES.map((g) => paramHref(g, p))),
    ...DEBUG_SELF.map((p) => `?${p.query}`),
  ];
}
