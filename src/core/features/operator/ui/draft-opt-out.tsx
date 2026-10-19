import { useCallback,useEffect,useState } from 'react';
import { workbenchRequest } from './workbench-api';
import { OperatorState } from './operator-shell';
export interface OptOutState {setting:boolean;removalAllowed:boolean;choice:'relationship'|'transactional'|'added'|null;transport:boolean;carries:boolean;marking:string|null}
/** OUT-020: the opt-out state this approval binds, and the rep's marking. Changing it makes the draft need review again. */
export function DraftOptOut({draftId,disabled,onState,onChanged}:{draftId:string;disabled:boolean;onState:(state:OptOutState|null)=>void;onChanged:()=>void}){
 const [state,setState]=useState<OptOutState|null>(null),[error,setError]=useState('');
 const load=useCallback(async()=>{try{const next=await workbenchRequest<OptOutState>(`/drafts/${draftId}/opt-out`);setState(next);onState(next);}catch(e){setError((e as Error).message);onState(null);}},[draftId]);
 useEffect(()=>{void load();},[load]);
 async function mark(choice:OptOutState['choice']){try{setError('');await workbenchRequest(`/drafts/${draftId}/opt-out`,{choice});await load();onChanged();}catch(e){setError((e as Error).message);}}
 if(!state)return error?<OperatorState kind="error">{error}</OperatorState>:null;
 return <div className="draft-opt-out" data-testid="draft-opt-out">
  <p><strong>Opt-out:</strong> {state.carries?'included — List-Unsubscribe headers and the provider’s unsubscribe footer shown below':'not included — no List-Unsubscribe header and no unsubscribe footer'}.</p>
  <p>{state.marking==='transport'?'One-to-one email is set to carry opt-out, but the managed mail relay cannot add Orbit’s opt-out yet, so this message is sent without it.':state.marking==='relationship'||state.marking==='transactional'?`You removed opt-out from this message as ${state.marking} mail.`:state.marking==='added'?'You added opt-out to this message.':state.setting?'One-to-one email carries opt-out (Settings → Opt-out links).':'One-to-one email carries no opt-out by default (Settings → Opt-out links).'}</p>
  <div className="draft-opt-out__actions">
   {state.setting&&!state.choice&&state.removalAllowed&&<><button type="button" disabled={disabled} onClick={()=>void mark('relationship')}>Remove: relationship mail</button><button type="button" disabled={disabled} onClick={()=>void mark('transactional')}>Remove: transactional mail</button></>}
   {!state.setting&&!state.choice&&<button type="button" disabled={disabled} onClick={()=>void mark('added')}>Add opt-out to this message</button>}
   {state.choice&&<button type="button" disabled={disabled} onClick={()=>void mark(null)}>Undo opt-out change</button>}
  </div>
  {error&&<OperatorState kind="error">{error}</OperatorState>}
 </div>;
}
