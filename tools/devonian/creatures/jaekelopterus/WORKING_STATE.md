# Jaekelopterus — COMPLETE INITIAL PREVIEW HANDOFF

All seven candidate files are frozen in `../devonian-authoring/jaekelopterus/initial-candidate/`. `delivery.json` binds source, models, portraits and reports to exact hashes. No public/shared/git edits. Source/model is frozen; parent owns packaging, viewer, preview label and main commit.

- jaekelopterus.card.png: `0b73788376eee940757d9c28fb7a3d1912829166c58a67de22042d01b27084f3` (135085 bytes).
- jaekelopterus.glb: `28b6181d6ad13644c5256fc316b5022de45039f2c1ce4d3d44fb0a896de123fb` (13932372 bytes).
- jaekelopterus.json: `e003797856ee2330a509ac6bd319d7bac4d45ca922a46fd925ccd1c06181e636` (1976 bytes).
- jaekelopterus.lod1.glb: `c623f3bef04d51bfab96fa8b783b8e8d9aa85f72f0fa908a1d89947e9f420b8a` (2042088 bytes).
- jaekelopterus.png: `6a3f097781ffe96b51197d965d4a1f027b15b4f13d9376e8ae60ba7dc6e0f366` (367280 bytes).
- jaekelopterus.select.png: `14ebb73e02cee4526dd0421a1e7e0042cd00ac5b8ff2e14842959cd3171b676f` (864548 bytes).
- jaekelopterus.thumb.png: `f2cb5750995556ce62508bf0cf1c2c31a302b6807a33b2ab2200d60483aa6a93` (23319 bytes).

Original Blender: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/jaekelopterus/jaekelopterus-initial.blend`, SHA `c07fd8dcde21275bf3ca7f50110585e710e4f15f8cc9616fbb9e404f6a073a17`.

PASS: exact shared structural intake (only input/output paths redirected); 55-joint matching full/LOD graph; five sockets; 20 full clips; Idle/Swim/Crawl/Death LOD; 159421/42692 triangles (26.779%); zero LOD textures, baked vertex pigment. Actual closed-envelope full/LOD eye-volume tests ~77%, no audit caps. Actual Three playback all 20 clips, no runtime/transform/root errors. Matching four portraits, basic Blender lateral/eye/lit oral and LOD Idle/Crawl/Death inspected.

Later refinement (deferred under user priority): finer compound-eye optics, more podomere-level gait articulation, cuticle material readability in broad light, more detailed soft oral microanatomy. Anatomy/colour/motion uncertainties are explicit in README. No unaddressed minimum-eye/export validity failure.

Reproduce with README commands; `portraits.py` derives UI images from the hash-bound full-resolution GLB cutout; `check-candidate.mjs jaekelopterus` followed by `delivery.py` verifies final handoff. All render jobs are complete. No existing V1 had to be replaced.
