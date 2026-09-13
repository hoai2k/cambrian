# Tripo v3 image-to-model runner

This small Node.js runner uploads one approved image to Tripo's v3 API, submits one image-to-model
task, polls it for a bounded period, and downloads the unmodified binary GLB plus sanitized metadata.
It reads the API key only from `TRIPO_API_KEY` and never prints the key or signed download URLs.

Run without `--submit` first. This validates the input and request without needing a key or making
any network request:

```sh
node tools/triassic/tripo/run-image-to-model.mjs \
  --name nothosaurus \
  --image docs/triassic/canonical/model-inputs/nothosaurus/input.png \
  --out local/triassic-authoring/nothosaurus/tripo
```

Add `--submit` only when spending credits is intended:

```sh
TRIPO_API_KEY='tsk_...' node tools/triassic/tripo/run-image-to-model.mjs \
  --name nothosaurus \
  --image docs/triassic/canonical/model-inputs/nothosaurus/input.png \
  --out local/triassic-authoring/nothosaurus/tripo \
  --submit
```

Use the same shape for `shonisaurus`. The default model is `v3.1-20260211`, with texture and PBR
enabled and a 20,000-face ceiling. Override the model or face ceiling with `--model` and
`--face-limit`.

`state.json` is written after upload and immediately after task creation. A rerun with the same
image, options, and output directory resumes that task, including after a polling timeout; it does
not submit another generation. A changed input or request is rejected in that directory. The final
files are `NAME.raw.glb`, `metadata.json`, and `state.json`. Metadata excludes expiring signed URLs.

The runner targets the official v3 global endpoints: `POST /files`,
`POST /generation/image-to-model`, and `GET /tasks/{task_id}` under
`https://openapi.tripo3d.ai/v3`. Tripo's official SDK documentation notes that result URLs expire
within minutes, so successful results are downloaded immediately.

## Static model review

After a raw GLB lands, audit and render it with Blender without changing the raw file:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 \
  --python tools/triassic/tripo/review.py -- \
  --input local/triassic-authoring/nothosaurus/tripo/nothosaurus.raw.glb \
  --out local/triassic-authoring/nothosaurus/tripo/review \
  --preview local/triassic-authoring/nothosaurus/tripo/nothosaurus.preview.glb
```

The review writes `audit.json` plus `side.png`, `top.png`, and `three-quarter.png`. The audit
records triangles, materials, used image textures, world-space bounds, and connected mesh
components. When `--preview` is present it exports a separate texture-preserving GLB capped at
40,000 triangles. The imported raw GLB is only read and hashed.
