import { TEXT } from '../shared/text';
import type { Secondary } from '../shared/touch-play';

/**
 * The controls a touch player can see.
 *
 * Everything else about the finger scheme is invisible and has to be — the sea is what the player
 * came for, and a screen edged with buttons is a screen with no game on it. Tapping, double-tapping,
 * swiping and pinching all happen over the water and are drawn nowhere. What is left here is the
 * short list of things a finger genuinely cannot do by gesture:
 *
 *   - **Swim.** Held, the animal goes forward. Forward is wherever the view is looking, so a swipe
 *     that lifts the view and a held swim pad are the climb; that is why there is no up or down pad.
 *   - **The secondary.** One pad holding aim, guard or hide, chosen by swiping the pad sideways.
 *   - **Pause**, because a match has to be leaveable and there is no Escape key on a phone.
 * Travel and scores live in the pause menu; the travel list itself answers taps and swipes.
 *
 * The pads declare themselves with `data-touch-zone` and carry no event handlers of their own:
 * `TouchPlay` listens on the window and reads the zone off the element a finger landed on, which is
 * the one arrangement that sees a finger sliding off a pad as still that pad's. So these are plain
 * divs — and they are `aria-hidden`, because the actions they stand for are already named in the
 * help page and a screen reader announcing SWIM over a game it cannot play is noise. The pause
 * button is the exception and a real `<button>`: it leaves the game, which is the one thing that must
 * work however the page is being read.
 */
export function TouchPads({ secondary, hint, swapped, teleportOpen, onPause }: {
  secondary: Secondary;
  /** Say the pad can be swiped. True only for a player who has not yet discovered it. */
  hint: boolean;
  /** The pad was just swapped: name what it is now, for a moment. */
  swapped: boolean;
  /** The travel menu is up, so the game pads stand down while the player chooses. */
  teleportOpen: boolean;
  onPause: () => void;
}) {
  const COPY = TEXT.hud.pads;
  const label = COPY[secondary];
  return (
    <div className="touch-pads">
      {/* A column: the nudge stands *above* the pads rather than beside them. Beside them it was in
          the toolbar's corner, clipped and unreadable, which is a poor advertisement for a control
          nobody has found yet. */}
      {!teleportOpen && <div className="touch-left">
        {hint && <p className="touch-hint">{COPY.swapHint}</p>}
        <div className="touch-pad-row">
          <div className="touch-pad touch-swim" data-touch-zone="swim" aria-hidden="true">
            <span>{COPY.swim}</span>
          </div>
          <div
            className={`touch-pad touch-secondary ${swapped ? 'just-swapped' : ''}`}
            data-touch-zone="secondary"
            aria-hidden="true"
            title={COPY.secondaryAria(label)}
          >
            {/* The arrows are the affordance: a pad that can be swiped and does not look it is a pad
                nobody swipes. They are part of the drawing rather than a hint that goes away. */}
            <i className="swipe-mark left" />
            <span>{label}</span>
            <i className="swipe-mark right" />
          </div>
        </div>
      </div>}

      <div className="touch-right">
        <button type="button" className="touch-btn touch-pause" onClick={onPause}>{COPY.pause}</button>
      </div>
    </div>
  );
}

/**
 * The phone portrait gate covers the app until it is rotated. The engine stops behind it.
 */
export function RotateHint() {
  return <div className="rotate-gate" role="status"><p>{TEXT.hud.rotate}</p></div>;
}
