/**
 * Every word the games say, in one place.
 *
 * WHY THIS FILE EXISTS. The copy used to live wherever it was drawn — a sentence in `Hud.tsx`, a
 * heading in `Overlays.tsx`, an onboarding hint halfway down `src/sim/game.ts` — so changing how
 * the game *talks* meant reading the code that draws it, and translating it meant finding every
 * one of them first. Now the components ask this table for a string and never spell one out, which
 * makes the messaging editable without touching a component and makes a second language a second
 * table rather than a second codebase.
 *
 * HOW IT IS SPLIT. Three layers, and the split is about *who the words belong to*:
 *
 *  - **this file**: everything the three games say alike — the shell, the HUD, the menus, the help
 *    page, the settings panel, the feedback form. One edit here changes all three.
 *  - **`src/content/<era>/strings.ts`**: what one game says for itself — its loading lines, its
 *    onboarding hints, the rungs of its own ladder, the help-page sentences that name its own
 *    animals. Each is a `StringOverrides` laid over this table by `src/shared/text.ts`, so an era
 *    says only what differs. (The title screen's tagline, its loading line and the results eyebrow
 *    stay on `copy` in that era's `index.ts`, beside its settings key and the links to the other
 *    games: the shell reads them before it reads anything else.)
 *  - **`src/ancientseas/strings.ts`**: the trilogy page, which is no game's and must not import
 *    one — the entry page reads `ACTIVE_ERA` nowhere and has to stay that way.
 *
 * HOW THE KEYS ARE NAMED. By *where the player sees the words*, never by what they mean: `pause.`,
 * `results.`, `hud.grip.`, `select.crew.`. Somebody editing a line should be able to find it from
 * having seen it on screen, and should be able to tell from the key alone what they are about to
 * change. A string used on two screens is named for neither and lives under `common`.
 *
 * VALUES ARE STRINGS OR FUNCTIONS. A line with a number or a name in it is a function of that
 * value rather than a string with a placeholder, so the argument is typed and a translator can move
 * it to wherever the sentence needs it. Button names are the exception and stay in
 * `src/shared/controls.ts`: they are the binding table — what the key *is*, not what the game
 * *says* — and `src/input/input.ts` and the diagrams read the same rows.
 *
 * Plain data, no imports: safe for the deterministic simulation and for Node tooling.
 */

/** Everything a game says. An era supplies a `StringOverrides` for the parts it says differently. */
export interface GameStrings {
  /** Words that turn up on more than one screen, and so belong to none of them. */
  readonly common: {
    readonly close: string;
    readonly cancel: string;
    readonly dismiss: string;
    /** The badge on anything this match has just added to the record. */
    readonly newTag: string;
    /** A seat's chip, on the pick screen's crew cards, the results cards and the scoreboard. */
    readonly playerChip: (seat: number) => string;
    readonly seafloor: string;
    readonly swimmer: string;
    /** Distances, as the HUD and the teleport menu write them. */
    readonly metres: (n: number) => string;
    readonly kilometres: (km: string) => string;
  };

  /** The title screen: PRESS START and the line under it. */
  readonly title: {
    readonly pressStart: string;
    /** Accessible name of the whole screen, which is one big button. */
    readonly screenLabel: string;
    /** The hint under PRESS START, with pads connected and without. */
    readonly padsConnected: (count: number) => string;
    readonly noPads: string;
    /** Over the trilogy link in the corner. */
    readonly trilogyEyebrow: string;
    readonly trilogyNavLabel: string;
  };

  /** The boot screen, and the progress line the title screen borrows from it. */
  readonly loading: {
    /** While a named creature is streaming in. */
    readonly wakingCreature: (name: string) => string;
    /** Before there is a name to show. */
    readonly waking: string;
    /**
     * The lines that rotate under the bar while the sea loads. Every era replaces these: they are
     * about that era's own animals, and the Cambrian's were being shown to Devonian players.
     */
    readonly facts: readonly string[];
  };

  /** The choose-your-creature screen. */
  readonly select: {
    readonly screenLabel: string;
    readonly rosterLabel: string;
    readonly modePickerLabel: string;
    /** After the mode's blurb: how to get to the other modes. */
    readonly modeSwitchHint: (prev: string, next: string) => string;
    /** The mark in the corner: back to this game's title, and the menu of the other games. */
    readonly backToTitle: (gameTitle: string) => string;
    readonly chooseGame: (gameTitle: string) => string;
    readonly gameMenuLabel: string;
    /** The two buttons that stand in the roster grid beside the animals. */
    readonly randomName: string;
    readonly randomTitle: string;
    readonly visitorsName: string;
    /**
     * Not "animals you have earned": two of the animals behind this button were earned by nobody —
     * they are standing guests from outside every roster. The label has to be true of both kinds.
     */
    readonly visitorsTitle: string;
    /** A crew card: the seat, its device, and what the animal comes with. */
    readonly crew: {
      readonly keyboard1: string;
      readonly keyboard2: string;
      /** The one seat a phone or a tablet has. There is one screen, so there is never a second. */
      readonly touch: string;
      readonly controller: (n: number) => string;
      readonly disconnected: string;
      readonly removePlayer: (seat: number) => string;
      readonly portraitAlt: (name: string) => string;
      /** Where the animal is from, when the era's own definition names nothing more exact. */
      readonly defaultLocality: string;
      readonly realSize: (cm: number) => string;
      readonly blockParry: string;
      readonly evade: string;
      readonly statSpeed: string;
      readonly statPower: string;
      readonly statArmor: string;
      readonly statAgility: string;
      /** The two lines under the kit: what this animal is good at, and what it is not. */
      readonly passiveMark: string;
      readonly weaknessMark: string;
      /** A visitor is not this game's animal and carries none of its record. */
      readonly visitorNote: (origin: string) => string;
      readonly lockIn: (confirmKey: string) => string;
      readonly lockedIn: (confirmKey: string) => string;
    };
    /** What this animal has grown into before, in Rise, and the offer to carry on from it. */
    readonly best: {
      readonly badge: string;
      readonly partGrown: (rungName: string) => string;
      readonly whole: (rungName: string) => string;
      readonly title: (modeName: string, rungName: string) => string;
      readonly partTitle: (modeName: string, nextRung: string, rungName: string, percent: number) => string;
      readonly continuing: (rungName: string, partGrown: boolean) => string;
      readonly starting: (rungName: string) => string;
    };
    /** The empty seat at the end of the crew. */
    readonly joinPad: (padButton: string) => string;
    readonly joinPadOrKeyboard: (padButton: string, keyboardButton: string) => string;
    readonly dive: (confirmKey: string) => string;
  };

