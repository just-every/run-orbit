import './assistance.css';
import {AssistanceRequestPreview,type AssistancePreview} from './assistance-preview';
import { useEffect,useState } from 'react';
import { Link } from '@tanstack/react-router';
import {operatorApi,type OpportunityDetail} from './operator-api';
import { OperatorShell,OperatorState } from './operator-shell';
async function request<T>(path:string,body:unknown):Promise<T> {const r=await fetch(`/api/v1/assistance/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json() as T & {error?:string};if(!r.ok)throw new Error(data.error??'Assistance request failed.');return data;}
/** Semantic integration of 12ui request-preview design a, preserving its sections. */
export function AssistancePage({opportunityId}:{opportunityId:string}) {
 const [preview,setPreview]=useState<AssistancePreview|null>(null),[feature,setFeature]=useState<'draft'|'explanation'>('draft'),[contactId,setContactId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<{draftId?:string;output:{explanation:string}}|null>(null);
 const [ready,setReady]=useState(false);
 const [contacts,setContacts]=useState<OpportunityDetail['contacts']>([]);
 useEffect(()=>{setReady(false);let active=true;void operatorApi.readOpportunity(opportunityId).then(data=>{if(active){setContacts(data.opportunity.contacts);setReady(true);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[opportunityId]);
 async function prepare(){setBusy(true);setError('');setResult(null);try{setPreview(await request('preview',{opportunityId,feature,...(contactId?{contactId}:{})}));}catch(e){setError(e instanceof Error?e.message:'Unable to prepare request.');}finally{setBusy(false);}}
 async function generate(){if(!preview)return;setBusy(true);setError('');try{setResult(await request('generate',{previewId:preview.id}));setPreview(null);}catch(e){setError(e instanceof Error?e.message:'Generation failed.');setPreview(null);}finally{setBusy(false);}}
 return <div className="assistance-page"><OperatorShell eyebrow="AI follow-up request" title="Review and confirm your follow-up" action={<Link to="/app/opportunities/$id" params={{id:opportunityId}}>← Back to opportunity</Link>}>
  <p className="assistance-intro">This request uses only the fields and instructions shown below. Review the generated draft before approving any message.</p>
  {error&&<OperatorState kind="error">{error}</OperatorState>}
  {!preview&&<form className="assistance-card assistance-prepare" onSubmit={e=>{e.preventDefault();void prepare();}}>
   <label>Request <select value={feature} onChange={e=>setFeature(e.target.value as 'draft'|'explanation')}><option value="draft">Email draft</option><option value="explanation">Recommendation explanation</option></select></label>
   <label>Recipient<select value={contactId} onChange={e=>setContactId(e.target.value)}><option value="">Primary contact</option>{contacts.map(contact=><option key={contact.id} value={contact.id}>{contact.name??contact.email??"Unnamed contact"}{contact.name&&contact.email?` · ${contact.email}`:""}{contact.contactability!=="contactable"?" · Do not contact":""}</option>)}</select></label>
   <button className="operator-button" disabled={busy||!ready}>{busy?'Preparing…':'Preview request'}</button>
  </form>}
  {preview&&<AssistanceRequestPreview preview={preview} feature={feature} opportunityId={opportunityId} recipientLabel={contactId?'Selected contact':'Primary contact'} busy={busy} onRevise={()=>setPreview(null)} onGenerate={()=>void generate()}/>}
  {result&&<section className="operator-surface operator-detail__section"><h2>Generated for review</h2><p>{result.output.explanation}</p>{result.draftId?<Link className="operator-button" to="/app/drafts/$id" params={{id:result.draftId}}>Review saved draft</Link>:<Link to="/app/opportunities/$id" params={{id:opportunityId}}>View recommendation</Link>}</section>}
 </OperatorShell></div>;
}
