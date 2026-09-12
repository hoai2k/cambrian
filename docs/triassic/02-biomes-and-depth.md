# 02 · Biomes, water depth, and the props each one needs

**Status:** proposed, 12 September 2026. The nine biome slots of the shared terrain algorithm
(`src/sim/world.ts`, banded by distance from the one shoreline) are recast for the Triassic the
way `src/content/devonian/environment.ts` recast them for the Devonian, so no structural change
is needed to *place* the era. What is new, and needs engine work, is the **depth profile**: the
sea floor sinks by biome, so the basin is a genuinely deep column and the flats are a place a
giant physically cannot enter. Sources for the environments are in [research.md](research.md#environments).

## The look of the sea

The Triassic is the hot, dry aftermath of the end-Permian. Its shore is **red**: Keuper and
Buntsandstein red beds, gypsum flats, a dusty pale sky, conifers and horsetails at the waterline
and nothing green further up. Its water runs from milky turquoise over the carbonate platform to
a clear blue over the reef to near-black in the intraplatform basins where the bottom is anoxic
and nothing lives on it. Between those, the first modern-looking reefs: scleractinian corals and
calcareous sponges in bushes and mounds rather than the Devonian's stromatoporoid slabs. Overhead,
in the deep, **log rafts**: drift trunks with crinoid colonies hanging beneath them, the one piece
of floor life the basin has, floating. And every player animal, save the fishes and shells, must
come up through the surface to breathe, so the surface is where the era is played and where its
light is: the light window is a place, not a backdrop.

Localities are mixed across the period, as the earlier eras mix theirs, and each biome names the
place it is drawn from. Early Triassic (Spitsbergen, Chaohu), Middle Triassic (Monte San Giorgio,
the Muschelkalk sea, the Dolomites, Luoping and Panxian) and Late Triassic (Guanling, the Keuper
lagoons, the Dachstein reefs, Nevada's Luning Formation) do not coexist; the biome banner says
which each is.

## The nine slots

Shore distance `s` is the world's own measure (`shoreDistance`). Danger is on the shared scale
the music, HUD and ambient size read. Depth is the **target water depth** in world units, the
distance from the surface to the sea floor's mean level in that biome, which is the new field
(see *Depth*, below). The Devonian column is 64 deep everywhere but the shore; this one runs from
8 to about 96.

| Slot | Triassic biome | Drawn from | `s` (approx.) | Danger | Depth | Character |
| --- | --- | --- | --- | --- | --- | --- |
| `shallows` | **Gypsum Flats** | Gipskeuper lagoons, Late Triassic Germany (Henodus' home) | 0–130 | 0.08 | 8–12 | Hypersaline, hot, blinding. Salt crusts, microbial domes, almost no plants. Too shallow for anything over rung III. |
| `nursery` | **Conifer Shore** | Grès à Voltzia and Muschelkalk margins, Middle Triassic | pockets to ~90 | 0.05 | 10–16 | Estuary mouths under Voltzia and horsetail stands; brackish, silty, thick with cover. Where live-bearers calve and egg-layers haul out. The shore animals stand here. |
| `shelf` | **Dasyclad Lagoon** | Wetterstein / Latemar platform interior, Middle Triassic Dolomites | 130–660 | 0.35 | 22–30 | Milky turquoise platform water over meadows of *Diplopora* algae and shell sand. The default open lagoon. |
| `forest` | **Sea-Lily Garden** | Trochitenkalk, Muschelkalk sea | mosaic | 0.42 | 26–34 | *Encrinus* meadows, stems a body-length tall, columnals carpeting the floor. Cover for the middle rungs; a placodont's larder beneath. |
| `boulders` | **Sponge-Coral Reef** | Wetterstein and Dachstein reefs, Middle–Late Triassic Alps | mosaic | 0.50 | 16–28 | Bushes of *Thecosmilia*, calcisponge mounds, *Tubiphytes* crusts; the reef crests rise to within eight units of the surface. Chambers, overhangs, the one place the floor comes up to meet the air-breathers. |
| `flats` | **Shell Pavement** | Daonella / Halobia beds; Muschelkalk *Placunopsis* mounds | inshore mosaic | 0.30 | 28–36 | Flat, bright, a floor of flat-clam shells and ceratite drift. Nothing to hide in; everything to crush. Placodus territory. |
| `channel` | **Margin Channels** | Latemar / Marmolada platform margin, tidal passes | 200 on | 0.70 | 40–52 | Tidal cuts through the platform edge, current-swept, breccia blocks, dark water. The commute between the lagoon and the deep. |
| `escarpment` | **Reef Front** | Dachstein reef slope; Guanling basin margin | ~700 | 0.80 | 30 → 70 | The wall. Reef talus sliding into the dark, log rafts drifting overhead, and the giants' first appearance. |
| `basin` | **Black Basin** | Besano / Monte San Giorgio; Fossil Hill, Nevada | 760 on | 0.92 | 80–96 | An intraplatform basin with an anoxic floor: laminated black mud, no floor life at all, ash beds. Everything that lives here lives in the water column and breathes at the top. |

Blended per point exactly as danger is, so the transitions read as slopes and not steps.

### What the depths do

- **Breath is the era's clock** ([01 · Breath](01-triassic-design.md#breath)). A dive to the
  floor of the basin and back costs a rung III animal most of a breath; a dive to the flats costs
  nothing. Depth is how the world prices the map.
- **Big bodies need water.** A body cannot enter water shallower than about its own height plus
  clearance (the existing `clearance` field in body lengths). At 8–12 the Gypsum Flats exclude
  rungs III and IV outright, which makes the flats a sanctuary for the small at the price of heat
  and salt (a slow stamina drain there for anything but Henodus and the shells). At 16 the Conifer
  Shore admits a nothosaur but not an ichthyosaur, which is what puts the calving shallows in the
  amphibious animals' hands.
- **The floor feeders have a ceiling.** Placodus, Henodus, Odontochelys and Atopodentatus feed
  on and near the bottom, and cannot hold their breath long enough to work a floor 50 deep. Their
  range is the platform; the deep is where they are prey.
- **The basin has no floor to hide on.** Below a threshold the water is dead (the Devonian's
  anoxia hook, `RULES.anoxia`, reused): the bottom twenty units of the Black Basin drain stamina
  and are entered only to escape. The basin's cover is overhead, in the log rafts.

### Depth: the engine change

`sampleHeight` in `src/sim/world.ts` undulates the floor around zero and climbs it to the
waterline in the last 48 units of shore; channels carve seven, the escarpment drops thirteen. The
Triassic needs the same function to take a **per-biome floor depth** from the era:

```
environment.floorDepth: Record<Biome, number>   // target depth below the surface, world units
```

blended by `biomeWeights` (so a point that is 60 % reef and 40 % lagoon sits at the weighted
depth), with the undulation, the channel carve and the reef-crest rise laid over that mean. The
shore climb stays as it is. With `surfaceY` at 96 the Cambrian and Devonian are unchanged (they
leave `floorDepth` out and get the flat column they have), and `tools/world-test.ts` grows the
assertions that (a) the floor never reaches the surface except at the shore, (b) the depth at a
point equals the weighted target within the undulation band, and (c) every biome's depth admits
the largest body the population table puts there. Reef crests are the one thing that rises *toward*
the surface off the shore, and they need their own noise term so a crest is a ridge a player can
follow, not a bump.

Two things follow that the earlier eras did not have to think about:

- **Rise rate scales with depth** already (`RISE_RATE` is proportional to `SURFACE_Y`); a 96
  column makes every animal climb 1.5× faster than in the Devonian in absolute terms, which is
  right for a sea of air-breathers and wrong for a placodont. The per-creature rise rate the breath
  mechanic wants is in [01](01-triassic-design.md#breath).
- **The light window** (`LIGHT_WINDOW_Y`, nine below the surface) is where the era plays, so the
  surface needs its own presentation budget: a visible underside with refracted sky, blow spray,
  drift logs and floating shells, and a surfaced camera that reads as *out*, not clipped.

## Atmosphere per biome

Colour keys for `ATMOS` in the same fields the Devonian uses (fog, density, sky, sun, sand). The
flats are the brightest water in any era; the basin the darkest.

| Biome | Fog | Density | Sky | Sun | Sand |
| --- | --- | --- | --- | --- | --- |
| Gypsum Flats | `#5fbfb0` (milk-turquoise) | 0.70 | 2.6 | 4.0 | `#e9e2cf` (salt white) |
| Conifer Shore | `#6a7f55` (silt olive) | 1.20 | 1.5 | 2.6 | `#a8785a` (red-brown mud) |
| Dasyclad Lagoon | `#3aa39a` | 0.85 | 2.2 | 3.6 | `#dcd3b3` |
| Sea-Lily Garden | `#2d8a86` | 0.95 | 1.9 | 3.2 | `#c9bfa2` |
| Sponge-Coral Reef | `#2b7f8e` | 0.90 | 2.0 | 3.4 | `#cfc4a8` |
| Shell Pavement | `#46a8a0` | 0.80 | 2.3 | 3.8 | `#e0d9c0` |
| Margin Channels | `#124a5a` | 1.15 | 1.3 | 2.3 | `#8b8f86` |
| Reef Front | `#0d3b4c` | 1.25 | 1.1 | 1.9 | `#6f7570` |
| Black Basin | `#04121c` | 1.60 | 0.6 | 1.1 | `#2b3136` (black mud) |

## Props and plants: the models each biome needs

Each is a `FloraKind` or rock slot in the density table, instanced by the thousand, so the
in-house rules apply: one mesh, base pivot, vertex colours, a few hundred triangles, no
hierarchy, authored at the scale-1 size given. Tier marks who makes it
([03](03-image-and-model-requests.md)): **T2** in-house builder, **T1** Tripo (only the few
whose value is an organic surface, used sparsely). Where a Devonian prop already fits, it is
reused and said so; nothing Cambrian is reused because nothing in the Triassic looks like it.

### Floor plants and sessile animals (instanced)

| Id | Model | Scale-1 size | Biomes | Notes |
| --- | --- | --- | --- | --- |
| `encrinus` | **T2** *Encrinus liliiformis* sea lily: a segmented stem, a ten-armed crown that opens and closes in the shader | 1.2 tall | garden (30), lagoon (2), reef (1) | The era's crinoid. The Devonian `stalked-crinoid` is the wrong genus and the wrong crown; new build, same rules. |
| `encrinus-litter` | **T2** a patch of loose columnals and stem lengths | 0.6 wide | garden (8), pavement (3) | Ground decal-mesh; where the moulted and the dead lie. |
| `diplopora` | **T2** *Diplopora* dasyclad algae: a tuft of fine calcified whorled stalks | 0.4 tall | lagoon (24), flats (4), shore (3) | The lagoon's meadow. Sways. |
| `thecosmilia` | **T2** *Thecosmilia* branching coral bush, phaceloid: a fan of parallel tubes | 1.0 | reef (10), front (4), channel (1) | Three variants by size. |
| `coral-head` | **T1** a massive scleractinian head with a real surface | 2.5 | reef (1.5), front (0.8) | Sparse; the reef's landmarks. |
| `calcisponge` | **T2** calcareous sponge column (*Colospongia*-like), stacked chambers | 0.8 | reef (8), front (3) | Two variants. |
| `sponge-mound` | **T1** a *Tubiphytes* / sponge crust mound with chambers a small body can enter | 3.0 | reef (0.6), front (0.4) | Cover for rung I; a collider with an interior. |
| `stromatolite` | **T2** a microbial dome, layered | 0.7 | flats (6), shore (1) | Post-extinction stromatolites; the flats' only structure. |
| `salt-crust` | **T2** gypsum crust plate, curled at the edges | 1.0 wide | flats (5) | Flat decal-mesh. |
| `placunopsis-mound` | **T2** a low bivalve bioherm, shells stacked | 1.4 | pavement (2), lagoon (0.5) | Crushable food for placodonts (see [01](01-triassic-design.md)). |
| `daonella-bed` | **T2** a slab of flat-clam shells, overlapping | 1.2 wide | pavement (14), lagoon (2) | The pavement itself; three orientations. |
| `ceratite-drift` | **T2** an empty *Ceratites* shell, ribbed, half-buried | 0.5 | pavement (3), lagoon (1), front (0.5) | Dead shell prop; the same mesh the live Ceratites wears, unlit. |
| `brachiopod-cluster` | **T2** *Coenothyris* cluster | 0.3 | garden (3), pavement (2) | Small food. |
| `cidaris` | **T2** a *Cidaris* urchin with club spines | 0.3 | reef (2), garden (1) | Hazard-shaped, harmless. |
| `reef-block` | **T2** platform-margin breccia block, angular | 2–4 | channel (3), front (4) | The rock slot; four variants. |
| `mud-ripple` | **T2** laminated black-mud floor plate | 2.0 | basin (2) | The basin's only floor prop, with an ash band. |

### Standing and floating (the water column and the surface)

| Id | Model | Scale-1 size | Biomes | Notes |
| --- | --- | --- | --- | --- |
| `log-raft` | **T1** a drift trunk at the surface with a *Traumatocrinus* colony hanging beneath it, stems to eight units | 12 long | front (0.05), basin (0.08) | The era's hero prop and the basin's only cover, at the surface, where the air is. Floats, drifts on the current, and can be gripped (`cling`). |
| `drift-log` | **T2** a bare drift trunk at the surface | 6 | shore (2), lagoon (0.3), basin (0.2) | Reuse the Devonian `submerged-log` mesh re-pivoted to float. |
| `ash-fall` | particle, not a mesh | — | basin | A slow fall of grey ash in the basin water, the volcanic beds of the Besano shale. |
| `bloom` | existing plankton bloom | — | lagoon, front | The Devonian bloom reused; Hupehsuchus and the giants feed in it. |

### The shore (seen from the water, walked by the shore animals)

The shore strip is the last 48 units, above the waterline. Nothing here is instanced by the
thousand, and the shore animals stand among these.

| Id | Model | Scale-1 size | Notes |
| --- | --- | --- | --- |
| `voltzia` | **T1** *Voltzia* conifer, a scale-leaved shore tree | 9 tall | The tree-line. Three by size. |
| `neocalamites` | **T2** *Neocalamites* horsetail stand, jointed stems in a clump | 3 tall | The estuary's reeds; replaces the Devonian *Rhynia*. |
| `pleuromeia` | **T2** *Pleuromeia* lycopsid: one unbranched trunk, a crown of strap leaves, a cone | 2 tall | Early Triassic; the recovery flora. Sparse, odd, unmistakable. |
| `bjuvia` | **T2** a cycad rosette | 1.5 | Sparse, on the drier ground. |
| `red-bed` | terrain colour, not a mesh | — | The beach is red mudstone and gypsum; `sandColors` for the shore slots carry it. |
| `shore-boulder` | **T2** red sandstone block | 1–3 | The rock slot above the waterline. |

Densities in brackets are plants per 144 square units, on the Devonian table's scale, to be
tuned in `FLORA_DENSITY`. Anything with an interior (`sponge-mound`, `reef-block`) needs a
measured footprint in `src/content/prop-shapes.json` from `npm run shapes` before it can be
collided with, and `npm run props` audits it.

## Population by biome

`src/sim/population.ts` gives each 210-unit area a size profile bent by the biome. The Triassic
bend, in words: hatchlings and calves inshore (Conifer Shore, Gypsum Flats), the floor feeders and
the small hunters on the platform (lagoon, garden, pavement), the middle hunters on the reef and
in the channels, and the giants over the front and in the basin, where `PASSER_BY` sends a
Shonisaurus pod through the upper water and a Cymbospondylus below it. The flats and the shore are
the only areas whose profile is capped by depth rather than by danger: nothing spawns there that
cannot float there.
