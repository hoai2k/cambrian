# Bothriolepis MATERIAL05 / MATERIAL05b — result, and the V3 production handoff

Session of 12 September 2026, continuing from `review-material04-and-next-direction.md`.
Environment: Blender 5.2.1 at `/opt/blender/blender`; the MATERIAL04 blend was
re-derived in this environment by the unmodified frozen builders.

## The MATERIAL04 input, verified by value

`.blend` files are not byte-reproducible across saves — the chain established that
at MATERIAL04 itself, which is why `build_material04-linux.py` carries its own
`EXPECTED` constant. The re-derived M04 blend here is nonetheless the reviewed
model **by value**: the object carries
`geometry_after_material04_sha256 = abdcbfa7a2dad39e6895bf824114d4f6732d4eacd26eaa622f6ff6acf4ed582d`,
which is exactly the "actual geometry/key hash after declared change" the M04
review bound its verdict to. `build_material05.py` re-hashes the live mesh against
that value and additionally asserts 55,802 vertices / 56,104 faces, 38,904
protected vertices and their coordinates, the oral study-key delta, five oral
poses PASS and both eye meshes, before it changes anything.

## What the diagnostic actually showed, and one correction to the brief

The brief's target — no step-to-step geometric-normal angle above 15° on the three
sample lines — is not reachable as written, and the reason is not the relief.
Measured on the relief-free `section()` surface, the **form itself** turns through
**62.6–63.0° in one step** at the posterior median crest apex (y = 0.15) on the
dorsal line. That is the accepted rear median crest the M04 review asked to
preserve; an absolute 15° ceiling would mean flattening it. Everywhere else on
rows 55–86 the form's own steps are 0.2–5.8°.

The quantity a relief repair can own is therefore the **excess over the section
form**, and that is what is reported and enforced below (with the absolute figures
alongside, so nothing is hidden).

The second finding is that the defect is not local. Relief-induced excess on the
M04 mesh is 45–82° on *every* shield row from y = −1.57 to y = +0.13, not only at
the nuchal branch — the same measurement, read across the whole grid, is also what
the review was describing as the wrinkled frontal field and the embossed-leather
armour. A band-local repair would have left the identical defect on either side of
the band, so the repair covers the whole shield grid under the same protections
(oral transition, eye seats, pectoral root collar, posterior). This is recorded as
a deliberate deviation in `geometry_material05.py`'s docstring.

## Numbers against the three targets

