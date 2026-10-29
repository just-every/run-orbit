import {useEffect,useState} from 'react';
import {api} from '../fold-ui/workspace';
import {fieldListLabel,grantableFields,grantFieldLabel,recordKinds,recordName} from './grant-fields';
interface Member{operator_id:string;email:string;access_class:string;status:string}
interface Grant{id:string;subject_id:string;resource_type:string;resource_id:string;actions_json:string;fields_json:string;purpose:string;revoked_at:string|null}
type Projection={ref:{id:string};fields:Record<string,unknown>};
type Act=(work:()=>Promise<void>)=>void;
/** Editing a field includes seeing it: every read, list and search admits only grants that carry graph.read. */
const grantActions={see:['graph.read'],edit:['graph.read','graph.update']};
/** RECORD-023: the record's notes, calls and meetings join a grant only when the person sharing ticks it; it starts off. */
const entriesAction='entries.read';
/** Sharing a record's Company shares that company's name, so the collaborator reads it as a name rather than an ID. */
const companyOf=(record:Projection)=>typeof record.fields.company_id==='string'?record.fields.company_id:null;

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
  <form onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);void act(async()=>{const subjectId=String(form.get('subject')),purpose=String(form.get('purpose'));await api(`${base}/grants`,{subjectKind:'operator',subjectId,resourceType:kind,resourceId:recordId,actions:[...grantActions[String(form.get('action')) as keyof typeof grantActions],...(form.get('entries')==='on'?[entriesAction]:[])],fields,purpose,expiresAt:null});const company=fields.includes('company_id')&&record?companyOf(record):null;if(company)await api(`${base}/grants`,{subjectKind:'operator',subjectId,resourceType:'company',resourceId:company,actions:grantActions.see,fields:['name'],purpose,expiresAt:null});setStatus(`Shared ${record?recordName(record.fields):'the record'}${company?' and its company name':''}. The collaborator sees the change on their next page load.`);setFields([]);});}}>
   <div className="fold-grid">
    <label>Collaborator<select name="subject" required><option value="">Choose collaborator</option>{collaborators.map(m=><option value={m.operator_id} key={m.operator_id}>{m.email}</option>)}</select></label>
    <label>Record type<select value={kind} onChange={event=>{setKind(event.target.value);setRecordId('');setQuery('');}}>{recordKinds.map(k=><option key={k.value} value={k.value}>{k.label}</option>)}</select></label>
    <label>Find by name<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Start typing a name"/></label>
    <label>Record<select required value={recordId} onChange={event=>setRecordId(event.target.value)}><option value="">{found.length?`Choose one of ${found.length} ${found.length===1?'match':'matches'}`:'No matching records'}</option>{found.map(item=><option key={item.ref.id} value={item.ref.id}>{recordName(item.fields)}</option>)}</select></label>
   </div>
   {searchError?<p role="alert">{searchError}</p>:null}
   <fieldset disabled={!record}><legend>Fields they may use</legend>
    {record?<><div className="fold-grid">{choices.map(field=><label key={field} className="fold-check"><input type="checkbox" checked={fields.includes(field)} onChange={event=>setFields(event.target.checked?[...fields,field]:fields.filter(f=>f!==field))}/>{grantFieldLabel(field)}</label>)}</div>{companyOf(record)?<p className="fold-hint">Sharing Company also lets them see that company's name.</p>:null}</>:<p>Choose a record to see its fields.</p>}
   </fieldset>
   <div className="fold-grid">
    <label>They may<select name="action"><option value="see">See these fields</option><option value="edit">See and edit these fields</option></select></label>
    <label>Why (kept with the grant)<input name="purpose" required maxLength={1000} placeholder="For example: helping with the renewal"/></label>
   </div>
   <label className="fold-check"><input type="checkbox" name="entries"/>Include notes, calls and meetings on this record (read-only)</label>
   <button disabled={busy||!record||!fields.length}>Share these fields</button>
  </form>
  {grants.filter(g=>!g.revoked_at).map(grant=><GrantRow key={grant.id} grant={grant} records={records} member={members.find(m=>m.operator_id===grant.subject_id)} busy={busy} onRevoke={()=>act(async()=>{await api(`${base}/grants/${grant.id}`,undefined,'DELETE');setStatus('Grant revoked.');})} onEntries={include=>act(async()=>{await api(`${base}/grants/${grant.id}/entries`,{include},'PUT');setStatus(include?'Notes, calls and meetings are now shared with this grant.':'Notes, calls and meetings are no longer shared with this grant.');})}/>)}
 </section>;
}

function GrantRow({grant,records,member,busy,onRevoke,onEntries}:{grant:Grant;records:string;member?:Member;busy:boolean;onRevoke:()=>void;onEntries:(include:boolean)=>void}){
 const [name,setName]=useState('');
 // A read that crosses another access change is refused as stale; read the record again before calling it gone.
 useEffect(()=>{let live=true;const read=(retry:boolean):Promise<void>=>api<Projection>(`${records}/${grant.resource_type}/${encodeURIComponent(grant.resource_id)}`).then(r=>{if(live)setName(recordName(r.fields));}).catch(error=>{if(retry&&error instanceof Error&&error.message.startsWith('Permissions changed'))return read(false);if(live)setName('A record that no longer exists');});void read(true);return()=>{live=false;};},[records,grant.resource_type,grant.resource_id]);
 const kind=recordKinds.find(k=>k.value===grant.resource_type)?.label??grant.resource_type,fields=fieldListLabel(JSON.parse(grant.fields_json) as string[]),actions=JSON.parse(grant.actions_json) as string[],edit=actions.includes('graph.update'),entries=actions.includes(entriesAction),single=grant.resource_id!=='*'&&recordKinds.some(k=>k.value===grant.resource_type);
 return <div className="fold-row"><h3>{kind}: {name||'…'}</h3><p>{member?.email??'Removed collaborator'} may {edit?'see and edit':'see'}: {fields}</p><p>Why: {grant.purpose}</p>{single&&<p>{entries?'Includes this record\'s notes, calls and meetings (read-only).':'Notes, calls and meetings are not included.'}</p>}{single&&<button disabled={busy} onClick={()=>onEntries(!entries)}>{entries?'Stop sharing notes, calls and meetings':'Include notes, calls and meetings'}</button>}<button disabled={busy} onClick={onRevoke}>Revoke grant</button></div>;
}
