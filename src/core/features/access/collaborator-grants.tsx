import {useEffect,useState} from 'react';
import {api} from '../fold-ui/workspace';
import {grantableFields,grantFieldLabel,recordKinds,recordName} from './grant-fields';
interface Member{operator_id:string;email:string;access_class:string;status:string}
interface Grant{id:string;subject_id:string;resource_type:string;resource_id:string;actions_json:string;fields_json:string;purpose:string;revoked_at:string|null}
type Projection={ref:{id:string};fields:Record<string,unknown>};
type Act=(work:()=>Promise<void>)=>void;

/** Grants are chosen from real records and their named fields; IDs stay behind the picker. */
export function CollaboratorGrants({base,workspaceId,members,grants,busy,act,setStatus}:{base:string;workspaceId:string;members:Member[];grants:Grant[];busy:boolean;act:Act;setStatus:(text:string)=>void}){
 const records=`/api/v2/workspaces/${encodeURIComponent(workspaceId)}/records`;
 const [kind,setKind]=useState('contact'),[query,setQuery]=useState(''),[found,setFound]=useState<Projection[]>([]),[recordId,setRecordId]=useState(''),[record,setRecord]=useState<Projection|null>(null),[fields,setFields]=useState<string[]>([]),[searchError,setSearchError]=useState('');
 const collaborators=members.filter(m=>m.access_class==='collaborator'&&m.status==='active');
 useEffect(()=>{let live=true;setSearchError('');api<{items:Projection[]}>(`${records}?${new URLSearchParams({kind,q:query})}`).then(result=>{if(live)setFound(result.items);}).catch(e=>{if(live){setFound([]);setSearchError(e instanceof Error?e.message:'Records could not be read.');}});return()=>{live=false;};},[records,kind,query]);
 useEffect(()=>{setFields([]);if(!recordId){setRecord(null);return;}let live=true;api<Projection>(`${records}/${kind}/${encodeURIComponent(recordId)}`).then(result=>{if(live)setRecord(result);}).catch(()=>{if(live)setRecord(null);});return()=>{live=false;};},[records,kind,recordId]);
 const choices=record?grantableFields(record.fields):[];
 return <section className="fold-panel"><h2>Share a record with a collaborator</h2>
  <p>A Guest sees only what you share here. Choose the person, find the record by name, then tick the fields they may see or edit.</p>
  {collaborators.length?null:<p>No one has accepted an invitation yet. Once a collaborator accepts, you can share records with them here.</p>}
  <form onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);void act(async()=>{await api(`${base}/grants`,{subjectKind:'operator',subjectId:String(form.get('subject')),resourceType:kind,resourceId:recordId,actions:[String(form.get('action'))],fields,purpose:String(form.get('purpose')),expiresAt:null});setStatus(`Shared ${record?recordName(record.fields):'the record'}. The collaborator sees the change on their next page load.`);setFields([]);});}}>
   <div className="fold-grid">
    <label>Collaborator<select name="subject" required><option value="">Choose collaborator</option>{collaborators.map(m=><option value={m.operator_id} key={m.operator_id}>{m.email}</option>)}</select></label>
    <label>Record type<select value={kind} onChange={event=>{setKind(event.target.value);setRecordId('');setQuery('');}}>{recordKinds.map(k=><option key={k.value} value={k.value}>{k.label}</option>)}</select></label>
    <label>Find by name<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Start typing a name"/></label>
    <label>Record<select required value={recordId} onChange={event=>setRecordId(event.target.value)}><option value="">{found.length?`Choose one of ${found.length} ${found.length===1?'match':'matches'}`:'No matching records'}</option>{found.map(item=><option key={item.ref.id} value={item.ref.id}>{recordName(item.fields)}</option>)}</select></label>
   </div>
   {searchError?<p role="alert">{searchError}</p>:null}
   <fieldset disabled={!record}><legend>Fields they may use</legend>
    {record?<div className="fold-grid">{choices.map(field=><label key={field} className="fold-check"><input type="checkbox" checked={fields.includes(field)} onChange={event=>setFields(event.target.checked?[...fields,field]:fields.filter(f=>f!==field))}/>{grantFieldLabel(field)}</label>)}</div>:<p>Choose a record to see its fields.</p>}
   </fieldset>
   <div className="fold-grid">
    <label>They may<select name="action"><option value="graph.read">See these fields</option><option value="graph.update">See and edit these fields</option></select></label>
    <label>Why (kept with the grant)<input name="purpose" required maxLength={1000} placeholder="For example: helping with the renewal"/></label>
   </div>
   <button disabled={busy||!record||!fields.length}>Share these fields</button>
  </form>
  {grants.filter(g=>!g.revoked_at).map(grant=><GrantRow key={grant.id} grant={grant} records={records} member={members.find(m=>m.operator_id===grant.subject_id)} busy={busy} onRevoke={()=>act(async()=>{await api(`${base}/grants/${grant.id}`,undefined,'DELETE');setStatus('Grant revoked.');})}/>)}
 </section>;
}

function GrantRow({grant,records,member,busy,onRevoke}:{grant:Grant;records:string;member?:Member;busy:boolean;onRevoke:()=>void}){
 const [name,setName]=useState('');
 useEffect(()=>{let live=true;api<Projection>(`${records}/${grant.resource_type}/${encodeURIComponent(grant.resource_id)}`).then(r=>{if(live)setName(recordName(r.fields));}).catch(()=>{if(live)setName('A record that no longer exists');});return()=>{live=false;};},[records,grant.resource_type,grant.resource_id]);
 const kind=recordKinds.find(k=>k.value===grant.resource_type)?.label??grant.resource_type,fields=(JSON.parse(grant.fields_json) as string[]).map(grantFieldLabel),edit=(JSON.parse(grant.actions_json) as string[]).includes('graph.update');
 return <div className="fold-row"><h3>{kind}: {name||'…'}</h3><p>{member?.email??'Removed collaborator'} may {edit?'see and edit':'see'}: {fields.join(', ')}</p><p>Why: {grant.purpose}</p><button disabled={busy} onClick={onRevoke}>Revoke grant</button></div>;
}
