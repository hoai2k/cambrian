export type DevonianCreatureId =
  | 'dunkleosteus' | 'titanichthys' | 'coccosteus' | 'bothriolepis' | 'gemuendina' | 'doryaspis'
  | 'cladoselache' | 'stethacanthus' | 'cheirolepis' | 'rhinodipterus' | 'onychodus' | 'tiktaalik' | 'acanthostega'
  | 'eldredgeops' | 'walliserops' | 'jaekelopterus' | 'nahecaris' | 'furcaster' | 'palaeoisopus'
  | 'manticoceras' | 'michelinoceras';

/**
 * Devonian signature identities. None of these is implemented as a bespoke ability routine: the
 * era's mechanics (armour, air, shore reach, shells, moulting, shoaling) are driven by the flags
 * on the creature definition, and the heavy/block moves carry the rest as plain stats. The ids
 * exist so the selection card can name the identity and so a later routine has a hook.
 */
export type DevonianAbilityId =
  | 'jawShear' | 'filterGulp' | 'armourFlank' | 'shieldPush' | 'sandAmbush' | 'floorSweep'
  | 'runThrough' | 'brushDisplay' | 'shoalDart' | 'crushBite' | 'tuskLunge' | 'neckSnap' | 'limbHaul'
  | 'enrollD' | 'tridentShove' | 'cheliceraeGrab' | 'scavenge' | 'armSpread' | 'stiltWalk'
  | 'shellHover' | 'shellJet';
