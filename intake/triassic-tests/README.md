# Initial Tripo tests

These are **raw static test meshes**, preserved for review and follow-on Blender work. They are not final game specimens and have no authored skeleton, anchor contract, or animation clips. Runtime stand-ins and preview flags remain unchanged.

| Creature | API task | Triangles | GLB | API credits |
| --- | --- | ---: | ---: | ---: |
| Nothosaurus giganteus | ea4528e3-1f9a-42f4-b0c4-2b84b879ff7c | 19,250 | 1,541,680 bytes | 30 |
| Shonisaurus popularis | 96200215-8896-4447-8891-e4991a2b23f8 | 18,992 | 1,335,372 bytes | 30 |

Each folder contains the untouched GLB, sanitized API metadata with source hashes, and Blender review renders/audit. Both use Tripo v3.1 with texture/PBR enabled and a 20,000-face target. Each has three embedded 2048×2048 textures and one material. Inputs were derived from the human-greenlit canonicals; see `docs/triassic/canonical/model-inputs/`.

## Follow-on priorities

- Nothosaurus: inspect/correct webbing and toe interpretation; preserve the canonical paddle-like webbed feet. Check tail/body proportions in orthographic views.
- Shonisaurus: remove the small hanging chin artifact, review head/body proportions against the canonical, and separate/rig jaw without losing the mouth interior.
- Both: normalize engine orientation and scale, clean disconnected islands (audit reports 79 and 57 components, including details), inspect underside, then rig, animate, establish anchors, and run the final anatomy/eye/animation audits. These generated surfaces are not assumed watertight or animation-ready.

The prior Studio attempt is not one of these deliverables. API generation/export succeeded without a Studio subscription. Do not regenerate these tasks just to resume work; the complete raw output is already here.
