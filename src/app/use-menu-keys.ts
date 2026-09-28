import { useEffect } from 'react';
import { audio } from '../audio/audio';
import { MENU_LOCKOUT } from './menu-cursor';
import type { MenuWiring } from './use-pad-menus';

/**
 * Keyboard menu navigation: the title, the choice screen (the local seat, whichever device it
 * joined on), the pause menu and the results, and Escape for a match made entirely of pads.
 * Re-subscribes on exactly the actions it always did.
 */
export function useMenuKeys(w: MenuWiring) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.matches?.('input,textarea,select')) return;
      const s = w.screenRef.current;
      if (w.dialogRef.current) { if (e.code === 'Escape') w.openDialog(null); return; }
      if (s === 'title') { if (!e.metaKey && !e.ctrlKey && e.code !== 'F11') w.startFromTitle(w.handRef.current); return; }
      if (s === 'select') {
        const ps = w.playersRef.current;
        // The local seat, whichever it joined on: a tablet with a keyboard case still answers keys.
        const idx = ps.findIndex((x) => x.device === 'keyboard' || x.device === 'touch');
        if (idx >= 0) {
          if (e.code === 'ArrowRight' || e.code === 'KeyD') w.moveCursor(idx, 1, 0);
          if (e.code === 'ArrowLeft' || e.code === 'KeyA') w.moveCursor(idx, -1, 0);
          if (e.code === 'ArrowDown' || e.code === 'KeyS') w.moveCursor(idx, 0, 1);
          if (e.code === 'ArrowUp' || e.code === 'KeyW') w.moveCursor(idx, 0, -1);
          if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); w.activate(idx); }
          if (e.code === 'Escape') { if (ps[idx].ready) w.toggleReady(idx); else w.backToTitle(); }
          // The keyboard's own way to the same choice the pad makes with Y.
          if (e.code === 'KeyC') w.toggleCarry(idx);
        } else if (e.code === 'Enter' || e.code === 'Space') w.addKeyboard();
        if (e.code === 'KeyQ') w.changeMode(w.modes[(w.modes.indexOf(w.modeRef.current) + w.modes.length - 1) % w.modes.length]);
        if (e.code === 'KeyE') w.changeMode(w.modes[(w.modes.indexOf(w.modeRef.current) + 1) % w.modes.length]);
        return;
      }
      if (s === 'results' || (s === 'playing' && w.pausedRef.current)) {
        // The same rules for the keyboard: a lockout, a cursor, and one key that acts.
        const awake = w.menuCursorRef.current.shown;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); w.menuInput({ step: 1 }); return; }
        if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); w.menuInput({ step: -1 }); return; }
        if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); w.menuInput({ confirm: true }); return; }
        if (e.code === 'Escape' && s === 'playing' && awake && performance.now() - w.menuAtRef.current >= MENU_LOCKOUT) { w.setPausedBoth(false); return; }
        w.menuInput({ other: true });
        return;
      }
      if (s === 'playing') {
        // Escape is `menu` on both keyboard layouts, so for a match with a keyboard player in it
        // the engine already turns it into a pause (`onMenu`). Toggling here as well would flip
        // the pause twice in the same press and leave it exactly where it started — which is what
        // used to happen, and is why Escape appeared to do nothing on a keyboard. Only a match
        // made entirely of controllers needs this path.
        const onKeyboard = w.playersRef.current.some((pl) => typeof pl.device === 'string');
        if (e.code === 'Escape' && !onKeyboard) { w.setPausedBoth(!w.pausedRef.current); audio.play('ui-confirm'); }
        if (w.pausedRef.current && e.code === 'Enter') w.setPausedBoth(false);
        return;
      }

    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [w.activate, w.addKeyboard, w.backToTitle, w.changeMode, w.menuInput, w.moveCursor, w.openDialog, w.setPausedBoth, w.startFromTitle, w.startMatch, w.toggleCarry, w.toggleReady]);
}