  /** The pause menu, and the choices both in-game menus offer. */
  readonly pause: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly resume: string;
    readonly quit: string;
    /** The match recorder, which only exists behind `?debug=game`. */
    readonly startRecording: string;
    readonly endRecording: string;
    readonly exportRecording: string;
    readonly discardRecording: string;
  };

  /** The screen a match ends on. */
  readonly results: {
    readonly victory: string;
    readonly continue: string;
    readonly playAgain: string;
    readonly quit: string;
    /** Under a seat's card: what that player did with the match. */
    readonly tally: (eaten: number, kills: number, escapes: number) => string;
    readonly newBest: string;
  };

  /** The record of what this device has found, on the results screen. */
  readonly discoveries: {
    readonly eyebrow: string;
    readonly counts: (biomes: number, biomeTotal: number, landmarks: number, landmarkTotal: number, apex: number, rosterTotal: number) => string;
    /** A biome or a landmark that has not been found: a silhouette rather than a name. */
    readonly unfoundBiome: string;
    readonly unfoundLandmark: string;
    readonly unfoundLandmarkBlurb: string;
    readonly landmarkNames: { readonly arch: string; readonly stack: string; readonly bones: string };
    readonly landmarkBlurbs: { readonly arch: string; readonly stack: string; readonly bones: string };
    readonly apexReached: (name: string) => string;
    readonly apexNotYet: (name: string) => string;
    /**
     * What Apex is *for*. Only ever shown to somebody who has one — a line promising the reward to
     * a player with an empty strip spends the surprise for nothing — and it never names another
     * game, because which games there are, and how many, is a thing that changes.
     */
    readonly apexNote: {
      readonly star: string;
      /** Emphasised, then the sentence, then the button's own name, then the rest. */
      readonly unlocked: string;
      readonly body: string;
      readonly visitorsButton: string;
      readonly tail: string;
    };
  };

  /** The icon buttons in the corner. */
  readonly toolbar: {
    readonly label: string;
    readonly help: string;
    readonly soundOn: string;
    readonly soundOff: string;
    readonly settings: string;
    readonly fullscreen: string;
    readonly exitFullscreen: string;
  };

  /** The How to Play page, behind the ? button. */
  readonly help: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly bands: {
      readonly lead: string;
      readonly snack: string;
      readonly snackText: string;
      readonly prey: string;
      readonly preyText: string;
      readonly rival: string;
      readonly rivalText: string;
      readonly threat: string;
      readonly threatText: string;
      readonly giant: string;
      readonly giantText: string;
      readonly tail: string;
    };
    /**
     * The long prose. `**like this**` comes out emphasised, which is how the button names stand
     * out in a paragraph without the copy having to be split into fragments around them — and a
     * translator can move the emphasis, or add their own, without touching a component.
     */
    readonly huntingHeading: string;
    readonly hunting: (b: HelpButtons) => string;
    readonly seaHeading: string;
    readonly sea: (b: HelpButtons) => string;
    readonly fightingHeading: string;
    readonly fighting: (b: HelpButtons) => string;
    /**
     * A sentence each era adds to the section above it, naming its own animals and its own water.
     * The shared prose is about the *rules*, which are the same in all three games; the examples
     * are not, and a Devonian player was being told what Hallucigenia does. Empty says nothing.
     */
    readonly huntingEraNote: string;
    readonly seaEraNote: string;
    readonly fightingEraNote: string;
    readonly growingEraNote: string;
    readonly giantsHeading: string;
    readonly giants: (b: HelpButtons) => string;
    readonly growingHeading: string;
    readonly growing: (b: HelpButtons) => string;
    readonly padMenusHeading: string;
    readonly padMenus: string;
    readonly keyboardHeading: string;
    readonly keyboardPlayerOne: string;
    readonly keyboardPlayerTwo: string;
    readonly controllerHeading: string;
    readonly controller: string;
    readonly sharedKeyboard: string;
  };

  /** The settings panel. */
  readonly settings: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly detail: string;
    readonly detailNote: string;
    readonly qualityHigh: string;
    readonly qualityLow: string;
    readonly cameraSpeed: string;
    readonly cameraSpeedNote: (times: string) => string;
    readonly invertY: string;
    readonly volume: string;
    readonly volumeNote: (percent: number) => string;
    readonly music: string;
    readonly mute: string;
    readonly equivalentSizing: string;
    readonly equivalentSizingNote: string;
    readonly shoreAnimals: string;
    readonly shoreAnimalsNote: string;
    readonly footnote: string;
  };

  /** Everything drawn over the sea during a match. */
  readonly hud: {
    /** The one mark left when a player turns the readouts off. */
    readonly senseOffLabel: (senseKey: string) => string;
    readonly senseOff: string;
    readonly senseChip: string;
    readonly senseChipTitle: string;
    /** The ability chip, before the era or the animal has named the ability. */
    readonly hideChip: string;
    readonly protected: string;
    readonly spectating: string;
    /** The growth ring, spoken. */
    readonly rungLabel: string;
    readonly rungAria: (rung: number, rungName: string, stage: string, moult: string) => string;
    readonly tierAria: (tier: number, tierName: string, moult: string) => string;
    readonly fullyGrown: string;
    readonly toNextMoult: (percent: number) => string;
    /** An air-breather's two gauges. */
    readonly airBarAria: (percent: number, low: boolean) => string;
    readonly airRecoveryOff: string;
    readonly airSurfaceNow: string;
    /**
     * Out of the water, on the sand (`src/sim/beach.ts`). A water-breather has a minute on it and
     * gets a bar; anything that breathes air is simply somewhere else and gets the quiet line.
     */
    readonly strandBarAria: (percent: number, low: boolean) => string;
    readonly ashoreStranded: string;
    readonly ashoreStrandedNow: string;
    readonly ashore: string;
    /** The aim reticle: what the heavy would do to what is under it. */
    readonly aimCooling: string;
    /** Three separate chips at the foot of the screen, so each is its own string. */
    readonly tallyEaten: (n: number) => string;
    readonly tallyKills: (n: number) => string;
    readonly tallyEscapes: (n: number) => string;
    /** The eye at the top of the screen when something large has you in view. */
    readonly threat: {
      readonly unknown: string;
      readonly hunting: (name: string) => string;
      readonly noticed: (name: string) => string;
      readonly huntingInCoverStill: string;
      readonly huntingInCover: string;
      readonly huntingOpen: string;
      readonly noticedStill: string;
      readonly noticedMoving: string;
    };
    readonly modelLoading: string;
    /** What you have hold of, while you have hold of it. */
    readonly grip: {
      readonly spent: string;
      readonly spentNote: string;
      readonly heldBy: (name: string) => string;
      readonly breakFree: (dashKey: string) => string;
      readonly holdingOn: string;
      readonly inYourJaws: string;
      readonly releaseToStrike: string;
      readonly releaseToEat: string;
      readonly workingLoose: string;
      readonly biteOrLetGo: (lightKey: string) => string;
    };
    /** The teleport menu, opened by the player, so sense never hides it. */
    readonly teleport: {
      readonly eyebrow: string;
      /** `**like this**` is drawn as a key cap, so the copy stays one line in this table. */
      readonly ready: (confirmKey: string, backKey: string, nextKey: string) => string;
      readonly cooling: (seconds: number) => string;
      /** The last entry, which opens the change-creature page. */
      readonly changeCreature: string;
      readonly changeCreatureDetail: string;
    };
    readonly swap: {
      readonly eyebrow: string;
      readonly keptProgress: string;
      readonly fullyGrown: string;
      readonly hatchling: string;
      /** Same key-cap marker as the teleport footer above. */
      readonly footer: (abilityKey: string, grown: boolean, index: number, count: number, confirmKey: string, backKey: string) => string;
    };
    /** What happened to you, low on the screen, over an unobstructed view of it happening. */
    readonly death: {
      readonly down: string;
      readonly eaten: string;
      readonly killed: string;
      readonly by: (name: string) => string;
      readonly beingRevived: string;
      readonly reviveWindow: (seconds: number) => string;
      readonly demoted: string;
    };
    /** A team-mate on the floor, and the race to reach them. */
    readonly downed: {
      readonly heading: (seat: number) => string;
      readonly reviving: string;
      readonly distance: (distance: string, seconds: number) => string;
    };
    readonly scoreboard: {
      readonly bot: string;
      readonly hunting: string;
      readonly down: string;
      readonly caught: string;
      readonly tally: (kills: number, eats: number) => string;
    };
    readonly radar: {
      readonly label: (range: number, biome: string, food: string) => string;
      readonly range: (range: number) => string;
      readonly noFood: string;
      readonly foodAbove: string;
      readonly foodBelow: string;
      readonly foodNear: string;
    };
    readonly day: {
      readonly label: (phase: string, seconds: number) => string;
      readonly hunting: string;
      readonly seconds: (seconds: number) => string;
    };
    readonly biomeBanner: string;
    /**
     * The era's standing warnings, under the growth ring. An era that has no such rule never
     * raises them; the Triassic raises most of them.
     */
    readonly warnings: {
      readonly primeCountdown: string;
      readonly deadWaterBimodal: string;
      readonly deadWater: string;
      readonly beached: string;
      readonly heldUnder: string;
      readonly shoreReaching: string;
      /** The warning before the warning: a shore animal has noticed this player holding still within its reach. */
      readonly shoreWatching: string;
      readonly drowning: string;
      readonly outOfAir: string;
      readonly airRunningOut: string;
    };
    /**
     * The on-screen pads a touch player holds, and the lines that explain the swap.
     *
     * The pads are drawn over the sea, so every label here is one or two words: the button *is* the
     * explanation, and anything longer would be covering the game in order to describe itself.
     */
    readonly pads: {
      readonly swim: string;
      readonly swimAria: string;
      /** The swappable pad, once per action it can be set to. Keyed by the action's own name. */
      readonly aim: string;
      readonly guard: string;
      readonly ability: string;
      readonly sense: string;
      /** Spoken, and the title: what the pad does and how to change it. */
      readonly secondaryAria: (action: string) => string;
      /**
       * The one-off nudge that says the pad can be swiped, shown for the first few touch matches and
       * never again. A control that can be changed and never says so is a control nobody changes.
       */
      readonly swapHint: string;
      /** Shown for a moment after a swipe lands, naming what the pad is now. */
      readonly swapped: (action: string) => string;
      readonly pause: string;
      readonly travel: string;
      readonly scores: string;
    };
    /** Asked once, on a phone held upright: the sea is a wide thing to look at. */
    readonly rotate: string;
  };

  /** The Send Feedback button on the pick screen, and the dialog behind it. */
  readonly feedback: {
    readonly button: string;
    readonly eyebrow: string;
    readonly heading: string;
    readonly intro: string;
    readonly emailLabel: string;
    readonly emailPlaceholder: string;
    readonly emailNote: string;
    readonly messageLabel: string;
    readonly messagePlaceholder: string;
    readonly send: string;
    readonly sending: string;
    readonly failed: string;
    readonly sentHeading: string;
    readonly sentBody: (email: string) => string;
  };

  /** Lines the simulation raises, rendered by whichever HUD is showing. */
  readonly sim: {
    /** What the heavy button does for an animal with no special of its own. */
    readonly pounce: string;
    readonly emergenceStrike: string;
    /** The states the hide button puts a body into. */
    readonly hide: {
      readonly burrow: string;
      readonly camouflage: string;
      readonly sinking: string;
      readonly buried: (abilityKey: string) => string;
      readonly camouflaged: (match: string) => string;
      /** What the camouflage matched, as the HUD names it. */
      readonly matchSeafloor: string;
      readonly matchPlant: (kind: string) => string;
      readonly matchRock: string;
      /** The ability chip's tooltip, on the pick screen and in play. */
      readonly burrowDescription: string;
      readonly camouflageDescription: string;
    };
    /**
     * The rungs of the growth ladder, bottom first, as the HUD and the pick screen name them.
     * `tiers` is the Cambrian's five; an era with stages of its own replaces `rungs` and `stages`.
     */
    readonly ladder: {
      readonly tiers: readonly string[];
      readonly stages: readonly string[];
      readonly rungs: readonly string[];
    };
    /** The teleport menu's own destinations. */
    readonly nursery: string;
    readonly nurseryDetail: string;
    readonly teleportPlayer: (seat: number, name: string) => string;
    readonly respawning: string;
    /** The scoreboard's heading and its line of detail, per mode. */
    readonly board: {
      readonly riseTitle: string;
      readonly reefTitle: string;
      readonly changingOver: string;
      readonly reefFree: string;
      readonly reefWon: string;
      readonly riseGoal: string;
      readonly apexHeld: (seconds: number, target: number) => string;
      readonly huntTurn: (turn: number, turns: number) => string;
      readonly huntingNow: (seat: number) => string;
    };
    /** What the game says out loud as a match turns, and what the results screen leads with. */
    readonly match: {
      readonly grownUp: (name: string, caught: number) => string;
      readonly timeUp: (name: string, caught: number) => string;
      readonly turnAnnounce: (turn: number, turns: number, who: string) => string;
      /** A seat, where the sentence is about who is playing rather than about a creature. */
      readonly playerName: (seat: number) => string;
      readonly nobody: string;
      readonly rulesTheReef: (name: string) => string;
      readonly scoreLine: (seat: number, caught: number) => string;
      readonly nobodyCaught: (line: string) => string;
      readonly tie: (score: number, line: string) => string;
      readonly huntedBest: (seat: number, score: number, line: string) => string;
    };
    /** Something large with no name of its own. */
    readonly theGiant: string;
    /**
     * Onboarding hints: one line at a time, low on the screen. They name *actions* in braces —
     * `{sprint}`, `{heavy}` — and `fillControls` turns those into button names for whatever that
     * player is holding, so nothing written here has to know about controllers or keyboards.
     *
     * `opening` is the line a match starts on and is indexed by the rung the body hatched at, so
     * an era that puts a player in at half grown greets them differently from a hatchling. The
     * rest are the ladder of first-time lines, in the order a player meets them.
     */
    readonly hints: {
      readonly huntedStill: string;
      readonly huntedInCover: string;
      readonly huntedOpen: string;
      readonly noticedInCover: string;
      readonly noticedOpen: string;
      readonly swim: string;
      readonly sprint: string;
      readonly eatSmallFry: string;
      readonly sense: string;
      readonly growRing: string;
      readonly biteAndPounce: string;
      readonly dashClear: string;
      readonly guardParry: string;
      readonly hide: string;
      readonly aim: string;
      readonly grip: string;
      readonly teleport: string;
      /**
       * Out of the water (`src/sim/beach.ts`). The shore belongs to every era, so these come
       * before the era's own line: a gill has a minute to get back in, a lung has all day, and an
       * amphibian is told the sea is behind it rather than told to hurry.
       */
      readonly strandedGills: string;
      readonly ashoreAmphibious: string;
      readonly ashoreLungs: string;
      /** The era's own opening line, by rung: index 0 is the bottom rung. */
      readonly opening: readonly string[];
      /** What this body in particular can do, said once in its first seconds. */
      readonly shell: string;
      readonly sink: string;
      /** For an animal that can push into water nothing with gills can follow it into. */
      readonly shallows: string;
      /** Era hazards, raised whenever they are true rather than once. */
      readonly deadWater: string;
      readonly shoreFishing: string;
      readonly shoreWatching: string;
    };
  };
}

