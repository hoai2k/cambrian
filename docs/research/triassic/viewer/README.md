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
| Scenery, plants and the shore | 14 | What the biomes are built from, plus four locality references. |

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
| `←` `→` | Previous / next reference image for this subject |
| `J` `K` | Next / previous subject, keeping the same view |
| `/` | Jump to the filter box |
| `Esc` | Close |

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
