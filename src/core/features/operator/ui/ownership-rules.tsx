import {useEffect,useState} from 'react';
import {recordsRequest} from './records-api';
import type {OwnershipRules} from '../../ownership/rules';
export function OwnershipRuleSettings(){
 const [data,setData]=useState<any>(),[rules,setRules]=useState<OwnershipRules>(),[preview,setPreview]=useState<any>(),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
 useEffect(()=>{void recordsRequest<any>('settings/assignment-rules').then(result=>{setData(result);setRules(result.rules);}).catch(e=>setError(e.message));},[]);
 async function run(apply:boolean){setBusy(true);setError('');try{if(apply){const result=await recordsRequest<any>('settings/assignment-rules/apply','POST',{previewId:preview.id});setData(result);setRules(result.rules);setPreview(undefined);setSaved(true);}else setPreview(await recordsRequest('settings/assignment-rules/preview','POST',rules));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="operator-surface workbench-form" aria-label="Assignment rules"><h2>Assignment rules</h2>
  {error?<p role="alert">{error}</p>:null}
  {rules?<><label>Company-to-contact owner<select aria-label="Company-to-contact owner" value={rules.company} disabled={!data.editable||busy} onChange={e=>{setRules({...rules,company:e.target.value as OwnershipRules['company']});setPreview(undefined);setSaved(false);}}><option value="off">Off</option><option value="unowned">Fill unowned primary contacts</option><option value="always">Always match the primary company owner</option></select></label>
   <label><input type="checkbox" checked={rules.firstEmail} disabled={!data.editable||busy} onChange={e=>{setRules({...rules,firstEmail:e.target.checked});setPreview(undefined);setSaved(false);}}/>Assign an unowned contact on their first accepted one-to-one email</label>
   <p>Always match also unassigns contacts when their company is unassigned. Rule configuration is local to this installation and starts off after a restore.</p>
   {data.editable?<button disabled={busy} onClick={()=>void run(false)}>Preview assignment rules</button>:<p>The installation owner configures these rules.</p>}
   {preview?<section aria-label="Assignment rule preview"><h3>Review affected contacts ({preview.changes.length})</h3><ul>{preview.changes.map((row:any)=><li key={row.recordId}>{row.name}: {row.previousOwner} → {row.newOwner}</li>)}</ul><p>First email applies to future accepted messages. Existing owners are kept.</p><button disabled={busy} onClick={()=>void run(true)}>Apply reviewed rules</button></section>:null}
   {saved?<p role="status">Saved</p>:null}
  </>:<p>Loading assignment rules…</p>}
 </section>;
}
