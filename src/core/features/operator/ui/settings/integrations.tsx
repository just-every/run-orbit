import {ConnectedProducts} from '../connected-products';
import {SettingsArea} from './area';
import {useWorkspaceSettings} from './use-workspace-settings';

/** Settings › Integrations: the products Orbit connects to, each set up in place under its row. */
export function IntegrationsArea(){
 const settings=useWorkspaceSettings();
 return <SettingsArea title="Integrations"><ConnectedProducts operators={settings.data?.operators??[]}/></SettingsArea>;
}
