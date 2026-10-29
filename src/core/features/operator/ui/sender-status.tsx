import {useCallback} from 'react';
import {readOnboarding,type MailSettings} from './setup-line';
import {useOperatorResource} from './use-operator-resource';
import {MailSenderSetup} from './mail-sender-setup';

/** Names only, never values: how far customer mail setup has got. */
function notSetUp(settings?:MailSettings|null){
 if(!settings)return 'Customer mail is not set up yet.';
 return `Customer mail not set up yet: ${settings.present} of ${settings.total} settings present.${settings.missing.length?` Missing: ${settings.missing.join(', ')}.`:''}${settings.problem?` ${settings.problem}`:''}`;
}

export function SenderStatus({local}:{local?:boolean}){
 const resource=useOperatorResource('sender',useCallback(readOnboarding,[]));
 return <section id="mail-sender" className="operator-surface workbench-form"><h2>Customer mail sender</h2>
  {resource.error?<p role="alert">{resource.error.message}</p>:resource.data?<>
   <p data-testid="mail-sender-status">{resource.data.mailConfigured?'Sender configuration is present and passed the runtime configuration checks.':notSetUp(resource.data.mailSettings)}</p>
   <MailSenderSetup provider={resource.data.mailSettings?.provider} local={local} configured={resource.data.mailConfigured}/>
  </>:<p>Checking sender configuration…</p>}
  <button type="button" onClick={resource.reload}>Check sender configuration</button>
 </section>;
}
