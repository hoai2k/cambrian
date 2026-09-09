/**
 * Rising-edge detection over a bag of booleans.
 *
 * Three places in the game ask "did this go down *this* frame" — the shell's pad loop, the
 * renderer's teleport menu, and the simulation's own input frame — and each grew its own copy of
 * the same bookkeeping: read the current state, compare against a stored copy, then remember the
 * current one for next time. The remembering is the part that rots. The teleport menu tracked
 * eight named booleans by hand, every one of them written out twice, and adding a control meant
 * adding it to both lists; forget the second and the button is stuck down forever, which is
 * invisible until someone holds it.
 *
 * This does the remembering once. The simulation keeps its own `prev` on the actor, deliberately:
 * it is part of the replayable state and has to stay a plain serialisable object.
 */
export class Edges {
  private prev: Record<string, boolean> = {};

  /**
   * The keys that went from up to down since the last call, given this frame's readings. Call once
   * per frame — it records what it was handed, so a second call in the same frame sees no edges.
   */
  step(now: Record<string, boolean>): Record<string, boolean> {
    const just: Record<string, boolean> = {};
    for (const k in now) just[k] = now[k] && !this.prev[k];
    this.prev = { ...now };
    return just;
  }

  /**
   * Mark a key as already held, so the press that is happening right now is not read as a new one
   * on the next frame. This is what stops the button that opened a menu from also answering its
   * first question.
   */
  hold(...keys: string[]): void { for (const k of keys) this.prev[k] = true; }

  /** Forget everything: a device that went away comes back without its old buttons held. */
  clear(): void { this.prev = {}; }
}