/** The button names the help page writes its prose around, already in the player's own scheme. */
export interface HelpButtons {
  readonly aim: string;
  readonly heavy: string;
  readonly guard: string;
  readonly dash: string;
  readonly sprint: string;
  readonly rise: string;
  readonly zoom: string;
  readonly sense: string;
  readonly light: string;
  readonly teleport: string;
  readonly view: string;
  readonly ability: string;
  /** True on a pad, so a sentence can name the right stick rather than the mouse. */
  readonly pad: boolean;
}

/** What an era may say differently: any leaf of `GameStrings`, and nothing it does not mention. */
export type StringOverrides = DeepPartial<GameStrings>;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown ? T[K]
    : T[K] extends readonly unknown[] ? T[K]
    : T[K] extends object ? DeepPartial<T[K]>
    : T[K];
};

/**
 * An era's table laid over the shared one.
 *
 * Only plain objects are walked into: a function is a whole string and an array is a whole list —
 * an era replacing the loading facts means *its* facts, not its facts interleaved with the
 * Cambrian's. Anything an era leaves out keeps the shared wording, which is what lets an era's file
 * be the handful of lines it actually says differently rather than a copy of this one.
 */
export function mergeStrings<T>(base: T, over: unknown): T {
  if (over === undefined || over === null) return base;
  if (typeof base !== 'object' || base === null || Array.isArray(base) || typeof over !== 'object' || Array.isArray(over)) return over as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] = k in out ? mergeStrings((base as Record<string, unknown>)[k], v) : v;
  }
  return out as T;
}

