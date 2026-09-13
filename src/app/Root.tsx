import { App } from './App';
import { DebugLocal } from './DebugLocal';
import { debugScreen } from '../shared/debug';

/**
 * What the page actually mounts. Both eras render this, so the debug entry points exist on both
 * without either entry file knowing about them: `?debug=local` opens the local state editor and
 * the game is never started, which is the point — the editor is for a save the game is not
 * holding open.
 */
export function Root() {
  return debugScreen() === 'local' ? <DebugLocal /> : <App />;
}
