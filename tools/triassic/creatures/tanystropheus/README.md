# Tanystropheus — Tripo source checkpoint

This directory preserves the initial, unmodified Tripo body generated from the human-approved
`candidate05` canonical and its matching single-model input. It is a source checkpoint for later
anatomical cleanup, rigging, procedural-twin construction and animation; it is not registered as a
shipped model and its preview warning remains.

| Artifact | Result |
| --- | --- |
| Tripo task | `aa7cb744-2664-426b-9e1e-a21ff6e96ec8` |
| Credits recorded by task | 30 |
| Raw body | 1,590,656 bytes; 19,588 triangles |
| Raw SHA-256 | `b4ca21e0cfaec7f6ed3c332cb57162658a977c49833b5c44812cbf0cb4853af2` |
| Static preview | 1,472,892 bytes; 19,588 triangles |
| Preview SHA-256 | `540dd697ad385f628ee5f30f4fcc8741bad4cf3c9e131395db1f652e4aa90532` |

The raw model preserves the canonical's extraordinary neck length, compact torso, four limbs and
complete tail. Its embedded PBR set contains 2048² colour, normal and ORM textures. Static Blender
review also found 143 connected components and one conspicuous detached, thin textured island beside
the neck in top and three-quarter views. The future authored-model pass must identify and remove or
reattach loose islands, inspect the small head and feet, build any required mouth interior, and plan
the long cervical rig. Preserve this raw file unchanged as provenance.

Review evidence is in `tripo-raw/review/`: `audit.json`, `side.png`, `top.png`, and
`three-quarter.png`. `tanystropheus.preview.glb` is a static texture-preserving inspection copy. The
processing step changed no approval, shipped registry, viewer badge, rig or animation state.
