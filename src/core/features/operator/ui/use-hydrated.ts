import {useSyncExternalStore} from 'react';

const never=()=>()=>{};
/** False in the server HTML and while React hydrates, true once the page's handlers are attached. A form that only the
 * page's script can submit keeps its fields read-only and its button disabled until then: React resets a controlled
 * field when it hydrates, so earlier typing is lost, and an earlier click would be a native GET that reloads the page.
 * A disabled default button also stops Enter from submitting. */
export const useHydrated=()=>useSyncExternalStore(never,()=>true,()=>false);