| | MATERIAL04 | MATERIAL05b | target |
| --- | ---: | ---: | --- |
| longitudinal step excess over section form, whole shield | 82.22° | **7.39°** | ≤ 15° |
| circumferential step excess over section form, whole shield | 94.22° | **9.86°** | ≤ 15° |
| dorsal_k0 peak excess (diagnostic's own line) | 76.5° | **6.82°** | ≤ 15° |
| flank_k48 peak excess | 52.4° | **4.60°** | ≤ 15° |
| flank_k144 peak excess | 50.1° | **4.65°** | ≤ 15° |
| dorsal_k0 median step angle | 7.37° | **1.93°** | — |
| dorsal_k0 absolute peak | 76.73° | **61.36°** | = crest apex, form's own 62.55° |
| flank absolute peaks | 52.60 / 50.33° | **5.78 / 5.75°** | = form's own 5.78° |
| microrelief amplitude (bump × normal variance) | .04051 | **.01781** | ≈ .02 |
| RMS normal-map slope, rostral band | .1650 | **.0792** | halved |
| bump strength | .18 | **.08** | ≈ .08 |

Topology 55,802 v / 56,104 f preserved; 38,904 protected vertices bit-identical;
maximum vertex move .01480; oral study-key delta error 0.0; five oral poses PASS;
eye meshes unchanged.

## Iterations

* **material05** — geometry repair as above; micro height .00085, contrast .062,
  normal strength .62, rostral cap driven from the shield atlas through the new
  mirrored disc chart. Numerically on target, but the shield read porcelain and
  the cap smeared into a dark radial wedge: the atlas is already stretched ~3.3×
  circumferentially at the nose (the section's circumference there is 0.91 units
  against the chart's 3.0), and the fan's apex is a chart singularity on top of
  that.
* **material05b (accepted)** — fine bone relief restored to about half of M04
  rather than a third (micro height .0012, contrast .085, normal strength .72),
  and the cap's fine response taken from the shared **rest-space** field at the
  atlas's own tubercle scale, which has no chart and therefore no stretch and no
  apex. The same rest-space grain and a matching rest-space pigment modulation go
  on the pectoral root collar and the articulation band, so cap and roots are no
  longer polished plastic beside textured bone.

The mirrored disc chart is still written into the UV layer (192 cap polygons,
minimum UV triangle area 1.66e-4 — no collapsed longitudinal UV), so the cap stays
addressable for a future bake; it simply does not drive the shader.

**Residual, and why it is form rather than finish:** the snout is closed by a flat
192-triangle fan standing perpendicular to the body axis. Under raking light its
lower half is a downward-forward plane and still reads as a distinct facet. With
the topology fixed at 55,802 / 56,104 the only cap shape available from one ring
plus one apex is a cone, which trades a flat wedge for a point; rounding the
rostrum properly needs concentric cap rings, which is a clay-stage change and
outside M05. Flagged rather than fudged.

## Evidence

* `../devonian-authoring/bothriolepis/rework-v3/material05/` and `material05b/`:
  editable blend, nine atlas maps, `source-check.json`, `section-report.json`,
  seven close-ups (`closeup-nuchal-seam_{front,oblique,side}`,
  `closeup-rostral-cap_{front,oblique,side}`, `closeup-mouth-open`) and the full
  nine-view set at the M04 cameras and resolution.
* The close-up cameras are `diagnostic_m04_closeup.py`'s own two regions and three
  angles, so M05b sits beside the M04 diagnostic sheet frame for frame.

## Production, V3 candidate

`build_v3.py` + `finalize_v3.py` + `portraits_v3.py` + `export_audit_v3.mjs`
(all new files; nothing tracked was edited). V2's twelve joint names, eighteen
clip names/durations, loop set `Idle/Swim/Guard/Eat`, three anchor roles and
export/LOD pattern are reproduced on the V3 mesh; the skinning is written against
the V3 tags because V3 is one closed manifold where V2 was a dozen primitives.

* full 115,280 tris / 59,349 verts, LOD 32,276 tris (ratio 0.280), 12 bones, 18
  clips, 3 sockets, bounds 5.000 long.
* packaged: 14,545,688 → 11,780,044 and 1,275,056 → 711,428 bytes, exact
  round-trip PASS on both.
* eye audit: full 96.11 / 95.29 %, LOD 96.14 / 95.30 %, all `criterion50` PASS and
  `target65` true, head topology valid with 0 non-manifold edges and no capped
  boundary loops. The globes were not moved for the threshold — they are the
  MATERIAL01 seats, hash-asserted unchanged at every stage, and read as visible
  dark beads in `09-forehead-continuity`.
* the shader's rest-space pore Bump (which glTF cannot express) is baked into the
  exported atlas normal maps; the root, articulation and rostral-cap slots ship
  vertex pigment only and do not carry that bake — stated in the meta notes rather
  than dropped silently.
* glTF multiplies COLOR_0 into `baseColorTexture`, so the full model ships a
  CORNER-domain `Color` that is white on the five textured/constant slots and the
  authored pigment on the three vertex-only slots; the LOD ships the fully baked
  pigment on every slot with no textures at all. `finalize_v3.py` asserts that
  layout on the decoded binary.

`tools/devonian/check.mjs bothriolepis` reads `public/` and was deliberately not
run here; the candidate is in `../devonian-authoring/bothriolepis/v3-candidate/`.
