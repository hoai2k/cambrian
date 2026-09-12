# Material-03 decision and local animation candidate

Astra independently inspected the actual material-oblique.png and
material-cranial.png. Parent and creative owner accept this finish for the
animated local candidate. This is not final creature approval.

- Packed material blend SHA: `810031c3e18a2f9bc5ea820007a460aebdd7e8fdf7c96879ef398a16ab080ada`.
- Material report SHA: `7d2c95d40e8e930827c4bdb079bb279a6076adc57b4c32c476e3f8a4679c6691`.
- Oblique image SHA: `31467ba83416f29a01665626245ca0014483c4d3f3791651e9879caefce4456d`.
- Cranial image SHA: `5dc69dd11280912ce9767160cb7a950f99ce2adbcece08d1fa80b05e82af6a49`.

The richer olive/ochre irregular tesserae and granular pigmentation now give the
raised core a distinct organic surface. Dorsal detail transitions to quieter
fins, and the reviewed continuous cheek/core contours remain legible. The small
cells do not read as large turtle/crocodile plates. Exact living pigment and
fine armour arrangement remain explicit reconstruction choices.

The exposed glossy eye globes still read as beads. This remains a correction
and containment audit item after the complete rigged rework; a material pass
cannot clear it. Mouth deformation, branchial flex and deformed fin/tail
continuity need actual exported-animation review before any final assessment.

## Anatomical rig decisions

The 28-bone skeleton has seven sequential axial tail controls. Swimming uses a
travelling tail wave; pectoral bases and margins supply restrained, delayed trim.
Turns combine body yaw/bank, tail curvature and asymmetric fin/pelvic steering.
Dive/rise combine pitch, local lift and delayed tail/fin compensation. Strike
motions have preparation, upward oral reach, and recovery; Heavy has a larger
reach than Attack. Jaw, throat and small distributed branchial controls deform
the same continuous cranial envelope. Small attached lower oral denticles use
their host oral vertex weights, with count/spacing explicitly illustrative.
No blade dentition or added external fin anatomy is introduced.

All 18 exact compatibility labels are authored: Idle, Swim, TurnLeft, TurnRight,
Dive, Rise, Attack, Bite, Heavy, Hit, Death, Guard, Parry, Dodge, Eat, Stagger,
Ability, Growth. Idle/Swim/Guard/Eat loop. Other clips recover to their starting
pose except Death, which holds a terminal roll. All root transforms stay fixed;
there are no animated bone scales. Action names imply no gameplay rule changes.

Full and reduced exports share the same skeleton and versioned nested anchors:
anchor_mouth and anchor_attack_primary under jaw; anchor_mouth_inside under
throat. The LOD retains Idle/Swim/Death. Full uses baked UV albedo/normal/roughness
and white vertex multipliers; LOD uses baked linear vertex pigment with white
material factors and no textures. Both use matching body/eyes/accent runtime
palette slots. The continuous body atlas retains the anatomical fin/ventral
luminance variation within the body slot; independent fin/underside palette
slots are not introduced in this candidate. Actual default-palette appearance
must be reviewed in the existing game shader, separately from these structural
compatibility checks.

AST and pure pose checks pass: all 18 are finite and dynamic with an invariant
root. Earlier full-mesh weight validation passed on 89,098 vertices with at most
four normalized influences. Blender deformation and export are not yet run.
