import { useEffect,useState } from 'react';
import type { RecordKind } from './records-api';
interface Colleague {id:string;name:string;email:string}
/** RECORD-017: while the text ends in an @name being typed, offer the active colleagues that match. */
export function MentionSuggestions({text,onPick}:{text:string;onPick:(next:string)=>void}){
 const [colleagues,setColleagues]=useState<Colleague[]>([]);
 useEffect(()=>{void fetch('/api/v1/records/mentionable',{credentials:'same-origin'}).then(async r=>r.ok?(await r.json()) as {colleagues:Colleague[]}:{colleagues:[]}).then(data=>setColleagues(data.colleagues));},[]);
 const typed=/(?:^|\s)@([^@\n]{0,40})$/.exec(text);if(!typed)return null;
 const query=typed[1]!.toLowerCase(),matches=colleagues.filter(c=>c.name.toLowerCase().startsWith(query)||c.email.toLowerCase().startsWith(query)).slice(0,5);
 if(!matches.length)return null;
 return <div className="mention-suggestions" role="listbox" aria-label="Mention a colleague">{matches.map(c=><button type="button" role="option" aria-selected="false" key={c.id} onClick={()=>onPick(`${text.slice(0,text.length-typed[1]!.length)}${c.name} `)}><strong>{c.name}</strong> <span>{c.email}</span></button>)}</div>;
}
/** A mentioned collaborator the save refused: they cannot see the record (share), or their grant leaves out its notes, calls and meetings (entries). */
export interface UnreachedColleague {id:string;name:string;ask:'share'|'entries';grantId:string|null}
/** Before saving, a mention of a collaborator who cannot open it asks the author to share the record with its notes, calls and meetings,
 * or turn those on for their grant, explicitly, or to remove the mention (RECORD-017; ct, 19 October). */
export function MentionAccessPrompt({colleagues,kind,recordId,onShared,onRemove}:{colleagues:UnreachedColleague[];kind:RecordKind;recordId:string;onShared:()=>void;onRemove:(name:string)=>void}){
 const [error,setError]=useState(''),noun=kind==='opportunity'?'deal':kind,grants='/api/v2/access/workspaces/workspace/grants';
 async function share(colleague:UnreachedColleague){setError('');const response=colleague.grantId?await fetch(`${grants}/${encodeURIComponent(colleague.grantId)}/entries`,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({include:true})}):await fetch(grants,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({subjectKind:'operator',subjectId:colleague.id,resourceType:kind,resourceId:recordId,actions:['graph.read','entries.read'],fields:['*'],purpose:'Shared with notes, calls and meetings to mention them',expiresAt:null})});if(response.ok)onShared();else setError(((await response.json().catch(()=>({}))) as {error?:string}).error??'Only the installation owner can share records until TEAM-005; remove the mention instead.');}
 return <div role="alert" className="mention-access">{colleagues.map(c=><div key={c.id}><p><strong>{c.name}</strong> {c.ask==='share'?`cannot see this ${noun}.`:`can see this ${noun}, but not its notes, calls and meetings.`} A mention never grants access.</p><div className="workbench-actions"><button type="button" onClick={()=>void share(c)}>{c.ask==='share'?`Share this ${noun} with ${c.name}, including notes, calls and meetings`:c.grantId?`Include notes, calls and meetings for ${c.name} on this ${noun}`:`Share this ${noun}'s notes, calls and meetings with ${c.name}`}</button><button type="button" onClick={()=>onRemove(c.name)}>Remove the mention</button></div></div>)}{error&&<p>{error}</p>}</div>;
}
