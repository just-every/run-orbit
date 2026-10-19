import { useCallback,useEffect,useState } from 'react';
import { workbenchRequest } from './workbench-api';
import { OperatorState } from './operator-shell';
export interface OptOutState {setting:boolean;removalAllowed:boolean;choice:'relationship'|'transactional'|'added'|null;transport:boolean;carries:boolean;marking:string|null;reply:boolean;refusal:string|null}
/** OUT-020: the opt-out state this approval binds, and the rep's marking. Changing it makes the draft need review again. */
export function DraftOptOut({draftId,disabled,onState,onChanged}:{draftId:string;disabled:boolean;onState:(state:OptOutState|null)=>void;onChanged:()=>void}){
 const [state,setState]=useState<OptOutState|null>(null),[error,setError]=useState('');
 const load=useCallback(async()=>{try{const next=await workbenchRequest<OptOutState>(`/drafts/${draftId}/opt-out`);setState(next);onState(next);}catch(e){setError((e as Error).message);onState(null);}},[draftId]);
 useEffect(()=>{void load();},[load]);
 async function mark(choice:OptOutState['choice']){try{setError('');await workbenchRequest(`/drafts/${draftId}/opt-out`,{choice});await load();onChanged();}catch(e){setError((e as Error).message);}}
 if(!state)return error?<OperatorState kind="error">{error}</OperatorState>:null;
 return <div className="draft-opt-out" data-testid="draft-opt-out">
  <p><strong>Opt-out:</strong> {state.carries?'included — List-Unsubscribe headers and the provider’s unsubscribe footer shown below':'not included — no List-Unsubscribe header and no unsubscribe footer'}.</p>
  {state.refusal&&<p role="alert"><strong>{state.refusal}.</strong> This message needs opt-out and is not a reply to the recipient’s own email in this thread, so Orbit will not send it through the managed mail relay.</p>}
  <p>{state.refusal?'Only a reply in a thread the recipient has answered can be sent without opt-out until then.':state.marking==='transport'?'This replies to the recipient’s own email in this thread, so it is sent without opt-out: the managed mail relay cannot add Orbit’s opt-out yet (OUT-013).':state.marking==='relationship'||state.marking==='transactional'?`You removed opt-out from this message as ${state.marking} mail.`:state.marking==='added'?'You added opt-out to this message.':state.setting?'One-to-one email carries opt-out (Settings → Opt-out links).':'One-to-one email carries no opt-out by default (Settings → Opt-out links).'}</p>
  <div className="draft-opt-out__actions">
   {state.setting&&!state.choice&&state.removalAllowed&&<><button type="button" disabled={disabled} onClick={()=>void mark('relationship')}>Remove: relationship mail</button><button type="button" disabled={disabled} onClick={()=>void mark('transactional')}>Remove: transactional mail</button></>}
   {!state.setting&&!state.choice&&<button type="button" disabled={disabled} onClick={()=>void mark('added')}>Add opt-out to this message</button>}
   {state.choice&&<button type="button" disabled={disabled} onClick={()=>void mark(null)}>Undo opt-out change</button>}
  </div>
  {error&&<OperatorState kind="error">{error}</OperatorState>}
 </div>;
}
