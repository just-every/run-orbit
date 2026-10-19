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
/** Before saving, a mention of someone who cannot see the record asks the author to share it explicitly or remove the mention. */
export function MentionAccessPrompt({colleagues,kind,recordId,onShared,onRemove}:{colleagues:{id:string;name:string}[];kind:RecordKind;recordId:string;onShared:()=>void;onRemove:(name:string)=>void}){
 const [error,setError]=useState('');
 async function share(colleague:{id:string;name:string}){setError('');const response=await fetch('/api/v2/access/workspaces/workspace/grants',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({subjectKind:'operator',subjectId:colleague.id,resourceType:kind,resourceId:recordId,actions:['graph.read'],fields:['*'],purpose:'Shared to mention them',expiresAt:null})});if(response.ok)onShared();else setError(((await response.json().catch(()=>({}))) as {error?:string}).error??'Only the installation owner can share records until TEAM-005; remove the mention instead.');}
 return <div role="alert" className="mention-access">{colleagues.map(c=><div key={c.id}><p><strong>{c.name}</strong> cannot see this {kind==='opportunity'?'deal':kind}. A mention never grants access.</p><div className="workbench-actions"><button type="button" onClick={()=>void share(c)}>Share this {kind==='opportunity'?'deal':kind} with {c.name}</button><button type="button" onClick={()=>onRemove(c.name)}>Remove the mention</button></div></div>)}{error&&<p>{error}</p>}</div>;
}
