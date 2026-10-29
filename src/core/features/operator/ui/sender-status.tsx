import {useCallback} from 'react';
import {readOnboarding,type MailSettings} from './setup-line';
import {useOperatorResource} from './use-operator-resource';
import {MailSenderSetup} from './mail-sender-setup';

/** Names only, never values: how far customer mail setup has got. */
function notSetUp(settings?:MailSettings|null){
 if(!settings)return 'Not set up yet.';
 return `Not set up yet: ${settings.present} of ${settings.total} settings present.${settings.missing.length?` Missing: ${settings.missing.join(', ')}.`:''}${settings.problem?` ${settings.problem}`:''}`;
}

/** Settings › Mail › Sender: one status line; the setup steps fold under "Set up the sender", the test stays in view. */
export function SenderStatus({local}:{local?:boolean}){
 const resource=useOperatorResource('sender',useCallback(readOnboarding,[]));
 const data=resource.data,managed=data?.mailSettings?.provider==='rer';
 return <section id="mail-sender" className="operator-surface settings-card" aria-labelledby="mail-sender-title"><div className="settings-card__head"><h2 id="mail-sender-title">Sender</h2><button type="button" onClick={resource.reload}>Check sender configuration</button></div>
  {resource.error?<p role="alert">{resource.error.message}</p>:data?<>
   <p className="settings-card__line" data-testid="mail-sender-status">{data.mailConfigured?`${managed?'Managed by Run Edit Run':'SendGrid'} · set up and checked.${data.mailChecked?' Test received.':' Send yourself a test to finish.'}`:notSetUp(data.mailSettings)}</p>
   <MailSenderSetup provider={data.mailSettings?.provider} local={local} configured={data.mailConfigured}/>
  </>:<p>Checking sender configuration…</p>}
 </section>;
}
