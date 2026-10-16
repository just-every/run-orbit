import {useCallback} from 'react';
import {readOnboarding} from './onboarding-checklist';
import {useOperatorResource} from './use-operator-resource';
import {MailSenderSetup} from './mail-sender-setup';

export function SenderStatus({local}:{local?:boolean}){
 const resource=useOperatorResource('sender',useCallback(readOnboarding,[]));
 return <section id="mail-sender" className="operator-surface workbench-form"><h2>Customer mail sender</h2>
  {resource.error?<p role="alert">{resource.error.message}</p>:resource.data?<>
   <p>{resource.data.mailConfigured?'Sender configuration is present and passed the runtime configuration checks.':'Customer mail is not configured yet.'}</p>
   <MailSenderSetup local={local} configured={resource.data.mailConfigured}/>
  </>:<p>Checking sender configuration…</p>}
  <button type="button" onClick={resource.reload}>Check sender configuration</button>
 </section>;
}
