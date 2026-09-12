# Triassic — the third era

Design and asset planning for the third installment: a Triassic sea, after the Cambrian
(`/`) and the Devonian (`/devonian/`). Nothing here is built; this directory is the brief the
build will work from, in the same shape as `docs/redesign/07-devonian-design.md` and
`08-devonian-domination.md` were for the second era, kept together here because the user asked
for the era's documents in one place next to `docs/devonian/`.

| Doc | Contents |
| --- | --- |
| [01 · Design](01-triassic-design.md) | The pitch and the era mechanics (breath, live birth, haul-out, the shore that reaches in, depth), the 21 playable creatures with their natural history and in-game effects, the non-playable shore animals (Tanystropheus and company), alternates. |
| [02 · Biomes and depth](02-biomes-and-depth.md) | The nine biome slots recast for the Triassic, the water-depth profile (a sea floor that sinks toward the basin), and the prop and plant models each biome needs. |
| [03 · Image and model requests](03-image-and-model-requests.md) | Every image and 3D model the era needs, in two tiers: Tier 1 goes through Tripo (all creatures, the shore animals, a few organic scenery pieces), Tier 2 is built in-house. Source-image briefs first, model requests against them second. |
| [04 · Tripo pipeline](04-tripo-pipeline.md) | The production strategy: Tripo bodies on procedural skeletons, motion authored on the procedural twin and applied to the Tripo mesh; where the strategy is agreed with, where it is amended and why. |
| [research.md](research.md) | The natural-history notes and sources the roster and biomes were drawn from, with confidence labels. |

## Where it will live when built

Following the era boundary in [06](../redesign/06-era-content.md): `src/content/triassic/` for the
pack, `src/sim/triassic/` for the rules behind the `RULES?.` hooks, `/triassic/` as the entry
(`src/triassic/main.tsx` selecting the era before importing the app), `public/assets/triassic/`
for the assets, `tools/triassic/` for the builders and checks, and `docs/triassic/` (this
directory) for the era's own documents. Three things the Triassic needs that the shared engine
does not yet have are called out in [01](01-triassic-design.md#what-the-engine-needs): a breath
meter for obligate air-breathers, a per-biome sea-floor depth, and a shore that can hold an
animal that strikes into the water.

## Open decisions

Three things the documents could not settle and the user should:

1. **Helicoprion.** It has no Triassic record (Permian only; see [research.md](research.md#corrections-that-changed-the-design)).
   It is on the roster as asked, designed to ship as a **labelled relict**; the honest Triassic
   alternative, *Fadenia*, takes the same kit. [01 · T05](01-triassic-design.md#t05--helicoprion--the-whorl-a-relict-by-choice).
2. **The Tripo account**: whether its plan permits commercial use of the output, and whether
   multi-view input is available. [04](04-tripo-pipeline.md#what-tripo-is-asked-for-and-what-it-is-not).
3. **A dinosaur on the shore.** Tanystropheus, the animal the "necks that reach in" idea is built
   on, is not a dinosaur. A *Coelophysis* at the estuary is listed as an optional shore animal if
   one is wanted. [01 · The shore animals](01-triassic-design.md#the-shore-animals).

## Resume point

Written in one session on 12 September 2026 and complete as a proposal: all five documents are
in, and the research behind them is compiled in `research.md` from four parallel literature
searches (sauropterygians and placodonts; ichthyosaurs; other reptiles and amphibians; fish,
invertebrates and environments), every subject with sources and confidence labels. The next
step is not more writing: it is the answers to the three decisions above, then the reference
boards (A1 in [03](03-image-and-model-requests.md)) and the four pipeline-proving generations
named at the end of that document.
