import {CollaboratorConsole} from '../../../access/collaborator-console';
import {FoldWorkspace} from '../../../fold-ui/workspace';
import {OperatorSettings} from '../operator-settings';
import {OperatorState} from '../operator-shell';
import {OwnerSettings} from '../owner-settings';
import {SignInPolicy} from '../sign-in-policy';
import {SettingsArea} from './area';
import {LinkCard} from './link-card';
import {useWorkspaceSettings} from './use-workspace-settings';

/** Settings › Team: the people with full access, the owner's email, sign-in, collaborators and connected applications. */
export function TeamArea(){
 const settings=useWorkspaceSettings();
 return <SettingsArea title="Team">
  {settings.error?<OperatorState kind="error">{settings.error.message}</OperatorState>:null}
  {settings.data?<><OperatorSettings operators={settings.data.operators} local={settings.data.local} onChanged={settings.changed}/><OwnerSettings owner={settings.data.owner} onSaved={settings.changed}/></>:settings.error?null:<OperatorState>Loading your team…</OperatorState>}
  <SignInPolicy/>
  <FoldWorkspace embedded title="Collaborators">{workspace=><CollaboratorConsole workspaceId={workspace}/>}</FoldWorkspace>
  <LinkCard title="Shared records" text="The records each collaborator can see or change." href="/app/shared-records"/>
  <LinkCard title="Connected applications" text="Applications that work in Orbit for one of your team." href="/delegation/settings"/>
 </SettingsArea>;
}
