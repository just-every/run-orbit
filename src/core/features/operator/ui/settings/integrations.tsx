import {ConnectedProducts} from '../connected-products';
import {ScrollToHash} from '../hash-target';
import {PersonalSlackSettings} from '../personal-slack-settings';
import {StripeSettings} from '../stripe-settings';
import {SettingsArea} from './area';
import {useWorkspaceSettings} from './use-workspace-settings';

/** Settings › Integrations: the products Orbit connects to, each set up in place under its row, and each person's own
 * Slack mentions (#personal-slack, linked from Notifications). */
export function IntegrationsArea(){
 const settings=useWorkspaceSettings();
 return <SettingsArea title="Integrations"><section className="operator-surface settings-card" aria-labelledby="api-access"><h2 id="api-access">API access</h2><p className="settings-card__line">Let a reporting tool read selected deals and fields with a named, expiring credential. It cannot send customer messages, and you can revoke it at any time.</p><a href="/docs/api-credentials">Create and use a read credential</a><p className="settings-card__line">The installation owner follows the browser-console steps and saves the secret once.</p></section><ConnectedProducts operators={settings.data?.operators??[]}/><StripeSettings/><PersonalSlackSettings/><ScrollToHash ready/></SettingsArea>;
}
