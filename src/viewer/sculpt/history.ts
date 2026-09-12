/**
 * Undo/redo over immutable snapshots. Every edit pushes a whole document (they are small: twenty
 * stations), so undo is a pointer move and nothing is ever recomputed. A drag coalesces: the
 * editor calls `replace` while the pointer is down and `push` once when it is released, so one
 * gesture is one undo step.
 */
export class History<T> {
  private past: T[] = [];
  private future: T[] = [];
  /** The state a gesture started from, so its commit steps back to that rather than mid-drag. */
  private anchor: T | undefined;
  constructor(public present: T, private limit = 200) {}

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }

  /** Commits a new state as a step. After `replace` calls, the step is from the gesture's start. */
  push(next: T) {
    this.past.push(this.anchor ?? this.present);
    this.anchor = undefined;
    if (this.past.length > this.limit) this.past.shift();
    this.present = next;
    this.future = [];
  }

  /** Changes the present without a step, for the intermediate states of a drag. */
  replace(next: T) {
    if (this.anchor === undefined) this.anchor = this.present;
    this.present = next;
  }

  /** Whether a drag is in progress (a `replace` since the last step). */
  get inGesture() { return this.anchor !== undefined; }

  /** Ends a drag: the state it reached becomes one step from where it started. */
  commit() { if (this.anchor !== undefined) this.push(this.present); }

  undo(): T {
    this.anchor = undefined;
    const prev = this.past.pop();
    if (prev !== undefined) { this.future.push(this.present); this.present = prev; }
    return this.present;
  }

  redo(): T {
    this.anchor = undefined;
    const next = this.future.pop();
    if (next !== undefined) { this.past.push(this.present); this.present = next; }
    return this.present;
  }
}
