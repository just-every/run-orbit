import './capture-setup.css';
import {useCallback,useState} from 'react';
import {CopyField} from './capture-copy-field';
import {EnvironmentField,useDeployEnvironment} from './deploy-environment';
import {formatDate} from './formatters';
import {useOperatorResource} from './use-operator-resource';
import {workbenchRequest} from './workbench-api';

interface Status {hosted:boolean;connected:boolean;method:'sendgrid'|'relay'|null;lastEventAt:string|null;endpoint:string}
const readStatus=()=>workbenchRequest<Status>('/delivery-outcomes');
// SendGrid shows the Signed Event Webhook verification key as a base64 P-256 public key.
const verificationKey=/^MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE[A-Za-z0-9+/]{86}==?$/;

function summary(status:Status){
 if(!status.connected)return status.hosted
  ?'Orbit knows SendGrid accepted each message, but not whether it was delivered, bounced or dropped. Sent messages say “delivery not tracked” until you finish the steps below.'
  :'Delivery outcomes need a hosted Orbit: SendGrid must reach a public address to report outcomes, so connect them after you deploy Orbit. Until then, sent messages say “delivery not tracked”.';
 const via=status.method==='relay'?'the Run Edit Run event relay':'SendGrid’s signed Event Webhook';
 return status.lastEventAt
  ?`Receiving through ${via}. Last signed event received ${formatDate(status.lastEventAt)}. Bounced and dropped messages now show their outcome and move the deal to NOW.`
  :`Set up through ${via}, waiting for the first signed event. Use Test Your Integration in SendGrid (step 5), then choose Check connection.`;
}

/** Settings → Delivery outcomes: connect SendGrid's Event Webhook so bounces and drops reach each message. */
export function DeliveryOutcomes(){
 const resource=useOperatorResource('delivery-outcomes',useCallback(readStatus,[]));
 const [key,setKey]=useState(''),{environment,setEnvironment,name}=useDeployEnvironment();
 const status=resource.data,trimmed=key.replace(/\s+/g,'');
 return <section id="delivery-outcomes" className="operator-surface workbench-form"><h2>Delivery outcomes</h2>
  {resource.error?<p role="alert">{resource.error.message}</p>:status?<>
   <p data-testid="delivery-outcomes-status"><strong>{status.connected?'Connected':'Not connected'}.</strong> {summary(status)}</p>
   <p>SendGrid tells Orbit what happened to each approved message through its Event Webhook. Set it up once, in the same SendGrid account as your customer mail sender. It takes about five minutes.</p>
   <ol className="capture-plain-steps">
    <li><strong>Open the Event Webhook page.</strong> Open <a href="https://app.sendgrid.com/settings/mail_settings/webhook_settings" target="_blank" rel="noreferrer">SendGrid → Settings → Mail Settings → Webhook Settings</a>, select <strong>Event Webhooks</strong>, then choose <strong>Create new webhook</strong>. If your account already has an Event Webhook for another app, add a new one; do not change the existing one.</li>
    <li><strong>Name it and paste this URL.</strong> Enter Orbit as the friendly name. Paste this exact address into <strong>Post URL</strong>:{status.hosted?<CopyField label="Event Webhook Post URL" value={status.endpoint}/>:<> your hosted Orbit address followed by <code>/api/v1/mail/events/sendgrid</code>, for example <code>https://sales-orbit-production.example.workers.dev/api/v1/mail/events/sendgrid</code>. This page shows the exact URL when you open it on your hosted Orbit.</>}</li>
    <li><strong>Choose the events.</strong> Under <strong>Actions to be posted</strong>, tick <strong>Processed</strong>, <strong>Dropped</strong>, <strong>Delivered</strong> and <strong>Bounced</strong> (these give each message its outcome), and <strong>Spam Reports</strong>, <strong>Unsubscribes</strong> and <strong>Group Unsubscribes</strong> (these stop outreach to that person). Leave the others off; Orbit does not use them.</li>
    <li><strong>Turn on signing and copy the key.</strong> Under <strong>Security features</strong>, turn on <strong>Signature Verification</strong> (also called Signed Event Webhook), make sure the webhook is <strong>Enabled</strong>, and save. SendGrid then shows a <strong>Verification Key</strong> starting with <code>MFkw</code>. Copy it and paste it below. It is a public key, so it is safe to paste here; Orbit uses it to refuse anything SendGrid did not sign.</li>
    <li><strong>Give Orbit the key, then test.</strong> {status.hosted?'Run the command below in the Orbit folder you deployed from. It reads your Cloudflare values from the private .dev.vars.deploy file the README’s “Deploy to your Cloudflare account” steps had you create. Then return to SendGrid, choose Test Your Integration on the webhook, come back here and choose Check connection.':'After you deploy, open this page on your hosted Orbit: it shows the exact command for that installation.'}</li>
   </ol>
   {status.hosted?<><label>SendGrid verification key<textarea rows={3} autoComplete="off" spellCheck={false} value={key} onChange={e=>setKey(e.target.value)} placeholder="MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE…"/></label>
   {trimmed&&!verificationKey.test(trimmed)?<p role="alert">That does not look like a SendGrid verification key. Copy the whole key shown under Signature Verification; it starts with MFkw and is about 124 characters long.</p>:null}
    <EnvironmentField id="outcomes-environment-hint" environment={environment} setEnvironment={setEnvironment}/>
    {verificationKey.test(trimmed)?<CopyField label="Connect delivery outcomes command" value={`SENDGRID_WEBHOOK_PUBLIC_KEY='${trimmed}' rer deploy --env-file .dev.vars.deploy --environment ${name} --set-secret SENDGRID_WEBHOOK_PUBLIC_KEY`}/>:<p>Paste the verification key above to reveal the exact command.</p>}
   </>:null}
   {status.connected?null:<><h3>If SendGrid says you have reached the maximum number of webhooks</h3>
   <p>Your SendGrid plan allows only a few Event Webhooks, and other apps already use them. Orbit cannot connect delivery outcomes on this account until a slot is free. Do not change or reuse another app’s webhook: that app would stop receiving its events. You can:</p>
   <ul className="capture-plain-steps"><li>delete an Event Webhook you no longer use, or upgrade your SendGrid plan, then start again at step 1; or</li><li>carry on without delivery outcomes. Orbit still sends your approved mail. Each sent message keeps saying “accepted by mail provider · delivery not tracked”, because Orbit cannot see whether it was delivered, bounced or dropped. To check a message, search for the recipient in <a href="https://app.sendgrid.com/email_activity" target="_blank" rel="noreferrer">SendGrid → Activity</a>.</li></ul></>}
  </>:<p>Checking delivery outcomes…</p>}
  <button type="button" onClick={resource.reload}>Check connection</button>
 </section>;
}
