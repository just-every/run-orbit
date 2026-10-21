import {useEffect,useState} from 'react';
import {api} from '../fold-ui/workspace';
import './sales.css';

/** REPORT-001 sharing for any saved report: private, named people or the workspace. Sharing never grants record access. */
export type Audience='private'|'operators'|'workspace';
export interface Member{id:string;name:string;email:string;collaborator:number}
interface SharingState{audience:Audience;ownerId:string|null;operatorIds:string[];revision:number;canManage:boolean;members:Member[]}
const toggle=(values:string[],value:string,on:boolean)=>on?[...new Set([...values,value])]:values.filter(item=>item!==value);
const audienceLabels:Record<Audience,string>={private:'Private',operators:'Shared with named people',workspace:'Shared with the workspace'};

export function SharingChoice({audience,named,members,onAudience,onNamed,legend}:{audience:Audience;named:string[];members:Member[];onAudience:(value:Audience)=>void;onNamed:(value:string[])=>void;legend:string}){
 return <fieldset><legend>{legend}</legend>
  {([['private','Only me (and the installation owner)'],['operators','Named people'],['workspace','Everyone in the workspace who can read reports']] as const).map(([value,label])=><label key={value} className="sales-check"><input type="radio" name={legend} checked={audience===value} onChange={()=>onAudience(value)}/>{label}</label>)}
  {audience==='operators'&&<div className="sales-members">{members.map(member=><label key={member.id} className="sales-check"><input type="checkbox" checked={named.includes(member.id)} onChange={event=>onNamed(toggle(named,member.id,event.target.checked))}/>{member.name} ({member.email}{member.collaborator?', collaborator':''})</label>)}</div>}
  <p>Sharing lets people open the report. It never grants record access: each person sees only what they may read.</p>
 </fieldset>;
}

export function ReportSharing({base,id}:{base:string;id:string}){
 const [state,setState]=useState<SharingState|null>(null),[audience,setAudience]=useState<Audience>('workspace'),[named,setNamed]=useState<string[]>([]),[message,setMessage]=useState('');
 const path=`${base}/reports/${encodeURIComponent(id)}/sharing`;
 useEffect(()=>{let active=true;setState(null);setMessage('');api<SharingState>(path).then(result=>{if(active){setState(result);setAudience(result.audience);setNamed(result.operatorIds);}}).catch(error=>{if(active)setMessage(error instanceof Error?error.message:'Sharing is unavailable.');});return()=>{active=false;};},[path]);
 if(!state)return message?<p className="sales-note" role="alert">{message}</p>:null;
 if(!state.canManage)return <p className="sales-note">{audienceLabels[state.audience]}. Only the report owner or the installation owner changes its sharing.</p>;
 return <details className="fold-panel report-sharing"><summary>Sharing: {audienceLabels[state.audience]}</summary>
  <SharingChoice audience={audience} named={named} members={state.members} onAudience={setAudience} onNamed={setNamed} legend="Who may open this report"/>
  <button type="button" onClick={async()=>{setMessage('');try{const result=await api<SharingState>(path,{audience,operatorIds:audience==='operators'?named:[],revision:state.revision},'PUT');setState(result);setMessage('Sharing saved.');}catch(error){setMessage(error instanceof Error?error.message:'Sharing was not saved.');}}}>Save sharing</button>
  <p role="status">{message}</p>
 </details>;
}
