# Material-01 review and bounded material-02 correction

Astra high independently inspected all seven actual material-01 images and the user-provided
TUG 1817-152 reference. Material-01 blend `1d6b2f537e21f826bf3751eae380de999184cfa140725a49782b310baa7d4429`; render manifest
`9d3749973686ab286547760b2fc11ee19aba998271d666666512641555dd3902`.

**Retain geometry and relief; reject current material finish.** Side/oblique/dorsal views show
the anterior armour and flexible posterior clearly separated. Neutral armour close-up confirms
local plate relief exists independently of colour. The open-mouth view retains a coherent
passage without the old collapsed floor sheets. No coarse anatomy reset is warranted here.

The armour close-up and mouth-open image reveal fine grain, but it is almost monochrome.
Across side/front/oblique views the large evenly coloured mustard masses and smooth highlights
still resemble rubber. The reference instead carries bronze/umber variation and visible uneven
bony granules. This is a surface/material target, not evidence for metallic living armour.

The posterior marks in side/dorsal views appear fuzzy and intermittently dotted; fin rays are
similarly broken. Source confirms narrow pigment kernels were evaluated only per vertex:
bar widths .010–.017 and narrow sine-ray lobes can approach or fall below surface sampling.
Increasing contrast alone would sharpen those sampling defects. Material-02 uses packed maps
with continuous shader coordinates (two independent 2048×1024 body masks and six 1024×1024 fin
masks), original deterministic kernels with varied spacing/lengths/lobes and elliptical flecks.
Only broad body countershading remains vertex colour.

The material-only source opens the frozen material-01 blend, retains its exact armour mask,
geometry, shape keys, weights and topology, and checks full-specimen and oral digests before/
after. It uses a lower-value umber/bronze noise palette, finer golden mottling, 110-scale bony
cells plus 245-scale micrograin, variable matte roughness and zero coat on the body. Existing
anatomical relief owns the sutures; no grid, additional seams or geometry edits are introduced.
Images from ImageGen are unnecessary for these controlled continuous material signals.

Remaining review concerns: overly coarse cellular grain, muddy brown armour, excessive bar
contrast or stencil regularity, wide rays, boundary harshness and any lost mouth/eye readability.
The same seven cameras/light setup includes matched clay/material close-ups. This is frozen
source ready for Terra, not a rendered or accepted material candidate. Future bake, real rig/
dynamic actions, final eye/general audit and runtime palette gate remain outstanding.
