import {DeliveryOutcomes} from '../delivery-outcomes';
import {OptOutSettings} from '../opt-out-settings';
import {SenderStatus} from '../sender-status';
import {SendingCapacity} from '../sending-capacity';
import {SettingsArea} from './area';
import {LinkCard} from './link-card';
import {useWorkspaceSettings} from './use-workspace-settings';

/** Settings › Mail: the sender, sending limits, opt-out links, delivery reports and the message library. */
export function MailArea(){
 const settings=useWorkspaceSettings();
 return <SettingsArea title="Mail">
  <SenderStatus local={settings.data?.local}/>
  <SendingCapacity/>
  <OptOutSettings/>
  <DeliveryOutcomes/>
  <LinkCard title="Message library" text="Templates, snippets and signatures for your follow-ups." href="/app/settings/mail/library"/>
 </SettingsArea>;
}
