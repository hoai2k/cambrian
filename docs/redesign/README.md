# Cambrian redesign

A plan to turn the current arena demo into a hunt / grow / fight / escape game
set in a Burgess Shale sea, reusing all existing creature models, animations
and the procedural environment.

| Doc | Contents |
| --- | --- |
| [00 · Current state](00-current-state.md) | What is actually in the repo, what the assets can do, and what is wrong with the shipped gameplay. |
| [01 · Game design](01-game-design.md) | Pitch, pillars, core loop, the size rule, growth, movement, combat verbs, every creature's powers, hunting, hiding from giants, world, modes, local multiplayer, HUD, onboarding. |
| [02 · Technical plan](02-technical-plan.md) | Architecture, simulation and combat data model, AI tiers, world streaming, rendering and LOD, input bindings, animation strategy without new art, milestones, testing, risks. |

Start with the design doc if you want the game; start with the technical plan
if you want to build it. The audit is the shared set of facts both rely on.

## Implementation status

The game is implemented in `src/` (see the repository README for layout).
Compared with the milestones in the technical plan, M0–M3 are complete, M4–M7
are implemented in a first pass (ecosystem, giants and detection, abilities,
all four modes, split-screen and drop-in), and M8 polish is ongoing: new
animation clips have not been authored yet, so the combat verbs run on the
nine shipped clips plus the procedural layers described in the plan. Two
headless checks exist: `tools/harness.ts` (balance) and `tools/smoke.mjs`
(browser). The art requested for the shell — logo, icons, key art, transparent creature
portraits, tier and band glyphs, mode panels — has been delivered and integrated; the briefs
and their asset paths are in `image-requests-history.md`, and `image-requests.md` is where new
requests go.
