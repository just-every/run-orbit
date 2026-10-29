import {CallingSettings} from '../calling-settings';
import {ConnectedProducts} from '../connected-products';
import {ScrollToHash} from '../hash-target';
import {MailchimpSettings} from '../mailchimp-settings';
import {PersonalSlackSettings} from '../personal-slack-settings';
import {SlackSettings} from '../slack-settings';
import {SettingsArea} from './area';
import {useWorkspaceSettings} from './use-workspace-settings';

/** Settings › Integrations: the products Orbit connects to, and each person's own Slack mentions (#personal-slack). */
export function IntegrationsArea(){
 const settings=useWorkspaceSettings();
 return <SettingsArea title="Integrations">
  <ConnectedProducts/>
  <PersonalSlackSettings/>
  <SlackSettings operators={settings.data?.operators??[]}/>
  <MailchimpSettings/>
  <CallingSettings/>
  <ScrollToHash ready/>
 </SettingsArea>;
}
