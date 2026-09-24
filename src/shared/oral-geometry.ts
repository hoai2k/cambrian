import greenlit from './oral-greenlit.json' with { type: 'json' };

/**
 * The geometry a builder adds *inside* a mouth, and how to recognise it.
 *
 * A Tripo generation arrives with a mouth that is a hole: open the jaw and the gape shows straight
 * through the head. The era's answer was authored geometry closing it — a palate on the skull, a
 * floor on the jaw, tissue seated at the hinge, and a beak where an animal has one.
 *
 * It is **off in the game** and off by default in the viewer. The first form of it was a single sac
 * whose wall stretched between the jaws, and it read as gum filling the mouth; the replacement is
 * being built and until it is judged, no mouthful of gum ships. Nothing depends on it being drawn:
 * the simulation reaches a mouth through `anchor_mouth`/`anchor_mouth_inside`, which are bones, so
 * hiding this geometry changes what is seen and nothing else.
 *
 * Matched on the mesh's name and its materials', because every builder in the era spells them the
 * same way — `Oral_cavity_lining`, `Mouth_lining`, `Seated_jaw_hinge_tissue`, and the
 * `<Animal> mouth interior` / `<Animal> mouth lining` materials.
 */
export const ORAL_GEOMETRY = /lining|mouth[ _]interior|hinge[ _]tissue|beak|palate/i;

/** True when a mesh's own name, or any of its materials' names, marks it as mouth geometry. */
export const isOralGeometryNamed = (meshName: string, materialNames: readonly (string | undefined)[]): boolean =>
  ORAL_GEOMETRY.test(meshName) || materialNames.some((n) => !!n && ORAL_GEOMETRY.test(n));

/**
 * The creatures whose mouth geometry a human has **greenlit**, and which the game therefore draws.
 *
 * Hiding used to be roster-wide, which was right while the whole construction was under review and
 * wrong the moment any one body passed it: a verdict is reached per animal, on that animal's own
 * mouth, so the state has to be per animal too. The list is the record of those decisions and the
 * only thing that has to change when the next body is judged.
 *
 * It lives in a JSON file rather than here because three languages have to agree about it. The
 * runtime reads it through this module, `hidden-parts.mjs` imports it, and `gape-solid.py` and
 * `mouth-space.py` load it — and those last two are the tools that answer *what does a player
 * see*. A tool that hides what the game draws is not measuring the game, which is the whole reason
 * `--as-drawn` exists; a greenlist only one side of that knew about would put the proof back where
 * it started.
 */
export const ORAL_GREENLIT: ReadonlySet<string> = new Set(greenlit.greenlit.map((g) => g.id));

/** Whether this creature's mouth geometry is drawn. Everything not greenlit is still hidden. */
export const drawsOralGeometry = (creatureId: string): boolean => ORAL_GREENLIT.has(creatureId);
