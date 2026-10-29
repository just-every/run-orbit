import './capture-setup.css';
import {useEffect,useState} from 'react';
import {CopyField} from './capture-copy-field';
import {EnvironmentField,useDeployEnvironment} from './deploy-environment';
import {formatDate} from './formatters';
import {workbenchRequest} from './workbench-api';
import './capture-providers.css';

type Test={recipient:string;subject:string;body:string};
type Pending={attemptId:string;sentAt:string;recipient:string;provider?:string};
const quote=(value:string)=>JSON.stringify(value);
// Customer mail turns on only once all four are present, so the two that only customer mail uses go last.
const order=['SENDGRID_API_KEY','MAIL_FROM','MAIL_REPLY_TO','SENDGRID_UNSUBSCRIBE_GROUP_ID'];
const accepted=(recipient:string,managed=false)=>managed?`Run Edit Run accepted the test email to ${recipient}. Open that mailbox and find “Orbit sender check”. Acceptance is not delivery; check Spam if it does not arrive.`:`SendGrid accepted the test email to ${recipient}. Open that mailbox and find “Orbit sender check”. Acceptance is not delivery; check Spam and SendGrid Activity if it does not arrive.`;

export function MailSenderSetup({local,configured,provider}:{local?:boolean;configured:boolean;provider?:'rer'|'sendgrid'}){
 const managed=provider==='rer';
 const [from,setFrom]=useState(''),[key,setKey]=useState(''),[reply,setReply]=useState(''),[group,setGroup]=useState(''),{environment,setEnvironment,name}=useDeployEnvironment();
 const [test,setTest]=useState<Test>(),[result,setResult]=useState(''),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(()=>crypto.randomUUID()),[sent,setSent]=useState(false);
 // A test SendGrid accepted stays open for “I received” until you confirm it, across reloads.
 useEffect(()=>{if(!configured)return;let active=true;void workbenchRequest<{pending:Pending|null}>('/sender-test/pending').then(({pending})=>{if(active&&pending){setAttempt(pending.attemptId as ReturnType<typeof crypto.randomUUID>);setSent(true);setResult(`${accepted(pending.recipient,pending.provider==='rer')} Sent ${formatDate(pending.sentAt)}.`);}},()=>{});return()=>{active=false;};},[configured,managed]);
 const complete=from&&key&&reply&&/^[1-9]\d*$/.test(group);
 const values=`MAIL_FROM=${quote(from)}\nSENDGRID_API_KEY=${quote(key)}\nMAIL_REPLY_TO=${quote(reply)}\nSENDGRID_UNSUBSCRIBE_GROUP_ID=${quote(group)}`;
 const commands=order.map(secret=>`rer deploy --env-file .dev.vars.deploy --environment ${name} --set-secret ${secret}`).join(' &&\n');
 async function preview(){setBusy(true);setResult('');try{setTest(await workbenchRequest<Test>('/sender-test'));}catch(e){setResult((e as Error).message);}finally{setBusy(false);}}
 async function send(){setBusy(true);setResult('');try{const sent=await workbenchRequest<{recipient:string;provider?:string}>('/sender-test',{attemptId:attempt,confirmed:true});setResult(accepted(sent.recipient,sent.provider==='rer'));setSent(true);setTest(undefined);}catch(e){setResult((e as Error).message);}finally{setBusy(false);}}
 async function received(){setBusy(true);try{await workbenchRequest('/sender-test/received',{attemptId:attempt});setSent(false);setResult('Thanks. The setup checklist now shows your mail sender as checked.');}catch(e){setResult((e as Error).message);}finally{setBusy(false);}}
 return <div className="sender-setup">
  {managed?null:<details><summary>Set up the sender</summary>
  <p>Use your own SendGrid account to send reviewed customer messages; keep the API key private.</p>
  <ol className="capture-plain-steps">
   <li><strong>Verify a sender address.</strong> Open <a href="https://app.sendgrid.com/settings/sender_auth" target="_blank" rel="noreferrer">SendGrid → Settings → Sender Authentication</a>. Choose <strong>Verify a Single Sender</strong>, enter your business details, and click the verification link SendGrid emails you. For regular sending, use <strong>Authenticate Your Domain</strong> on that same page and add the DNS records it provides. Enter the verified email below.</li>
   <li><strong>Create a sending key.</strong> Open <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noreferrer">SendGrid → Settings → API Keys</a> → <strong>Create API Key</strong>. Name it Orbit, choose <strong>Restricted Access</strong>, set <strong>Mail Send</strong> to <strong>Full Access</strong>, and create it. Copy the key now; SendGrid shows it only once.</li>
   <li><strong>Create an unsubscribe group.</strong> Open <a href="https://app.sendgrid.com/suppressions/advanced_suppression_manager" target="_blank" rel="noreferrer">SendGrid → Suppressions → Unsubscribe Groups</a> → <strong>Create New Group</strong>. Name it Customer outreach and describe the messages customers can stop. Save, then copy the number in the <strong>Group ID</strong> column. Orbit includes the group’s unsubscribe links in customer mail.</li>
   <li><strong>Choose where replies arrive.</strong> Enter an inbox you read. Replies to an ordinary inbox stay there until you add them through <a href="/app/settings/capture">Capture</a> (download the reply as an .eml file and upload it). For automatic reply capture, finish <a href="/app/settings/capture/connect/address">Capture → Orbit address</a>, create your private address there, and use that address below. Automatic capture needs a hosted installation; it cannot receive internet mail on this computer.</li>
  </ol>
  <label>Verified sender email<input type="email" autoComplete="email" value={from} onChange={e=>setFrom(e.target.value)}/></label>
  <label>SendGrid API key<input type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)}/></label>
  <label>Reply address<input type="email" value={reply} onChange={e=>setReply(e.target.value)}/></label>
  <label>Unsubscribe Group ID<input inputMode="numeric" value={group} onChange={e=>setGroup(e.target.value)}/></label>
  <h3>Apply your four values</h3>
  {local?<ol className="capture-plain-steps"><li>In the Terminal window for your Orbit folder, run <code>rer dev --stop</code>.</li><li>Open the file named <code>.dev.vars</code> in that folder with a plain text editor (on a Mac, run <code>open -e .dev.vars</code>). Replace any existing lines with these four names, or add them at the end. Save the file. Keep the other settings.</li><li>Run <code>rer dev</code> and open its private RER_OPEN link again. Return here and choose <strong>Check sender configuration</strong>.</li></ol>:<><EnvironmentField id="mail-environment-hint" environment={environment} setEnvironment={setEnvironment}/><ol className="capture-plain-steps">
   <li>In the Orbit folder you deployed from, open the private <code>.dev.vars.deploy</code> file you made for your first deployment (the README’s “Deploy to your Cloudflare account”) with a plain text editor; on a Mac, run <code>open -e .dev.vars.deploy</code>. Replace its <code>MAIL_FROM</code> and <code>SENDGRID_API_KEY</code> lines with the four lines below; each name appears once. Keep the other lines and save.</li>
   <li>If <code>rer dev</code> is running in that folder, stop it with <code>rer dev --stop</code>.</li>
   <li>Copy the commands below and run them in that folder. Each sets one hosted setting from <code>.dev.vars.deploy</code> and checks Orbit is healthy before the next starts. Customer mail turns on with the last one; until then this page says how many of the four settings are present. If one stops with an error, fix what it says and run that line and the ones after it again.</li>
   <li>Return here and choose <strong>Check sender configuration</strong>.</li></ol></>}
  {complete?<><p>Copy these exact settings into your private file. They contain your API key.</p><details><summary>Show private settings to copy</summary><CopyField label="Private mail settings" value={values} block/></details></>:<p>Fill in all four values above to reveal the exact settings and copy button.</p>}
  {!local&&<CopyField label="Hosted mail settings commands" value={commands} block/>}
  <p>If SendGrid Activity shows “Dropped: Group Unsubscribe” for your test, that address once opted out of the group: review it under SendGrid → Suppressions → Unsubscribe Groups, or test from another operator mailbox. Orbit never overrides an unsubscribe.</p>
  </details>}
  {configured?<div className="sender-test"><h3>Send yourself a test</h3>
  <button type="button" disabled={busy} onClick={()=>void preview()}>Review test email</button>
  {test&&<section><p>To: {test.recipient}</p><p>Subject: {test.subject}</p><p>{test.body}</p>{!managed&&<p>SendGrid adds your configured unsubscribe links.</p>}<button type="button" disabled={busy} onClick={()=>void send()}>Approve and send test email to me</button></section>}
  {result&&<p role="status">{result}</p>}
  {sent&&<button type="button" disabled={busy} onClick={()=>void received()}>I received “Orbit sender check”</button>}
  {result&&<button type="button" disabled={busy} onClick={()=>{setAttempt(crypto.randomUUID());setResult('');setSent(false);}}>Start a new test</button>}
  </div>:null}
 </div>;
}
