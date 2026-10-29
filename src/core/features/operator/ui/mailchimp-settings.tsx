import {useEffect,useState} from 'react';
import {recordsRequest} from './records-api';
import {OperatorState} from './operator-shell';
import {formatDateTime} from './formatters';
import {MailchimpPreview} from './mailchimp-preview';
import './mailchimp-settings.css';

interface Status {state:'connected'|'unresolved-setup';reason:string|null;held:boolean;owner:boolean;ownership:string;audience:{name:string;link:string}|null;checkedAt:string|null;webhookCheckedAt:string|null;lastEventAt:string|null;webhookUrl:string|null;fields:string[];deletions:Deletion[]}
interface Deletion {id:string;state:'queued'|'deleted'|'failed'|'uncertain'|'paused'|'held';reason:string|null;requestedAt:string;updatedAt:string;audience:string|null}
const phases={connected:'Connected',unresolved:'Unresolved setup',disconnected:'Not connected · unresolved setup'} as const;
const deletionStates={queued:'Waiting to send',deleted:'Deleted in Mailchimp',failed:'Refused by Mailchimp',uncertain:'Not confirmed yet',paused:'Paused',held:'Held for your confirmation'} as const;
/** INTEGRATE-007: the owner connects one Mailchimp audience; every operator sees its real state and previews the handoff. */
export function MailchimpSettings(){
 const [data,setData]=useState<Status>(),[error,setError]=useState(''),[notice,setNotice]=useState(''),[apiKey,setApiKey]=useState(''),[options,setOptions]=useState<{id:string;name:string;members:number|null}[]>([]),[audience,setAudience]=useState(''),[busy,setBusy]=useState(false);
 const load=async()=>setData(await recordsRequest<Status>('settings/mailchimp'));
 useEffect(()=>{void load().catch(e=>setError((e as Error).message));},[]);
 async function run(path:string,body:unknown,method:string,done:string){setBusy(true);setError('');setNotice('');try{await recordsRequest('settings/mailchimp/'+path,method,body);setNotice(done);await load();window.dispatchEvent(new Event('orbit-products-changed'));}catch(e){setError((e as Error).message);await load().catch(()=>undefined);}finally{setBusy(false);}}
 async function loadAudiences(){setBusy(true);setError('');try{const result=await recordsRequest<{audiences:{id:string;name:string;members:number|null}[]}>('settings/mailchimp/audiences');setOptions(result.audiences);setAudience(result.audiences[0]?.id??'');if(!result.audiences.length)setNotice('This Mailchimp account has no audiences. Create one in Mailchimp, then load audiences again.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const phase=!data?null:data.state==='connected'?'connected':data.held?'unresolved':'disconnected';
 return <section className="workbench-form mailchimp-settings integration-setup" aria-labelledby="mailchimp-settings"><h2 id="mailchimp-settings">Mailchimp audience handoff</h2>
  <p>{data?.ownership??'Mailchimp owns bulk campaigns and marketing automation; Orbit owns individual sales sequences and their outcomes.'} Orbit hands an audience only the contacts whose marketing consent is recorded, never sends a campaign, and treats a Mailchimp unsubscribe or cleaned address as a stop in Orbit.</p>
  {error&&<OperatorState kind="error">{error}</OperatorState>}{notice&&<OperatorState>{notice}</OperatorState>}
  {!data||!phase?<OperatorState>Loading Mailchimp…</OperatorState>:<>
   <div className="mailchimp-state" data-state={phase} role="status"><strong>{phases[phase]}</strong><span>{phase==='connected'?`Audience “${data.audience?.name}”.`:data.reason}</span>{phase==='connected'&&data.audience&&<a className="mailchimp-link" href={data.audience.link} target="_blank" rel="noreferrer">Open the audience in Mailchimp</a>}</div>
   {data.held&&data.checkedAt&&<p>Key last checked {formatDateTime(data.checkedAt)}.{data.lastEventAt?` Last Mailchimp event received ${formatDateTime(data.lastEventAt)}.`:''}</p>}
   {data.owner?<>
    <form className="workbench-form" onSubmit={e=>{e.preventDefault();const key=apiKey;setApiKey('');void run('connect',{apiKey:key},'POST','Mailchimp accepted the key. Choose the audience next.');}}><h3>{data.held?'Replace the API key':'Connect Mailchimp'}</h3><label>Mailchimp API key<input type="password" autoComplete="new-password" required value={apiKey} onChange={e=>setApiKey(e.target.value)}/></label><p>Mailchimp checks the key before Orbit saves it. Orbit encrypts it, never shows it again and never exports it; after a restore, connect again.</p><button className="operator-button" disabled={busy}>Check key and connect</button></form>
    {data.held&&<><h3>Audience</h3><p>Orbit hands contacts to one audience. Choosing it adds one hidden text field, ORBITCONS (“Orbit consent”), which carries each contact’s consent source and basis; nothing else in the audience changes.</p>
     <div className="workbench-actions"><button type="button" disabled={busy} onClick={()=>void loadAudiences()}>Load audiences</button></div>
     {options.length>0&&<form className="workbench-form" onSubmit={e=>{e.preventDefault();void run('audience',{audienceId:audience},'PUT','Audience chosen.');}}><label>Mailchimp audience<select required value={audience} onChange={e=>setAudience(e.target.value)}>{options.map(option=><option key={option.id} value={option.id}>{option.name}{option.members===null?'':` · ${option.members} ${option.members===1?'member':'members'}`}</option>)}</select></label><button className="operator-button" disabled={busy||!audience}>Use this audience</button></form>}
     <div className="workbench-actions"><button type="button" disabled={busy} onClick={()=>void run('check',{},'POST','Mailchimp accepted the saved key.')}>Check connection</button><button type="button" disabled={busy} onClick={()=>void run('disconnect',{},'POST','Mailchimp disconnected. The saved key is deleted.')}>Disconnect Mailchimp</button></div>
     {data.webhookUrl&&<><h3>Unsubscribes from Mailchimp</h3><p>In Mailchimp, open the audience, then Settings and Webhooks. Add this address, and tick Unsubscribes and Cleaned addresses for changes made by subscribers, by account admins and through the API. Keep it private: connecting again replaces it.</p><code className="mailchimp-webhook">{data.webhookUrl}</code><p>{data.webhookCheckedAt?`Mailchimp checked this address ${formatDateTime(data.webhookCheckedAt)}.`:'Mailchimp has not checked this address yet.'} Mailchimp can reach it only on a public HTTPS address.</p></>}
    </>}
   </>:<p>Ask the installation owner to connect Mailchimp or change its audience.</p>}
   {data.deletions.length>0&&<><h3>Deletions in Mailchimp</h3><p>Erasing a contact in Orbit asks Mailchimp to permanently delete the matching member. Each request is tracked here, apart from the erasure, until Mailchimp confirms it.</p>
    <ul className="mailchimp-deletions">{data.deletions.map(item=><li key={item.id} data-state={item.state}><strong>{deletionStates[item.state]}</strong><span>Requested {formatDateTime(item.requestedAt)}{item.audience?` for the audience “${item.audience}”`:''}{item.state==='deleted'?`, confirmed ${formatDateTime(item.updatedAt)}.`:'.'}</span>{item.reason&&<span>{item.reason}</span>}{data.owner&&['held','failed','uncertain'].includes(item.state)&&<button type="button" disabled={busy} onClick={()=>void run(`deletions/${item.id}/retry`,{},'POST','Deletion confirmed. Orbit asked Mailchimp again.')}>Confirm deletion retry</button>}</li>)}</ul></>}
   {phase==='connected'&&<MailchimpPreview fields={data.fields}/>}
  </>}
 </section>;
}
