# Original cuticle bitmap provenance

Created with the built-in imagegen skill/tool on 2026-09-07 for this creature alone. Original preserved as `imagegen-cuticle-source.png`; engine/runtime has no dependency on the generating service.

Original location: `/Users/hoai/.codex/generated_images/01a0794c-58af-7450-b605-70b764aae915/exec-9db4259a-3498-4fd7-86e3-c8437ca8711b.png`.

Prompt:

> Create one production-quality seamless square PBR BASE COLOR texture bitmap, 2048x2048 if possible, for a living Devonian trilobite Eldredgeops cuticle. This is a flat unlit evenly exposed material swatch filling the entire image, not a creature picture, no objects, no framing, no text, no highlights or directional shadow. Natural smooth calcified marine arthropod cuticle: rich muted olive-brown / warm umber ground, scattered softly edged dark sepia and dusky olive mottled patches at medium scale, fine sparse cream/tan pinpoint stippling and restrained tiny irregular pigment freckles. A sophisticated organic surface with relatively smooth large regions; modest saturation, moderate midtone brightness so silhouette highlights remain readable in underwater game lighting. The pigmentation should feel like living cuticle, not fossil rock, stone, sandpaper, corrosion, scales, large cracks, geometric patterns, metal, dirt or a photograph of shell fragments. Do not draw anatomical segments/ribs, eyes or limbs; actual geometry supplies those. Colour variation, not baked relief. Tile seamlessly at all borders.

The returned square image was inspected: coherent mottled colour and small pigment speckles, without anatomy or baked hard relief. `materials.py` tempers saturation and contrast, gives the genae and lateral pleurae gentle regional pigmentation and produces restrained micro-normal/roughness maps. Anatomical tubercles, furrows, plates and lenses are geometry. Pigment interpretation is not fossil colour evidence. Full GLB uses UV textures with white vertex colour. Textureless LOD receives linear-light baked pigment. No reference photograph or museum mesh is incorporated into the model or its textures.
