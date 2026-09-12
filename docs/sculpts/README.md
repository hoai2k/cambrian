# Sculpt files awaiting a port

User-authored sculpts exported from the viewer's sculpt mode (`docs/viewer-sculpt.md`). Each is a
target for its creature's builder: port it into the profile rows, rebuild, and check the candidate
with `npm run sculpt:measure -- <candidate.glb> docs/sculpts/<id>-sculpt.json` (deviation within
±3% at the changed stations, ±1% elsewhere). A file leaves this directory in the commit that ships
its port, with the port recorded in the creature's README.

| File | Asks for | Status |
| --- | --- | --- |
| `gemuendina-sculpt.json` | head dome lowered 14–17% over stations 15–19, nose thinner in height and 21% wider, nose shifted +0.08 | port in progress (`face-v4/candidate_06.py`) |
| `titanichthys-sculpt.json` | snout longer (+0.23 at the nose, +0.14 behind it), narrower (nose width −78%, fore body −13%/−7%), lower | port in progress (`sculpt-port/`) |
| `dunkleosteus-sculpt.json` | crown raised +3/+13/+25% over stations 16–18, nose lowered 12.5%, small shifts, two pulled tangents | port in progress (`build_v3.py`) |