/**
 * What the three games say alike. An era overrides the handful of lines it says for itself; see
 * `src/content/<era>/strings.ts`, and `src/shared/text.ts` for the merged table the UI reads.
 */
export const SHARED_STRINGS: GameStrings = {
  common: {
    close: 'Close',
    cancel: 'Cancel',
    dismiss: 'Dismiss',
    newTag: 'NEW',
    playerChip: (seat) => `P${seat}`,
    seafloor: 'SEAFLOOR',
    swimmer: 'SWIMMER',
    metres: (n) => `${n} m`,
    kilometres: (km) => `${km} km`,
  },

  title: {
    pressStart: 'PRESS START',
    screenLabel: 'Press start',
    padsConnected: (count) => `${count} controller${count > 1 ? 's' : ''} connected · any button`,
    noPads: 'Press any key or click to play on mouse and keyboard · or connect a controller',
    trilogyEyebrow: 'PART OF',
    trilogyNavLabel: 'The trilogy',
  },

  loading: {
    wakingCreature: (name) => `Waking ${name}…`,
    waking: 'Waking the reef…',
    // Every era replaces these with its own animals; see the note on the field.
    facts: [],
  },

  select: {
    screenLabel: 'Choose your creature',
    rosterLabel: 'Creatures',
    modePickerLabel: 'Game mode',
    modeSwitchHint: (prev, next) => `${prev} / ${next} switch modes.`,
    backToTitle: (gameTitle) => `Back to the ${gameTitle} title screen`,
    chooseGame: (gameTitle) => `${gameTitle} — choose which game to play`,
    gameMenuLabel: 'Choose a game',
    randomName: 'Random',
    randomTitle: 'Random · pick a creature for me',
    visitorsName: 'Visitors',
    visitorsTitle: 'Visitors · animals from another time — apex creatures can visit here',
    crew: {
      keyboard1: 'Keyboard 1',
      keyboard2: 'Keyboard 2',
      touch: 'Touchscreen',
      controller: (n) => `Controller ${n}`,
      disconnected: ' · disconnected',
      removePlayer: (seat) => `Remove player ${seat}`,
      portraitAlt: (name) => `${name} reconstruction`,
      defaultLocality: 'Burgess Shale',
      realSize: (cm) => `${cm} cm`,
      blockParry: 'Block / parry',
      evade: 'Evade',
      statSpeed: 'Speed',
      statPower: 'Power',
      statArmor: 'Armor',
      statAgility: 'Agility',
      passiveMark: '+',
      weaknessMark: '−',
      visitorNote: (origin) => `VISITOR · ${origin} · left / right for the others`,
      lockIn: (confirmKey) => `LOCK IN  ·  ${confirmKey}`,
      lockedIn: (confirmKey) => `LOCKED IN · ${confirmKey} DIVES`,
    },
    best: {
      badge: 'BEST',
      partGrown: (rungName) => `${rungName.toUpperCase()} · PART GROWN`,
      whole: (rungName) => rungName.toUpperCase(),
      title: (modeName, rungName) => `Furthest grown in ${modeName}: ${rungName}.`,
      partTitle: (modeName, nextRung, rungName, percent) =>
        `Furthest grown in ${modeName}: reached ${nextRung}, but did not hold it. You start as a ${rungName} already ${percent}% of the way back.`,
      continuing: (rungName, partGrown) => `Continuing as ${rungName}${partGrown ? ', part grown' : ''}`,
      starting: (rungName) => `Starting as ${rungName}`,
    },
    joinPad: (padButton) => `Press ${padButton} to join`,
    joinPadOrKeyboard: (padButton, keyboardButton) => `Press ${padButton} or ${keyboardButton} to join`,
    dive: (confirmKey) => `DIVE IN  ·  ${confirmKey}`,
  },

  pause: {
    eyebrow: 'PAUSED',
    heading: 'Catch your breath.',
    resume: 'Resume',
    quit: 'Quit',
    startRecording: 'Start recording',
    endRecording: 'End recording',
    exportRecording: 'Export debug',
    discardRecording: 'Discard recording',
  },

  results: {
    victory: 'VICTORY',
    continue: 'Continue',
    playAgain: 'Play again',
    quit: 'Quit',
    tally: (eaten, kills, escapes) => `${eaten} eaten · ${kills} kills · ${escapes} escapes`,
    newBest: 'NEW BEST',
  },

  discoveries: {
    eyebrow: 'DISCOVERED',
    counts: (biomes, biomeTotal, landmarks, landmarkTotal, apex, rosterTotal) =>
      `${biomes}/${biomeTotal} biomes · ${landmarks}/${landmarkTotal} landmarks · ${apex}/${rosterTotal} at Apex`,
    unfoundBiome: '???',
    unfoundLandmark: 'Not found yet',
    unfoundLandmarkBlurb: 'Somewhere out there.',
    landmarkNames: { arch: 'The Arch', stack: 'The Stack', bones: 'A Giant’s Bones' },
    landmarkBlurbs: {
      arch: 'A span of rock with the sea running under it.',
      stack: 'Boulders piled into a tower you can climb.',
      bones: 'A dead giant on the floor. Food — and something comes back for it.',
    },
    apexReached: (name) => `${name} · reached Apex · unlocked in the other Ancient Seas games`,
    apexNotYet: (name) => `${name} · not yet at Apex`,
    apexNote: {
      star: '★',
      unlocked: 'Unlocked',
      body: '— playable in the other Ancient Seas games, from the',
      visitorsButton: 'Visitors',
      tail: 'button.',
    },
  },

  toolbar: {
    label: 'Game tools',
    help: 'How to play',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    settings: 'Settings',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
  },

  help: {
    eyebrow: 'HOW TO PLAY',
    heading: 'One rule: size.',
    bands: {
      lead: 'Everything is colour-coded by how big it is next to you.',
      snack: 'Green',
      snackText: 'you swim through and eat.',
      prey: 'Teal',
      preyText: 'runs; chase it and bite.',
      rival: 'Amber',
      rivalText: 'can fight back: circle, bait, parry, punish.',
      threat: 'Orange',
      threatText: 'will hurt you.',
      giant: 'Red',
      giantText: 'ends you.',
      tail: 'Break line of sight, get into sponges, hold still.',
    },
    huntingHeading: 'Hunting',
    hunting: (b) => `Hold **${b.aim}** to aim: the view moves over your shoulder and a crosshair sits at the centre of the screen. It snaps to nearby prey as you enter aim; after that, steer it with the ${b.pad ? 'right stick' : 'mouse'}. **${b.heavy}** performs your creature’s heavy move: snatch, seize, rake, crush, charge or feeding sweep. Creatures without a special heavy pounce toward aimed prey or lunge forward. **${b.guard}** blocks with the creature’s natural defense; tap for a parry. **${b.dash}** dashes: press it with a direction held to burst that way with a moment of invulnerability, far enough to clear a giant's bite — and it scales with your body, so a grown creature covers real ground. Press it with no direction and you dash along your own axis: ahead for most animals, and out behind for a shelled jetter, which is how it escapes. How long you hold it is how far you go: tap for a short shove, hold for the whole crossing. **${b.sprint}** sprints, **${b.rise}** rises — seafloor creatures hop with it, and holding it paddles them up into open water, where they swim — slower than a swimmer, but aimed with the camera and able to sprint and dash like anything else. A walker that stops asking to go anywhere settles back to the bottom. **${b.zoom}** pulls the camera in and out. **${b.sense}** turns Sense on and off: on, the size-band marks over creatures and the radar are drawn; off, nothing is drawn over the sea but the bar at the bottom. It is on to begin with, costs nothing and never runs out — turning it off is for the look of the thing.`,
    seaHeading: 'The sea',
    sea: (b) => `It has one edge: the shore you hatch beside. Swim along it and the world stays gentle; swim away from it and the biomes change, out to the deep water where the giants live. The radar at the top right shows anything big enough to hurt you, whatever is hunting you, the nearest shoals worth eating, your nursery and the shore. Creatures show only while they are inside its reach; the other players, your nursery and the shore sit hollow on the rim when they are past it, pointing the way. Press **${b.teleport}** for the teleport menu: back to your nursery, or straight to another player. Hold **${b.view}** for the scoreboard: everyone in the match, what they have done, and what this mode is asking of them.`,
    huntingEraNote: '',
    seaEraNote: '',
    fightingEraNote: '',
    growingEraNote: '',
    fightingHeading: 'Fighting',
    fighting: (b) => `**${b.light}** chains three bites, the third hits hard. **${b.heavy}** is your heavy: the creature’s special if it has one, otherwise a pounce — either way a long committed lunge that carries you onto what you aimed at. The crosshair names it when it will connect. Press it while sprinting or mid-dash and it becomes a charge: it takes whatever is nearest the line you are travelling along, for extra force. **${b.guard}** held raises a shield; tapped as a hit lands, it parries and staggers them. Hits from behind or below hurt more. Sprinting and dashing pause health recovery. Nothing dies in one bite unless it is far smaller than you: a peer takes a couple of hits, a giant needs about three good bites to kill you, and after six seconds out of the fight your health starts to return slowly, or twice as fast near seafloor plants. Bite a bigger predator enough and it breaks off and runs.`,
    giantsHeading: 'Giants',
    giants: () => 'The big ones cruise high in the light and only dive when they are hungry. When one turns your way an eye fills at the top of your screen: stop moving, or slip under the sponges and hold still until it loses you. They are slow to turn and cannot get their heads into dense cover. Their bite is a slow heavy: dash the moment you see the wind-up. If one does catch you at zero health, it swallows you whole.',
    growingHeading: 'Growing',
    growing: (b) => `In Rise the ring fills as you eat. In Survival it fills with time and faster when you fight a peer or larger creature; eat creatures to refill hunger. Starving drops you a tier. Rise deaths cost half a rung. **${b.ability}** hides at every size. Burrowers sink and bury for free; hide or heavy emerges with a free strike. Other creatures gradually copy the nearest plant, rock, seabed or creature colours. Idle camouflage slowly sinks: move in any direction to counter it. Attacking, blocking, sprinting or being hit reveals you.`,
    padMenusHeading: 'Menus on a pad',
    padMenus: 'The stick and D-pad steer whatever the screen is about — the roster, a menu’s choices — and move by where the buttons actually are, so a row answers left and right. **LB** and **RB** step through every other button on the screen, one at a time, and round to the roster again: the other era on the title screen, the mode chips, and the icons in the corner from anywhere — so settings and fullscreen are reachable without a mouse. **A** takes the one you land on and **B** gives the sticks back. On a shared screen only the pad that reached for them follows; everyone else keeps picking.',
    keyboardHeading: 'Keyboard',
    keyboardPlayerOne: 'WASD swim · arrows look · PgUp/PgDn zoom · Shift sprint · Space rise · C sink · F bite · G heavy · R hide · V dash · Q guard · Tab aim · E sense · T teleport · Z scoreboard · Esc pause.',
    keyboardPlayerTwo: 'IJKL swim · Right Shift sprint · N rise · M sink · ; bite · ’ heavy · P hide · / dash · U guard · O aim · Y sense · H teleport · , scoreboard.',
    controllerHeading: 'Controller',
    controller: 'Plug an Xbox-style pad in and press a button: the game hands it the match and every prompt here changes to read **RT**, **LB**, **Y** instead. Up to four can play at once, and the mouse goes back to being a cursor.',
    sharedKeyboard: 'Sharing one keyboard? A second player takes the right-hand keys. The mouse stays with player one.',
  },

  settings: {
    eyebrow: 'SETTINGS',
    heading: 'Tune the sea.',
    detail: 'Detail',
    detailNote: 'Shadows, density, resolution',
    qualityHigh: 'High',
    qualityLow: 'Performance',
    cameraSpeed: 'Camera speed',
    cameraSpeedNote: (times) => `${times}×`,
    invertY: 'Invert camera Y',
    volume: 'Volume',
    volumeNote: (percent) => `${percent}%`,
    music: 'Music',
    mute: 'Mute',
    equivalentSizing: 'Equivalent sizing',
    equivalentSizingNote: 'Give every animal the same size, instead of its own. Takes effect next match.',
    shoreAnimals: 'Shore animals',
    shoreAnimalsNote: 'Something stands at the water\'s edge now and then, and takes what holds still there. Off, the beach is empty.',
    footnote: 'Settings apply to every local player and are remembered on this device.',
  },

  hud: {
    senseOffLabel: (senseKey) => `Readouts off. Press ${senseKey} for sense.`,
    senseOff: 'Sense off',
    senseChip: 'Sense',
    senseChipTitle: 'Band marks, the radar and the gauges. Off is the bare sea: nothing drawn over it at all.',
    hideChip: 'Hide',
    protected: 'PROTECTED',
    spectating: 'SPECTATING',
    rungLabel: 'RUNG',
    rungAria: (rung, rungName, stage, moult) => `Rung ${rung}, ${rungName}. ${stage}, ${moult}`,
    tierAria: (tier, tierName, moult) => `Tier ${tier}: ${tierName}, ${moult}`,
    fullyGrown: 'fully grown',
    toNextMoult: (percent) => `${percent}% to the next moult`,
    airBarAria: (percent, low) => `Air ${percent}%${low ? ', surface soon' : ''}`,
    airRecoveryOff: 'Out of air: no health recovery',
    airSurfaceNow: 'Surface for air',
    strandBarAria: (percent, low) => `Out of the water ${percent}%${low ? ', get back in' : ''}`,
    ashoreStranded: 'OUT OF THE WATER · flop back to the sea',
    ashoreStrandedNow: 'OUT OF THE WATER · flop back in now',
    ashore: 'ON THE SHORE · the sea is behind you',
    aimCooling: '…',
    tallyEaten: (n) => `${n} eaten`,
    tallyKills: (n) => `${n} kills`,
    tallyEscapes: (n) => `${n} escapes`,
    threat: {
      unknown: 'Something huge',
      hunting: (name) => `${name} IS HUNTING YOU`,
      noticed: (name) => `${name} is looking your way`,
      huntingInCoverStill: 'Hold still. It is losing you.',
      huntingInCover: 'In cover. Now freeze.',
      huntingOpen: 'Break line of sight. Get under the sponges.',
      noticedStill: 'Stay frozen until it turns away.',
      noticedMoving: 'Stop moving, or slip into cover.',
    },
    modelLoading: 'Your creature is taking shape…',
    grip: {
      spent: 'GRIP GIVEN OUT',
      spentNote: 'Let go before trying again',
      heldBy: (name) => `${name.toUpperCase()} HAS YOU`,
      breakFree: (dashKey) => `${dashKey} to break free · easier while it is pulling`,
      holdingOn: 'HOLDING ON',
      inYourJaws: 'IN YOUR JAWS',
      releaseToStrike: 'Release NOW to strike',
      releaseToEat: 'Release to eat it',
      workingLoose: 'It is working loose — let go or lose it',
      biteOrLetGo: (lightKey) => `${lightKey} bite · release to let go`,
    },
    teleport: {
      eyebrow: 'TELEPORT',
      ready: (confirmKey, backKey, nextKey) => `**${confirmKey}** go · **${backKey}** back · **${nextKey}** next`,
      cooling: (seconds) => `Ready in ${seconds} s`,
      changeCreature: 'Change creature',
      changeCreatureDetail: 'Swap bodies · each keeps what it has grown',
    },
    swap: {
      eyebrow: 'CHANGE CREATURE',
      keptProgress: ' · your progress',
      fullyGrown: ' · fully grown',
      hatchling: ' · hatchling',
      footer: (abilityKey, grown, index, count, confirmKey, backKey) =>
        `${index}/${count} · **${abilityKey}** ${grown ? 'grown' : 'hatchling'} · **${confirmKey}** take it · **${backKey}** back`,
    },
    death: {
      down: 'You are down',
      eaten: 'You’ve been eaten',
      killed: 'You’ve been killed',
      by: (name) => ` by ${name}`,
      beingRevived: 'Someone is getting you up…',
      reviveWindow: (seconds) => `A team-mate can still reach you · ${seconds} s`,
      demoted: 'You slip down a tier.',
    },
    downed: {
      heading: (seat) => `P${seat} is down`,
      reviving: 'Hold still — getting them up',
      distance: (distance, seconds) => `${distance} · reach them in ${seconds} s`,
    },
    scoreboard: {
      bot: 'BOT',
      hunting: ' · hunting',
      down: ' · down',
      caught: 'caught',
      tally: (kills, eats) => `${kills} k · ${eats} e`,
    },
    radar: {
      label: (range, biome, food) => `Radar, ${range} metre reach. ${biome}. ${food}`,
      range: (range) => `${range} m`,
      noFood: 'No food in reach.',
      foodAbove: 'Food above you.',
      foodBelow: 'Food below you.',
      foodNear: 'Food nearby.',
    },
    day: {
      label: (phase, seconds) => `${phase}, ${seconds} seconds left`,
      hunting: 'the reef is hunting',
      seconds: (seconds) => `${seconds}s`,
    },
    biomeBanner: 'ENTERING',
    warnings: {
      primeCountdown: 'PRIME',
      deadWaterBimodal: 'DEAD WATER · your lungs are fine, their gills are not',
      deadWater: 'DEAD WATER · no oxygen, get out',
      beached: 'ON THE SAND · nothing with gills can follow',
      heldUnder: 'HELD UNDER · nothing comes back until you are loose',
      shoreReaching: 'SOMETHING ON THE SHORE · it is reaching for you',
      shoreWatching: 'SOMETHING ON THE SHORE · it is watching you',
      drowning: 'DROWNING · get to the surface',
      outOfAir: 'OUT OF AIR · nothing comes back until you breathe',
      airRunningOut: 'AIR RUNNING OUT · start for the surface',
    },
    pads: {
      swim: 'SWIM',
      swimAria: 'Hold to swim forward, wherever the view is pointing',
      aim: 'AIM',
      guard: 'GUARD',
      ability: 'HIDE',
      sense: 'SENSE',
      secondaryAria: (action) => `Hold for ${action}. Swipe the pad sideways to change it.`,
      swapHint: 'Swipe this pad to change it',
      swapped: (action) => action,
      pause: 'Pause',
      travel: 'Travel',
      scores: 'Scores',
    },
    rotate: 'Turn your device sideways for the whole sea',
  },

  feedback: {
    button: 'Send Feedback',
    eyebrow: 'FEEDBACK',
    heading: 'Tell us what you think.',
    intro: 'We are always open to suggestions and comments and would love to hear your feedback, or of course about any bugs or difficulties you encounter.',
    emailLabel: 'Your email',
    emailPlaceholder: 'you@example.com',
    emailNote: 'Only so we can reply, if needed',
    messageLabel: 'Your message',
    messagePlaceholder: 'What happened, or what would you change?',
    send: 'SEND',
    sending: 'SENDING…',
    failed: 'That did not send — the connection or the inbox is having a moment. Try again in a minute; nothing you have typed is lost.',
    sentHeading: 'Thank you.',
    sentBody: (email) => `It has landed, and it will be read. If it needs an answer you will get one at ${email}.`,
  },

  sim: {
    pounce: 'Pounce',
    emergenceStrike: 'Emergence strike',
    hide: {
      burrow: 'Burrow',
      camouflage: 'Camouflage',
      sinking: 'Sinking to burrow',
      buried: (abilityKey) => `Buried · ${abilityKey} emerge`,
      camouflaged: (match) => `Camo: ${match}`,
      matchSeafloor: 'Seafloor',
      matchPlant: (kind) => `${kind} plant`,
      matchRock: 'Rock',
      burrowDescription: '{ability}: descend and bury in sediment without effort cost. {ability} or heavy exits with a free emergence strike.',
      camouflageDescription: '{ability}: copy the nearest creature, plant, rock or seafloor colour. Idle creatures slowly sink. Move to counter sinking; attack, block or sprint reveals you.',
    },
    ladder: {
      tiers: ['Larva', 'Juvenile', 'Adult', 'Giant', 'Apex'],
      stages: ['Hatchling', 'Juvenile', 'Young', 'Adult', 'Prime'],
      rungs: ['', 'Floor', 'Shoal', 'Hunters', 'Giants'],
    },
    nursery: 'Your nursery',
    nurseryDetail: 'Back to where you hatched',
    teleportPlayer: (seat, name) => `Player ${seat} · ${name}`,
    respawning: 'respawning',
    board: {
      riseTitle: 'Rise',
      reefTitle: 'Reef',
      changingOver: 'Changing over…',
      reefFree: 'No goal. Just the sea.',
      reefWon: 'The reef is yours. Swim on.',
      riseGoal: 'Reach Apex and hold it for ninety seconds',
      apexHeld: (seconds, target) => `Apex held ${seconds} s of ${target}`,
      huntTurn: (turn, turns) => `Turn ${turn} of ${turns}`,
      huntingNow: (seat) => `Player ${seat} is hunting · most caught wins`,
    },
    match: {
      grownUp: (name, caught) => `The small ones grew up. ${name} caught ${caught}.`,
      timeUp: (name, caught) => `Time. ${name} caught ${caught}.`,
      turnAnnounce: (turn, turns, who) => `Turn ${turn} of ${turns} — ${who} hunts.`,
      playerName: (seat) => `Player ${seat}`,
      nobody: 'nobody',
      rulesTheReef: (name) => `${name} rules the reef.`,
      scoreLine: (seat, caught) => `P${seat} ${caught}`,
      nobodyCaught: (line) => `Nobody caught anything. ${line}`,
      tie: (score, line) => `A tie at ${score}. ${line}`,
      huntedBest: (seat, score, line) => `Player ${seat} hunted best: ${score} caught. ${line}`,
    },
    theGiant: 'The giant',
    hints: {
      huntedStill: 'Hold still. It is losing you.',
      huntedInCover: 'You are in cover. Now hold still.',
      huntedOpen: 'It is coming for you. Get under the sponges, then hold still.',
      noticedInCover: 'It is looking your way. Stay in cover and freeze.',
      noticedOpen: 'Something big is looking your way. Stop moving or slip into cover.',
      swim: '{swim} to swim.',
      sprint: 'Hold {sprint} to sprint. Catch the school.',
      eatSmallFry: 'Swim through the small fry to eat them.',
      sense: 'Tap {sense}: the sense pulse shows what is near.',
      growRing: 'Eat. Grow. The ring fills toward your next moult.',
      biteAndPounce: '{light} bites. {heavy} pounces. Hunt something your own size.',
      dashClear: '{dash} while you are moving dashes clear of a bite. {sprint} sprints.',
      guardParry: 'Hold {guard} to guard. Tap it as a hit lands to parry.',
      hide: '{ability}: hide. Burrowers bury for free; camouflage copies nearby colours.',
      aim: 'Hold {aim} to aim at prey. When the crosshair fills, {heavy} pounces.',
      grip: 'Hold {heavy} and you take hold — it costs nothing and hurts nothing. Let go of prey to eat it; hold on to anything your own size or bigger and ride it, then {light} to bite.',
      teleport: '{teleport}: teleport home, or to another player.',
      strandedGills: 'Out of the water. {swim} toward the sea to flop back in. You have a minute.',
      ashoreAmphibious: 'On the shore. The sea is behind you; walk back in when you like.',
      ashoreLungs: 'On the shore. Walk back down to the water.',
      // The eras that have a ladder fill these in; the Cambrian opens on the lines above.
      opening: [],
      shell: 'Your funnel makes rise and sink free, and no direction is slow. Block withdraws into the shell.',
      sink: 'You settle when you stop. The floor is where you feed.',
      shallows: 'You can push into water nothing with gills can follow you into.',
      deadWater: 'Dead water. Get out of it, or up to the surface if you can breathe.',
      shoreFishing: 'Something on the shore is fishing. Get deeper.',
      shoreWatching: 'Something on the shore has noticed you holding still. Move.',
    },
  },
};
