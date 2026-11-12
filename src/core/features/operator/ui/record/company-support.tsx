import {useCallback,useState} from 'react';
import {recordsRequest,type CustomerRecord} from '../records-api';
import {useOperatorResource} from '../use-operator-resource';
import {OperatorState} from '../operator-shell';
import {formatDateTime} from '../formatters';
import {contextFields,type HandoffInput} from '../../../support/contracts';
interface Ticket {id:string;state:string;summary?:string;severity?:string|null;status?:string;lastUpdate?:string;link?:string;reason?:string}
interface Support {state:string;reason:string|null;ownership:string;organization?:{id:string;name:string;link:string};tickets:Ticket[]}
interface MappingPreview {digest:string;company:{name:string;domain:string|null};organization:{id:string;name:string;domains:string[]};subdomain:string}
interface HandoffPreview {digest:string;ticket:{subject:string;comment:{body:string;public:boolean}}}
const fieldLabels={companyName:'Company name',companyDomain:'Company domain',contactName:'Chosen contact name'};
export function CompanySupport({id,contacts,onChanged}:{id:string;contacts:CustomerRecord[];onChanged:()=>void}){
 const path=`support/zendesk/companies/${id}`,resource=useOperatorResource(`support:${id}`,useCallback(()=>recordsRequest<Support>(path),[path]));
 const [editing,setEditing]=useState(false),[organization,setOrganization]=useState(''),[mapping,setMapping]=useState<MappingPreview|null>(null),[writing,setWriting]=useState(false),[title,setTitle]=useState(''),[fields,setFields]=useState<HandoffInput['fields']>(['companyName']),[contactId,setContactId]=useState(''),[preview,setPreview]=useState<HandoffPreview|null>(null),[operation,setOperation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const data=resource.data;
 const chosen=():HandoffInput=>({title,fields,...(fields.includes('contactName')?{contactId}:{})});
 async function run(action:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await action();}catch(e){setError((e as Error).message);resource.reload();}finally{setBusy(false);}}
 const changed=()=>{setPreview(null);setOperation('');};
 return <section className="operator-surface workbench-form" aria-labelledby="company-support-title" data-testid="company-support" style={{marginTop:24,fontSize:14,overflowWrap:'anywhere',minWidth:0}}>
  <h2 id="company-support-title">Zendesk support</h2><p>{data?.ownership??'Support replies and SLA work stay in Zendesk.'}</p>
  {resource.error?<OperatorState kind="error">{resource.error.message}</OperatorState>:null}{error?<p role="alert">{error}</p>:null}{notice?<p role="status">{notice}</p>:null}
  {data?<><p role="status"><strong>{data.state==='available'?'Current ticket summaries':'Support unavailable'}</strong>{data.reason?` · ${data.reason}`:''}</p>
   {data.organization?<p><a href={data.organization.link} target="_blank" rel="noreferrer">{data.organization.name} in Zendesk</a></p>:null}
   <p>Only summary, priority, status and last update are shown. Descriptions, comments and attachments stay in Zendesk.</p>
   {data.tickets.length?<ul className="settings-rows">{data.tickets.map(ticket=><li key={ticket.id} style={{minWidth:0}}>{ticket.state==='available'?<><a href={ticket.link} target="_blank" rel="noreferrer">#{ticket.id} · {ticket.summary}</a><p>Priority: {ticket.severity??'Not set'} · {ticket.status} · Updated {formatDateTime(ticket.lastUpdate!)}</p></>:<p>Ticket #{ticket.id} unavailable · {ticket.reason}</p>}</li>)}</ul>:data.state==='available'?<p>No readable tickets in this organization.</p>:null}
   <div className="workbench-actions"><button type="button" disabled={busy} onClick={()=>resource.reload()}>Refresh support</button><button type="button" onClick={()=>{setEditing(!editing);setMapping(null);}}>Review organization mapping</button>{data.organization&&data.state==='available'?<button type="button" onClick={()=>{setWriting(!writing);changed();}}>Prepare support handoff</button>:null}</div>
   {editing?<form className="workbench-form" onSubmit={e=>{e.preventDefault();void run(async()=>setMapping(await recordsRequest<MappingPreview>(`${path}/mapping-preview`,'POST',{organizationId:organization})));}}>
    <label>Zendesk organization ID<input required inputMode="numeric" value={organization} onChange={e=>{setOrganization(e.target.value);setMapping(null);}}/></label><p>The company name and domain must match, and the organization must not be linked elsewhere.</p><button disabled={busy}>Preview organization mapping</button>
    {mapping?<div role="group" aria-label="Reviewed organization mapping"><p>Map {mapping.company.name}{mapping.company.domain?` (${mapping.company.domain})`:''} to {mapping.organization.name} · organization {mapping.organization.id} at {mapping.subdomain}.zendesk.com.</p><button type="button" disabled={busy} onClick={()=>void run(async()=>{await recordsRequest(`${path}/mapping`,'PUT',{organizationId:mapping.organization.id,digest:mapping.digest,confirmed:true});setEditing(false);setMapping(null);resource.reload();setNotice('Reviewed organization mapping saved.');})}>Confirm organization mapping</button></div>:null}
   </form>:null}
   {writing?<form className="workbench-form" onSubmit={e=>{e.preventDefault();void run(async()=>{setPreview(await recordsRequest<HandoffPreview>(`${path}/handoff-preview`,'POST',chosen()));setOperation(crypto.randomUUID());});}}>
    <h3>Review a support handoff</h3><label>Support ticket title<input required maxLength={160} value={title} onChange={e=>{setTitle(e.target.value);changed();}}/></label>
    <fieldset><legend>Record context to include</legend>{contextFields.map(field=><label key={field}><input type="checkbox" checked={fields.includes(field)} onChange={e=>{setFields(e.target.checked?[...fields,field]:fields.filter(f=>f!==field));changed();}}/>{fieldLabels[field]}</label>)}</fieldset>
    {fields.includes('contactName')?<label>Company contact<select required value={contactId} onChange={e=>{setContactId(e.target.value);changed();}}><option value="">Choose a contact</option>{contacts.map(contact=><option key={contact.id} value={contact.id}>{contact.name??'Unnamed contact'}</option>)}</select></label>:null}
    <p>The chosen context becomes an internal Zendesk comment. No ticket reply, description or attachment is copied back.</p><button disabled={busy||!fields.length}>Preview exact handoff</button>
    {preview?<div role="group" aria-label="Reviewed support handoff"><h4>{preview.ticket.subject}</h4><p style={{whiteSpace:'pre-wrap'}}>{preview.ticket.comment.body}</p><button type="button" disabled={busy} onClick={()=>void run(async()=>{const result=await recordsRequest<{state:string;link:string|null}>(`${path}/handoffs`,'POST',{...chosen(),digest:preview.digest,operationId:operation,confirmed:true});setNotice(result.state==='created'?'Handoff created in Zendesk. Support will work there.':`Handoff ${result.state}. Inspect Zendesk before creating another.`);setWriting(false);changed();resource.reload();onChanged();})}>Confirm and create one ticket</button></div>:null}
   </form>:null}
   <a href="/app/settings/integrations">Zendesk connection settings</a>
  </>:!resource.error?<OperatorState>Loading current support…</OperatorState>:null}
 </section>;
}
