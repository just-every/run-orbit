import {useCallback} from 'react';
import {readOnboarding} from './onboarding-checklist';
import {useOperatorResource} from './use-operator-resource';

export function SenderStatus({local}:{local?:boolean}){
 const resource=useOperatorResource('sender',useCallback(readOnboarding,[]));
 return <section id="mail-sender" className="operator-surface workbench-form"><h2>Customer mail sender</h2>
  {resource.error?<p role="alert">{resource.error.message}</p>:resource.data?<>
   <p>{resource.data.mailConfigured?'Sender configuration is present and passed the runtime configuration checks.':'Customer mail is not configured yet.'}</p>
   <p>Set <code>MAIL_FROM</code> to your verified SendGrid sender, <code>SENDGRID_API_KEY</code> to your private API key, <code>MAIL_REPLY_TO</code> to your reply address and <code>SENDGRID_UNSUBSCRIBE_GROUP_ID</code> to your unsubscribe group.</p>
   {local!==undefined&&<details><summary>{local?'Set up mail on this computer':'Set up mail for this hosted installation'}</summary>
    {local?<><p>Stop Orbit with <code>rer dev --stop</code>. Edit <code>.dev.vars</code> in your Orbit checkout and set the four values above, then start <code>rer dev</code> again. Keep this private file out of source control.</p><p>Customer outreach uses SendGrid even locally. Local sign-in mail is suppressed.</p></>:<p>In the checkout used to deploy this installation, supply the four values above through its deployment environment, then run <code>rer deploy</code> with the same environment name. Keep the API key private. These values configure the hosted Worker.</p>}
    <p>See <a href="/docs/signals-and-mail">Signals and mail</a> for provider setup.</p>
   </details>}
   <p>{resource.data.sent?'The provider has accepted a reviewed customer message.':'Provider acceptance is checked when you approve your first saved message. Configuration checks do not prove delivery.'}</p>
  </>:<p>Checking sender configuration…</p>}
  <button type="button" onClick={resource.reload}>Check sender configuration</button>
 </section>;
}
