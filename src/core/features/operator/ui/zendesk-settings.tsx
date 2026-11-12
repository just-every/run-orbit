import {useCallback,useState} from 'react';
import {recordsRequest} from './records-api';
import {useOperatorResource} from './use-operator-resource';
import {OperatorState} from './operator-shell';
import {InlineConfirm} from './autosave/inline-confirm';
interface Status {state:string;reason:string|null;subdomain:string|null;owner:boolean;ownership:string;webhookUrl:string|null}
export function ZendeskSettings(){
 const resource=useOperatorResource('zendesk-settings',useCallback(()=>recordsRequest<Status>('settings/zendesk'),[]));
 const [subdomain,setSubdomain]=useState(''),[email,setEmail]=useState(''),[token,setToken]=useState(''),[secret,setSecret]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[asking,setAsking]=useState(false),[notice,setNotice]=useState('');
 async function run(action:string,body:unknown){setBusy(true);setError('');setNotice('');try{await recordsRequest(`settings/zendesk/${action}`,'POST',body);resource.reload();window.dispatchEvent(new Event('orbit-products-changed'));setAsking(false);setNotice(action==='connect'?'Zendesk accepted the credentials. Review each company’s organization before opening tickets.':'Zendesk disconnected. Support is unavailable.');}catch(e){setError((e as Error).message);resource.reload();window.dispatchEvent(new Event('orbit-products-changed'));}finally{setBusy(false);}}
 const data=resource.data;
 return <section className="workbench-form integration-setup" aria-labelledby="zendesk-settings-title" data-testid="zendesk-settings">
  <h2 id="zendesk-settings-title">Zendesk support</h2>
  <p>{data?.ownership??'Zendesk owns support replies and SLA work. Orbit shows authorized summaries and sends only a reviewed handoff.'}</p>
  {resource.error?<OperatorState kind="error">{resource.error.message}</OperatorState>:null}{error?<p role="alert">{error}</p>:null}{notice?<p role="status">{notice}</p>:null}
  {data?<><p role="status"><strong>{data.state==='connected'?'Connected':'Unresolved setup · support unavailable'}</strong>{data.reason?` · ${data.reason}`:''}</p>
   {data.subdomain?<a href={`https://${data.subdomain}.zendesk.com/agent/`} target="_blank" rel="noreferrer">Open Zendesk</a>:null}
   {data.owner?<><form className="workbench-form" onSubmit={e=>{e.preventDefault();const credentials={subdomain,email,token,signingSecret:secret};setToken('');setSecret('');void run('connect',credentials);}}>
    <h3>{data.subdomain?'Reconnect Zendesk':'Connect Zendesk'}</h3>
    <label>Zendesk subdomain<input required autoComplete="off" placeholder="your-company" value={subdomain} onChange={e=>setSubdomain(e.target.value)}/></label>
    <label>Zendesk agent email<input required type="email" autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label>Zendesk API token<input required type="password" autoComplete="new-password" value={token} onChange={e=>setToken(e.target.value)}/></label>
    <label>Zendesk webhook signing secret<input required minLength={16} type="password" autoComplete="new-password" value={secret} onChange={e=>setSecret(e.target.value)}/></label>
    <p>The token’s agent must be authorized to read the mapped organizations and tickets. Credentials are encrypted in this installation, never shown again and excluded from exports. Restore pauses the connection and its mappings.</p>
    <button className="operator-button" disabled={busy}>Verify and connect Zendesk</button>
   </form>
   {data.webhookUrl?<><h3>Return a support outcome</h3><p>In Zendesk Admin Center, create a webhook with this address and copy its signing secret above. Add a ticket trigger that posts the ticket ID when a reviewed handoff is solved or closed. Zendesk must reach this installation over HTTPS.</p><code style={{overflowWrap:'anywhere'}}>{data.webhookUrl}</code><pre style={{whiteSpace:'pre-wrap'}}>{'{"ticket_id":"{{ticket.id}}"}'}</pre><p>Orbit verifies the signature and reads the current ticket before adding one outcome to the company timeline.</p></>:null}
   {data.subdomain?<button type="button" disabled={busy} onClick={()=>setAsking(true)}>Disconnect Zendesk</button>:null}
   {asking?<InlineConfirm busy={busy} sentence="Disconnect Zendesk and delete its saved credentials? Tickets and handoffs become unavailable until the owner reconnects and a full operator reviews the mapping again." action="Disconnect" keep="Keep connected" onConfirm={()=>void run('disconnect',{})} onKeep={()=>setAsking(false)}/>:null}
   </>:<p>Ask the installation owner to manage the Zendesk connection.</p>}
  </>:!resource.error?<OperatorState>Loading Zendesk…</OperatorState>:null}
 </section>;
}
