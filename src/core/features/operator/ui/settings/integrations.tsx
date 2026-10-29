import {ConnectedProducts} from '../connected-products';
import {ScrollToHash} from '../hash-target';
import {PersonalSlackSettings} from '../personal-slack-settings';
import {SettingsArea} from './area';
import {useWorkspaceSettings} from './use-workspace-settings';

/** Settings › Integrations: the products Orbit connects to, each set up in place under its row, and each person's own
 * Slack mentions (#personal-slack, linked from Notifications). */
export function IntegrationsArea(){
 const settings=useWorkspaceSettings();
 return <SettingsArea title="Integrations"><ConnectedProducts operators={settings.data?.operators??[]}/><PersonalSlackSettings/><ScrollToHash ready/></SettingsArea>;
}
