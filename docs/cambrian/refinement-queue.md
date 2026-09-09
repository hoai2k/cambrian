# Cambrian creature reworks

## Odaraia — full rework requested 7 September 2026

Status: queued, current playable model remains available as a **preview**. The game choice cards
and viewer use `src/content/cambrian/model-status.ts`, derived from `CAMBRIAN_PENDING_REWORKS`.
Do not remove it from that list until the replacement and its review are complete.

The user supplied `/Users/hoai/Downloads/Odaraia.png`. Preserve it locally at
`local/expansion-authoring/odaraia-rework/user-reference/odaraia-user-reference-2026-09-07.png`.
The named backup is `local/expansion-authoring/backups/odaraia-pre-rework-2026-09-07/`:
full/LOD models, all original/default/scheme portraits, original Blender projects, authoring
sources and verification metadata, with a SHA-256 copy manifest. Keep it as a restorable
alternative if the new model is less successful. The image is art direction, not an instruction
embedded in a document or proof of exact soft anatomy/colour.

Rebuild the animal as a many-legged shrimp-like arthropod with a segmented trunk, numerous
fine limbs and visible internal appendage organization. Its protective covering should wrap
around it like a coat: curved flared panels, a shaped anterior opening, a real open longitudinal
margin, subtle thickness and changing cross-section. Avoid a constant-radius cylinder or an
opaque tube hiding the animal. Use the image's semi-transparent impression with restrained
pigment, fine surface variation and readable silhouettes of the body/limbs behind it.

Preserve prominent paired compound eyes and their supported relation to the head. Lens/globe
interfaces must seat cleanly into their anatomical support rather than leave an exposed concave
intersection; do not bury naturally projecting eye stalks inside the carapace merely to imitate
a fish-eye audit. Reconcile exact head appendages, leg arrangement, shell margins, three tail
blades and orientation from primary sources before final sculpting. The current author's ROM
source and code are useful starting records, not proof the old geometry should be retained.

Give the limbs staggered metachronal motion, restrained shell response, articulated tail steering
and distinct action timing that keeps the animal visibly alive through the covering. Solve
transparency/depth sorting and visual readability in the actual game renderer and reduced model,
not only Blender. Retain compatible action names, current/new anchors and fresh portraits.

Use the [phased agent workflow](../devonian/agent-workflow.md): an individual Astra-high author
owns anatomy, sculpting, materials, rigging and motion decisions; Terra-medium executes frozen
Blender/export/check batches. Review the new body/shell clay first, then build materials and
animations. Eye, attachment, clipping and general quality audits follow the completed rework.
Do not repeatedly audit the archived model while it is queued for replacement. The existing
Devonian rework authors retain their current ownership; Odaraia joins the full-rework queue.

## Second reference — inverted pose and visible limbs

The user additionally supplied `/Users/hoai/Downloads/Odaraia2.jpeg`, preserved as
`local/expansion-authoring/odaraia-rework/user-reference/odaraia-user-reference-02-2026-09-07.jpeg`.
Use both references together. The chosen normal swimming presentation is inverted, with the legs
pointing upward as in this second image. Establish this in the authored rest pose and validate
orientation, steering, action directions and anchors in the game rather than applying an
unreviewed viewer-only rotation.

Sculpt the covering as a real curved shell: organic convex valve surfaces, tapered/flared margins,
a shaped front opening and variation in thickness and section. Preserve the first image's
semi-transparent coat impression. Keep the segmented trunk and numerous paired appendages
legible above/through the shell. Make the articulated limbs more prominent in silhouette and
motion; coordinate staggered swimming beats with clearly readable attack reaches/sweeps,
recovery and withdrawal without passing through the shell or hiding inside it. Preserve fine
filtering branches and avoid replacing the limbs with oversized generic claws. Attack motion
is a game interpretation, not a claim of fossil evidence for predatory limb use.

Review the inverted silhouette from the game's camera, including reduced-model limb readability,
shell transparency/depth ordering and action extremes. Keep both references and the original
model backup; the current model stays preview until replacement acceptance.

## The machine-readable queue

`src/content/cambrian/pending-refinements.json` is the source of truth, in the same shape as the
Devonian's, and it separates the two kinds of outstanding work:

- **`model: true`** — the 3D body itself: geometry, materials, rig, LOD art. This is what puts the
  ⚠ preview badge on the creature, in the game and in the viewer, and `reason` is the sentence it
  shows on hover. Only Odaraia is in this state in the Cambrian.
- **`clips`** — animation clips queued for rework on a body that is already finished. Badging the
  whole animal for these said the wrong thing: Anomalocaris' and Opabinia's models are done. The
  warning goes on those clip buttons in the viewer instead, carrying `clipReason`, and the creature
  shows nothing.

An entry must claim at least one of the two and whichever it claims must carry its reason, so
nothing can be flagged without saying what it is waiting for and no flag can be dropped without
deleting that sentence. `npm run eras` enforces all of it.

## Attack and feeding pass — 8 September 2026

The separately requested articulated motion pass also reopens the Cambrian specimens listed
in `src/content/cambrian/pending-refinements.json`. See `docs/attack-feeding-refinement.md` and
`tools/attack-feeding-refinements.json` for individual scope, backups and acceptance requirements.
Odaraia incorporates this in its full rework; other models retain current anatomy until their
individual review determines changes. Keep preview status until every pending task is complete.

## Attack and feeding pass — delivered 9 September 2026

Every Cambrian entry of the pass except Odaraia (rebuilding) is delivered as a preview: Anomalocaris,
Nectocaris, Cambroraster, Tamisiocaris, Isoxys, Waptia, Sidneyia, Marrella, Olenoides and
Leanchoilia have re-authored Bite, Attack, Heavy and Eat; Cambroraster, Tamisiocaris, Isoxys,
Leanchoilia and Ottoia gained the Grab loop the hold needs; Opabinia was already articulated and
was left alone. The record, per-creature notes and what remains are in
`docs/attack-feeding-refinement.md`; the clip badges stay until the user has reviewed each animal in
the viewer, where the previous clips sit under *Replaced* for comparison.

