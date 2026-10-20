import './library.css';
import {useEffect,useState} from 'react';
import type {OperatorDraft} from '../../operator/ui/operator-api';
import {libraryRequest,type LibraryState} from './library-api';
export function DraftLibraryPicker({draft,disabled,onApplied}:{draft:OperatorDraft;disabled:boolean;onApplied:()=>void}){
 const [state,setState]=useState<LibraryState|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[selection,setSelection]=useState<Record<string,string>>({});
 useEffect(()=>{void libraryRequest<LibraryState>().then(setState).catch(error=>setError(error.message));},[]);
 async function apply(){setBusy(true);setError('');try{await libraryRequest(`/drafts/${draft.id}/apply`,'POST',{revision:draft.revision,...Object.fromEntries(Object.entries(selection).filter(([,value])=>value))});onApplied();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <details className="operator-library-picker"><summary>Use a template, snippet or signature</summary><p><a href="/app/library">Manage message library</a>. Applying content saves a new draft revision. Review its merge values below before approval.</p>{state&&<><div className="library-choices">{(['template','snippet','signature']as const).map(kind=><label key={kind}>{kind[0]!.toUpperCase()+kind.slice(1)}<select aria-label={`Library ${kind}`} value={selection[`${kind}Id`]??''} onChange={e=>setSelection({...selection,[`${kind}Id`]:e.target.value})}><option value="">Choose {kind}</option>{state.entries.filter(entry=>entry.kind===kind).map(entry=><option key={entry.id} value={entry.id}>{entry.name} · r{entry.revision} · {entry.visibility}</option>)}</select></label>)}</div><button type="button" disabled={disabled||busy||draft.isStale||!Object.values(selection).some(Boolean)} onClick={()=>void apply()}>Apply selected content</button></>}{error&&<p role="alert">{error}</p>}</details>;
}
