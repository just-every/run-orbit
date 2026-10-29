import {CallingSettings} from '../calling-settings';
import {ConnectedProducts} from '../connected-products';
import {MailchimpSettings} from '../mailchimp-settings';
import {SlackSettings} from '../slack-settings';
import {SettingsArea} from './area';
import {useWorkspaceSettings} from './use-workspace-settings';

/** Settings › Integrations: the products Orbit connects to. */
export function IntegrationsArea(){
 const settings=useWorkspaceSettings();
 return <SettingsArea title="Integrations">
  <ConnectedProducts/>
  <SlackSettings operators={settings.data?.operators??[]}/>
  <MailchimpSettings/>
  <CallingSettings/>
 </SettingsArea>;
}
