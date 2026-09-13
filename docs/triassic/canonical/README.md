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
`turnaround` whether its four-view sheet has been made. 26 poses are approved; no turnarounds
exist yet. After adding or replacing a pose here, run `npm run triassic:viewer` so the viewer and
its deployed copy pick it up.

## Reviewing them

Open the [reference viewer](https://games.hoai.net/cambrian/research/triassic/) (source in
[`docs/research/triassic/viewer/`](../../research/triassic/viewer/)) and press **C** on any subject. It
flips between the canonical pose and reference images collected from Wikimedia Commons, in place
and at the same size, so a drifted silhouette is obvious. **B** puts them side by side, and
**‹ Prev / Next ›** walks the roster. The anatomy each animal has to get right is in the design's
per-creature entries and the sources in [research.md](../research.md).

Then decide. **Use as canon** on the image showing is the whole verdict:

- the **canonical pose** → greenlit, and the model is built from it;
- a **reference** → the pose is regenerated with that picture as the steer, and the note you type
  goes into the brief as what to change;
- the **3D views** sheet is in the running as well: choosing it over a pose says the pose should be
  redone to match it, and for a subject whose only image *is* the sheet it greenlights that.

*Export selections* downloads the decisions, and

```sh
node tools/triassic/apply-selections.mjs <the downloaded file>   # --dry-run to see it first
```

writes them into `manifest.json` (`greenlit` / `needs-rework`) and into
[review.md](review.md) — the generated write-up of what is cleared to build and, for each rework,
the reference to steer by with its credit and licence. Decisions live in the browser until they
are exported, so export before clearing site data.

## Why they live here and not in `intake/`

`intake/` is a handoff inbox, not an archive: art is delivered there, converted, checked where it
is actually used, and the sources are deleted in the same commit, so anything sitting in it means
something has been handed over and not yet integrated. These poses are integrated — they are the
reference the pipeline and the viewer both read — so they live with the era's documents. A
pipeline step that wants to write a *new* canonical pose should still deliver it through
`intake/` and land it here.

Nothing in this directory ships with the game. The runtime assets will be
`public/assets/triassic/` when there are any.
