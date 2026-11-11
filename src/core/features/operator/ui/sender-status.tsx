import {useCallback} from 'react';
import {readOnboarding,type MailSettings} from './setup-line';
import {useOperatorResource} from './use-operator-resource';
import {MailSenderSetup} from './mail-sender-setup';

const settings:Record<string,{name:string;help:string}>={
 SENDGRID_API_KEY:{name:'SendGrid key',help:'Create a key with Mail Send access in SendGrid → Settings → API Keys.'},
 MAIL_FROM:{name:'Sender address',help:'Verify an email in SendGrid → Settings → Sender Authentication.'},
 MAIL_REPLY_TO:{name:'Reply address',help:'Choose an inbox you read, or your private address from Capture → Orbit address.'},
 SENDGRID_UNSUBSCRIBE_GROUP_ID:{name:'Unsubscribe group',help:'Create a group in SendGrid → Suppressions → Unsubscribe Groups, then copy its Group ID.'},
 MAIL_RELAY_URL:{name:'Mail relay address',help:'Use the HTTPS relay address supplied with your Run Edit Run hosting setup.'},
 MAIL_API_KEY:{name:'Mail relay key',help:'Use the private mail key supplied with your Run Edit Run hosting setup.'},
};
/** Plain names only, never values: how far customer mail setup has got. */
function notSetUp(settings?:MailSettings|null){
 if(!settings)return 'Not set up yet.';
 return `Mail sender is not set up yet.${settings.problem?` ${settings.problem}`:''} You can save drafts while you finish setup.`;
}

/** Settings › Mail › Sender: one status line; the setup steps fold under "Set up the sender", the test stays in view. */
export function SenderStatus({local}:{local?:boolean}){
 const resource=useOperatorResource('sender',useCallback(readOnboarding,[]));
 const data=resource.data,managed=data?.mailSettings?.provider==='rer';
 return <section id="mail-sender" className="operator-surface settings-card" aria-labelledby="mail-sender-title"><div className="settings-card__head"><h2 id="mail-sender-title">Sender</h2><button type="button" onClick={resource.reload}>Check sender configuration</button></div>
  {resource.error?<p role="alert">{resource.error.message}</p>:data?<>
   <p className="settings-card__line" data-testid="mail-sender-status">{data.mailConfigured?`${managed?'Managed by Run Edit Run':'SendGrid'} · set up and checked.${data.mailChecked?' Test received.':' Send yourself a test to finish.'}`:notSetUp(data.mailSettings)}</p>
   {!data.mailConfigured&&data.mailSettings?.missing.length?<ul>{data.mailSettings.missing.map(key=><li key={key}><strong>{settings[key]?.name??'Mail setting'}.</strong> {settings[key]?.help??'Follow the sender setup steps below.'}</li>)}</ul>:null}
   <MailSenderSetup provider={data.mailSettings?.provider} local={local} configured={data.mailConfigured}/>
  </>:<p>Checking sender configuration…</p>}
 </section>;
}
