import { useCallback, useRef, useState, type MutableRefObject } from 'react';

/**
 * The shell's state lives twice over: in React state, so the screen re-renders, and in a ref, so the
 * pad loop, the key handler and the engine's callbacks — which run outside any render and must not
 * be torn down and rebuilt on every change — read the current value rather than the one they closed
 * over. Keeping the two in step by hand was a line of `xRef.current = v; setX(v)` at every write,
 * and one forgotten half was a stale read somewhere nobody was looking. These two hooks are that
 * line, once.
 */

/**
 * A ref that always holds the latest value passed in, updated during render. For values derived
 * during render (the window's column cap, the lineup's extras) that callbacks need to read.
 */
export function useLatest<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/**
 * State with a ref beside it. The setter writes the ref first and then the state, so a callback
 * that runs straight after a write — later in the same handler, or the next pad poll before React
 * has rendered — already reads the new value. The setter is stable across renders.
 */
export function useStateRef<T>(initial: T | (() => T)): [T, (next: T) => void, MutableRefObject<T>] {
  const [state, setState] = useState<T>(initial);
  const ref = useRef<T>(state);
  const set = useCallback((next: T) => { ref.current = next; setState(next); }, []);
  return [state, set, ref];
}
