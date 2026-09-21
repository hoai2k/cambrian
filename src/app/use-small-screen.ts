import { useEffect, useState } from 'react';
import { layoutFor, rotateHint, touchFirst, type Layout } from '../shared/small-screen';

/**
 * What this window is, and when it changes.
 *
 * The decisions are all in `src/shared/small-screen.ts`, which is pure and checked by `npm run
 * touch`; this is the part that has to ask the browser. Nothing in `src/app` measured the window
 * before — the layout was entirely CSS — so this is the first place that does, and it exists because
 * three things that are *not* styling depend on the same numbers: whether the on-screen pads are
 * drawn, which seat the local player takes, and whether to mention turning the device round.
 *
 * `matchMedia` for the pointer and `resize` for the size, because they are different questions.
 * `(pointer: coarse)` and `(hover: hover)` are about the hardware and change when a mouse is plugged
 * into a tablet, which is rare and worth answering anyway; the size changes constantly. Both are
 * listened to, so a window dragged smaller reflows and a tablet that gains a trackpad stops being
 * given thumb pads.
 *
 * `orientationchange` is deliberately *not* listened for. It fires before the new size is readable on
 * some browsers, and `resize` fires afterwards on all of them, so the resize is the honest signal and
 * the orientation event would only ever produce one frame of wrong answer.
 */
export interface SmallScreen {
  layout: Layout;
  /** The window, in CSS pixels, for anything that wants the numbers rather than the verdict. */
  width: number; height: number;
  /** A finger is the pointer and no pad is connected: the pads are drawn and touch plays. */
  touch: boolean;
  /** This window is much taller than it is wide, and the player could usefully turn it round. */
  rotate: boolean;
}

/** Whether a media query holds, safely: `matchMedia` is missing in a headless renderer or two. */
const media = (q: string): boolean => {
  try { return window.matchMedia?.(q).matches ?? false; } catch { return false; }
};

const measure = (pads: number): SmallScreen => {
  const width = window.innerWidth || 1, height = window.innerHeight || 1;
  const touch = touchFirst(media('(pointer: coarse)'), media('(hover: hover)'), pads);
  return { layout: layoutFor(width, height), width, height, touch, rotate: rotateHint(width, height, touch) };
};

export function useSmallScreen(pads: number): SmallScreen {
  const [s, setS] = useState<SmallScreen>(() => measure(pads));
  useEffect(() => {
    const read = () => setS((was) => {
      const now = measure(pads);
      // Same answer, same object: this feeds a class name and a couple of booleans, and re-rendering
      // the whole shell on every pixel of a window drag would be paid for in dropped frames.
      return was.layout === now.layout && was.touch === now.touch && was.rotate === now.rotate
        && was.width === now.width && was.height === now.height ? was : now;
    });
    read();
    window.addEventListener('resize', read);
    const queries = ['(pointer: coarse)', '(hover: hover)'].map((q) => {
      try { return window.matchMedia?.(q); } catch { return undefined; }
    });
    for (const q of queries) q?.addEventListener?.('change', read);
    return () => {
      window.removeEventListener('resize', read);
      for (const q of queries) q?.removeEventListener?.('change', read);
    };
  }, [pads]);
  return s;
}
