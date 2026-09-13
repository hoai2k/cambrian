# Triassic reference viewer

A research surface for choosing and judging the Triassic roster: every subject in the
[design](../../../triassic/01-triassic-design.md) with reference images pulled from Wikimedia
Commons, and a toggle that flips each one against our own canonical image so the two can be
compared in place.

**Live at [games.hoai.net/cambrian/research/triassic/](https://games.hoai.net/cambrian/research/triassic/)**,
or open `index.html` straight off the disk — it needs no server either way, because the data is a
plain `data.js` rather than a `fetch()` a browser would block on a `file://` page.

`npm run triassic:viewer` writes both: this directory, and the deployable copy in
`public/research/triassic/` that Vite carries into `dist/`. Only `dist/` is deployed — `docs/` is
not, which is why a `…/docs/research/triassic/viewer` URL 404s on the live site. The deployed copy
carries the canonical images re-encoded at 1400 px (5 MB) rather than the 66 MB of full-resolution
PNGs in `docs/triassic/canonical/`, which stay in git for anyone porting a model. Reference images
are hotlinked from Wikimedia Commons in both copies, so the page wants a connection.

## What is in it

| Group | Subjects | What they are |
| --- | --- | --- |
| Playable roster | 21 | The animals of the design, in rung order, each labelled with its slot and length. |
| Shore animals | 4 | Tanystropheus and company. Modelled and placed, never played. |
| Alternates and reserves | 26 | Weighed and left out, each with the slot it could take. This is the swap list. |
| Scenery, plants and the shore | 17 | What the biomes are built from, the three Tier 1 organic props, and four locality references. |

Each subject shows its own images first — the canonical pose, any extra authored view, and the
**3D views** modelling sheet once one exists (picked up from `docs/triassic/canonical/
<id>-turnaround.png` or straight out of `intake/triassic/…` while it is still a fresh delivery) —
then the references.

## The canonical toggle

Each subject has two sides: the **web reference** (what the literature and palaeoart look like) and
the **canonical** image (our own art for it). Press **C** to flip between them, in place and at the
same size, or **B** to put them side by side. The header buttons do the same for the whole grid at
once, which is the fast way to see which of our images have drifted from their references.

Canonical images live in [`docs/triassic/canonical/`](../../../triassic/canonical/README.md),
named after the subject id, and are picked up by `node bundle.mjs`, which also writes the grid
thumbnails in `thumbs/`. **25 of the 65 subjects have one**: the 21 playable animals (Keichousaurus
twice, male and female), three shore animals and Coelophysis. The other 40 — the alternates and the
scenery — read *no canonical image* and the toggle is greyed out on them until art lands.

| Key | Does |
| --- | --- |
| `C` | Flip between the web reference and the canonical image |
| `B` | Side by side |
| `←` `→` | Previous / next image on the side being shown |
| `J` `K` | Next / previous subject, keeping the same view (or the **‹ Prev / Next ›** buttons) |
| `Enter` | Choose the image on show as this subject's canon (again to undo) |
| `X` | Clear this subject's choice |
| `/` | Jump to the filter box |
| `Esc` | Close |

## Choosing, and the export

The point of the comparison is a decision, so each pane carries **Use as canon**. Choosing our own
generated pose greenlights it — the model gets built from that image. Choosing a reference says the
pose is not right yet and names the picture the regeneration should be steered toward; the note box
under the stage is what should change, and it travels with the decision. The four-view modelling
sheet, where one exists, is in the running as well.

Decided subjects carry a badge in the grid, and **Undecided only** hides them so a pass through 68
subjects can be finished in sittings. Choices are kept in this browser (a research page has no
server) against a stable reference — an authored image's label, a reference's Commons filename — so
refetching the Commons set or regenerating the deployed copy cannot move a decision onto a
different picture.

**Export selections** downloads them as JSON, and

```sh
node tools/triassic/apply-selections.mjs <the downloaded file>   # --dry-run first, if you like
```

applies it: `docs/triassic/canonical/manifest.json` gains each subject's `greenlit` or
`needs-rework` state, and `docs/triassic/canonical/review.md` is rewritten as the brief — what is
cleared to build, and for each rework the image to steer by, its credit and licence, and the note.
A subject the file does not mention is left exactly as it was, so the pass can be applied in
pieces. Nothing leaves the browser until you press export.

## Refreshing it

```sh
node docs/research/triassic/viewer/fetch-images.mjs     # re-query Commons → images.json
npm run triassic:viewer                                 # images.json + canonical/ → data.js + the deployed copy
```

The second command is the one to run after dropping a new canonical pose in: it re-thumbnails,
rewrites both `data.js` files and refreshes `public/research/triassic/`. Commit that folder — it is
generated, but it is what the site serves.

`fetch-images.mjs --local` also downloads the references into `img/` if an offline copy is wanted;
the viewer prefers the hotlink either way, and nothing in `img/` should be committed.

To add or change a subject, edit `subjects.json` (its `search` field is the Commons query and its
`wiki` field the English Wikipedia article) and re-run both scripts. Ranking prefers files whose
name carries the genus, then life restorations, skeletons and specimens, then size plates, and
drops maps, cladograms and anything under 380 px.

## Provenance

Every image carries its artist and licence under the large view, with links to the Commons file
page and the full-resolution original. They are **reference for choosing and judging**, not
evidence and not assets: nothing here is shipped with the game, and a generated reconstruction is
one artist's reading of a fossil, not the fossil. The anatomy that has to be right for each animal
is in the design document and in [research.md](../../../triassic/research.md), which cites papers
rather than pictures.
