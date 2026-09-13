# Canonical poses

One approved image per Triassic subject: the **visual contract** for that animal. Everything
downstream is made from the image in this directory rather than from prose — the neutral four-view
modelling sheets, then the Tripo generation, then the body that ships
([04 · The Tripo pipeline](../04-tripo-pipeline.md)). If the canonical pose is wrong, the model is
wrong, so this is the thing to argue about.

**The order is greenlight, then build.** A pose is reviewed by a human first; only a greenlit pose
is turned into a modelling sheet and fed to Tripo. A pose that loses the comparison is regenerated
toward the picture that beat it and reviewed again. Nothing is repaired downstream, because a body
fixed at the mesh stage no longer matches any image and there is then no answer to what the animal
is meant to look like.

Each file is named for its subject id in the design: `nothosaurus.png`, `tanystropheus.png`.
Keichousaurus has two, `keichousaurus-male` and `keichousaurus-female`, because the sexes differ
in the limb proportions the fossils record and both are wanted as schemes.

`manifest.json` tracks each subject's state: `canonical` is whether the pose is approved and
`turnaround` whether its four-view sheet has been made. After adding or replacing a pose here, run
`npm run triassic:viewer` so the viewer and its deployed copy pick it up.

Scenery is here on the same terms as the animals. The four organic props — `voltzia`,
`coral-head`, `sponge-mound`, `log-raft` — arrived with their modelling sheets already made, so
each has a pose (`<id>.png`, the three-quarter view), its sheet (`<id>-turnaround.png`) and the
side and top views beside them. They were generated from the briefs in `scenery-prompts.json` with
no external source image, and `log-raft` is deliberately the bare drift trunk: the crinoid colony
that rides it is assembled procedurally in the engine. Having the sheet already does not skip the
gate — the pose is still what a human greenlights in the viewer, and the sheet is in the running
against it there.

## Reviewing them

Open the [reference viewer](https://games.hoai.net/cambrian/research/triassic/) (source in
[`docs/research/triassic/viewer/`](../../research/triassic/viewer/)) and press **C** on any subject. It
flips between the canonical pose and reference images collected from Wikimedia Commons, in place
and at the same size, so a drifted silhouette is obvious. **B** puts them side by side, and
**‹ Prev / Next ›** walks the roster. The anatomy each animal has to get right is in the design's
per-creature entries and the sources in [research.md](../research.md).

Then decide, on the image showing. There are three answers:

- **Use as canon** on one of ours → greenlit, and the model is built from that image. Where a
  subject has more than one of ours — the male and female Keichousaurus, a modelling sheet beside
  its pose — this is also which of them is the canon.
- **Needs redraw** on one of ours → the reading is right and no other picture beats it, but the
  image itself is wrong: a fin that should not be there, a frame that makes a six-metre animal
  read as a lizard, a pose out of the water. The note you type is then the entire brief.
- **Redraw toward this** on a reference → ours is not right yet, and that picture is the steer.
  Somebody else's artwork is direction only: its credit travels with the prompt and it is never
  shipped.

The **3D views** sheet sits last in the row and takes the same answers, so a subject whose only
image is the sheet can be greenlit on it.

*Export selections* downloads the decisions, and

```sh
node tools/triassic/apply-selections.mjs <the downloaded file>   # --dry-run to see it first
```

writes them into `manifest.json` (`greenlit` / `needs-rework`), regenerates [review.md](review.md)
— the brief: what is cleared to build, and for each redo the steer with its credit and licence and
the reviewer's note — and rewrites the preview-badge reasons in
`src/content/triassic/pending-refinements.json`, so what the specimen viewer says about an animal
matches where its pose actually stands.

**The page keeps nothing.** It starts every load from `manifest.json` as bundled by
`npm run triassic:viewer`, so what you see is what has been applied to the codebase; clicks live in
the tab and a reload discards them. Export before you close it. This is deliberate: choices used to
persist in the browser, which quietly let the page disagree with the repository — a reviewer coming
back a week later was reading their own old clicks rather than the decisions that were made real.

## Why they live here and not in `intake/`

`intake/` is a handoff inbox, not an archive: art is delivered there, converted, checked where it
is actually used, and the sources are deleted in the same commit, so anything sitting in it means
something has been handed over and not yet integrated. These poses are integrated — they are the
reference the pipeline and the viewer both read — so they live with the era's documents. A
pipeline step that wants to write a *new* canonical pose should still deliver it through
`intake/` and land it here.

Nothing in this directory ships with the game. The runtime assets will be
`public/assets/triassic/` when there are any.
