import { installCompiledLiveEdits, setLiveEditsReady } from '../base/modules/editor';
import compiled from './visual-edits.json';

// This is the same copied runtime that the owner widget uses. Published edits
// belong to every visitor and are installed before React begins hydration.
if (typeof document !== 'undefined') {
  setLiveEditsReady(false);
  installCompiledLiveEdits(compiled);
}
export { setLiveEditsReady };
