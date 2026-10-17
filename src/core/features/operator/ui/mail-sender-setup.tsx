import './capture-setup.css';
import {useState} from 'react';
import {CopyField} from './capture-copy-field';
import {workbenchRequest} from './workbench-api';
import './capture-providers.css';

type Test={recipient:string;subject:string;body:string};
const quote=(value:string)=>JSON.stringify(value);
/** rer names the Worker `sales-orbit-<environment>`, so a workers.dev address tells which environment this is. */
export function deployedEnvironment(hostname:string){return /^sales-orbit-([a-z0-9-]+)\.[a-z0-9-]+\.workers\.dev$/.exec(hostname)?.[1]??'production';}

export function MailSenderSetup({local,configured}:{local?:boolean;configured:boolean}){
 const [from,setFrom]=useState(''),[key,setKey]=useState(''),[reply,setReply]=useState(''),[group,setGroup]=useState(''),[environment,setEnvironment]=useState(()=>typeof window==='undefined'?'production':deployedEnvironment(window.location.hostname));
 const [test,setTest]=useState<Test>(),[result,setResult]=useState(''),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(()=>crypto.randomUUID()),[sent,setSent]=useState(false);
 const complete=from&&key&&reply&&/^[1-9]\d*$/.test(group);
 const values=`MAIL_FROM=${quote(from)}\nSENDGRID_API_KEY=${quote(key)}\nMAIL_REPLY_TO=${quote(reply)}\nSENDGRID_UNSUBSCRIBE_GROUP_ID=${quote(group)}`;
 async function preview(){setBusy(true);setResult('');try{setTest(await workbenchRequest<Test>('/sender-test'));}catch(e){setResult((e as Error).message);}finally{setBusy(false);}}
 async function send(){setBusy(true);setResult('');try{const sent=await workbenchRequest<{recipient:string}>('/sender-test',{attemptId:attempt,confirmed:true});setResult(`SendGrid accepted the test email to ${sent.recipient}. Open that mailbox and find “Orbit sender check”. Acceptance is not delivery; check Spam and SendGrid Activity if it does not arrive.`);setSent(true);setTest(undefined);}catch(e){setResult((e as Error).message);}finally{setBusy(false);}}
 async function received(){setBusy(true);try{await workbenchRequest('/sender-test/received',{attemptId:attempt});setSent(false);setResult('Thanks. The setup checklist now shows your mail sender as checked.');}catch(e){setResult((e as Error).message);}finally{setBusy(false);}}
 return <div className="workbench-form">
  <p>Use your own SendGrid account to send reviewed customer messages. Follow these steps here; keep the API key private.</p>
  <ol className="capture-plain-steps">
   <li><strong>Verify a sender address.</strong> Open <a href="https://app.sendgrid.com/settings/sender_auth" target="_blank" rel="noreferrer">SendGrid → Settings → Sender Authentication</a>. Choose <strong>Verify a Single Sender</strong>, enter your business details, and click the verification link SendGrid emails you. For regular sending, use <strong>Authenticate Your Domain</strong> on that same page and add the DNS records it provides. Enter the verified email below.</li>
   <li><strong>Create a sending key.</strong> Open <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noreferrer">SendGrid → Settings → API Keys</a> → <strong>Create API Key</strong>. Name it Orbit, choose <strong>Restricted Access</strong>, set <strong>Mail Send</strong> to <strong>Full Access</strong>, and create it. Copy the key now; SendGrid shows it only once.</li>
   <li><strong>Create an unsubscribe group.</strong> Open <a href="https://app.sendgrid.com/suppressions/advanced_suppression_manager" target="_blank" rel="noreferrer">SendGrid → Suppressions → Unsubscribe Groups</a> → <strong>Create New Group</strong>. Name it Customer outreach and describe the messages customers can stop. Save, then copy the number in the <strong>Group ID</strong> column. Orbit includes the group’s unsubscribe links in customer mail.</li>
   <li><strong>Choose where replies arrive.</strong> Enter an inbox you read. Replies to an ordinary inbox stay there until you add them through <a href="/app/capture">Capture</a> (download the reply as an .eml file and upload it). For automatic reply capture, finish <a href="/app/capture/connect/address">Capture → Orbit address</a>, create your private address there, and use that address below. Automatic capture needs a hosted installation; it cannot receive internet mail on this computer.</li>
  </ol>
  <label>Verified sender email<input type="email" autoComplete="email" value={from} onChange={e=>setFrom(e.target.value)}/></label>
  <label>SendGrid API key<input type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)}/></label>
  <label>Reply address<input type="email" value={reply} onChange={e=>setReply(e.target.value)}/></label>
  <label>Unsubscribe Group ID<input inputMode="numeric" value={group} onChange={e=>setGroup(e.target.value)}/></label>
  <h3>Apply your four values</h3>
  {local?<ol className="capture-plain-steps"><li>In the Terminal window for your Orbit folder, run <code>rer dev --stop</code>.</li><li>Open the file named <code>.dev.vars</code> in that folder with a plain text editor (on a Mac, run <code>open -e .dev.vars</code>). Replace any existing lines with these four names, or add them at the end. Save the file. Keep the other settings.</li><li>Run <code>rer dev</code> and open its private RER_OPEN link again. Return here and choose <strong>Check sender configuration</strong>.</li></ol>:<><label>Deployment environment name<input value={environment} onChange={e=>setEnvironment(e.target.value)} aria-describedby="mail-environment-hint"/></label><p id="mail-environment-hint">The name you gave <code>rer deploy --environment</code> when you created this installation; <code>production</code> if you gave none. Orbit fills it in from this address when it can.</p><ol className="capture-plain-steps"><li>In the Orbit folder you used to deploy, create a private file named <code>.dev.vars.mail</code> with a plain text editor. Add the four lines below, replacing older lines with those names. Keep this private file out of git.</li><li>Copy and run the deploy command below in that folder. It reads these values privately from <code>.dev.vars.mail</code>, only for that one command, and <code>rer deploy</code> stores them as hosted secrets. It reads your Cloudflare values from the private <code>.dev.vars.deploy</code> file you made for your first deployment (see the README’s “Deploy to your Cloudflare account”). Use the same environment name you originally deployed.</li><li>Return here and choose <strong>Check sender configuration</strong>.</li></ol></>}
  {complete?<><p>Copy these exact settings into your private file. They contain your API key.</p><details><summary>Show private settings to copy</summary><CopyField label="Private mail settings" value={values} block/></details></>:<p>Fill in all four values above to reveal the exact settings and copy button.</p>}
  {!local&&<CopyField label="Deploy mail settings command" value={`(set -a; . ./.dev.vars.mail; rer deploy --env-file .dev.vars.deploy --environment ${/^[a-z0-9-]+$/.test(environment)?environment:'NAME'} --set-secret MAIL_FROM --set-secret SENDGRID_API_KEY --set-secret MAIL_REPLY_TO --set-secret SENDGRID_UNSUBSCRIBE_GROUP_ID)`}/>}
  <h3>Send yourself a test</h3><p>Once the configuration check passes, review and send one test to your own operator email. Success is “SendGrid accepted” here and a message titled “Orbit sender check” in your mailbox.</p>
  <p>If SendGrid Activity shows “Dropped: Group Unsubscribe”, this address previously opted out of the group. Use SendGrid → Suppressions → Unsubscribe Groups to review your own subscription, or test from another subscribed operator mailbox. Orbit never overrides an unsubscribe.</p>
  <button type="button" disabled={!configured||busy} onClick={()=>void preview()}>Review test email</button>
  {test&&<section><p>To: {test.recipient}</p><p>Subject: {test.subject}</p><p>{test.body}</p><p>SendGrid adds your configured unsubscribe links.</p><button type="button" disabled={busy} onClick={()=>void send()}>Approve and send test email to me</button></section>}
  {result&&<p role="status">{result}</p>}
  {sent&&<button type="button" disabled={busy} onClick={()=>void received()}>I received “Orbit sender check”</button>}
  {result&&<button type="button" disabled={busy} onClick={()=>{setAttempt(crypto.randomUUID());setResult('');setSent(false);}}>Start a new test</button>}
 </div>;
}
