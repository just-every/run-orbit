import {useEffect,useState} from 'react';
import {recordsRequest} from './records-api';
const reviewSets=[
 {key:'contacts',title:'Owned contacts',label:'contacts'},
 {key:'companies',title:'Owned companies',label:'companies'},
 {key:'opportunities',title:'Open opportunities',label:'opportunities'},
 {key:'tasks',title:'Open sales tasks',label:'tasks'},
 {key:'handoffs',title:'Open handoffs',label:'handoffs'},
 {key:'recordMailObligations',title:'Open contact follow-up promises',label:'contact follow-up promises'}
] as const;
export function OperatorRemovalReview({operator,operators,onCancel,onRemoved}:{operator:any;operators:any[];onCancel:()=>void;onRemoved:()=>Promise<void>}){
 const [data,setData]=useState<any>(),[choices,setChoices]=useState<Record<string,string>>({}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){setError('');try{
  const next=await recordsRequest<any>(`settings/operators/${operator.id}/removal-review`);
  setData(next);setChoices(Object.fromEntries(reviewSets.map(({key})=>[key,next[key].length?'choose':'unassigned'])));
 }catch(e){setError((e as Error).message);}}
 useEffect(()=>{void load();},[operator.id]);
 async function remove(){setBusy(true);setError('');try{
  await recordsRequest(`assistance/record-mail/operators/${operator.id}/remove`,'POST',{confirmed:true,handover:{review:data.review,...Object.fromEntries(Object.entries(choices).map(([k,v])=>[k,v==='unassigned'?null:v]))}});
  await onRemoved();
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="operator-surface workbench-form" aria-label="Operator removal review">
  <h3>Hand over {operator.display_name}’s work</h3>
  <p>Removal revokes their sessions and cancels their scheduled messages. Notes and completed work keep their attribution.</p>
  {data?reviewSets.map(({key,title,label})=><section key={key}>
   <h4>{title} ({data[key].length})</h4>
   <ul>{data[key].map((row:any)=><li key={row.id} style={{overflowWrap:'anywhere'}}>
    {key==='recordMailObligations'?<>{row.subject} · {row.contact_name||row.contact_email}</>:row.title}
   </li>)}</ul>
   {data[key].length?<label style={{display:'grid',gap:8}}>Receiving operator for {label}
    <select aria-label={`Receiving operator for ${label}`} style={{width:'100%',maxWidth:'100%',minWidth:0,minHeight:44}} value={choices[key]} disabled={busy} onChange={e=>setChoices({...choices,[key]:e.target.value})}>
     <option value="choose">Choose a handover</option><option value="unassigned">Explicitly leave unassigned</option>
     {operators.filter(o=>o.status==='active'&&!o.collaborator&&o.id!==operator.id).map(o=><option key={o.id} value={o.id}>{o.display_name}</option>)}
    </select>
   </label>:<p>No open work in this set.</p>}
  </section>):<p>Loading owned work…</p>}
  {data?<p>{data.scheduledMessages.length} scheduled message(s) will be cancelled.</p>:null}
  {error?<p role="alert">{error} <button disabled={busy} onClick={()=>void load()}>Reload removal review</button></p>:null}
  <div className="workbench-actions"><button onClick={onCancel} disabled={busy}>Keep operator</button><button className="operator-button" disabled={busy||!data||Object.values(choices).includes('choose')} onClick={()=>void remove()}>{busy?'Handing over…':'Confirm handover and remove'}</button></div>
 </section>;
}
