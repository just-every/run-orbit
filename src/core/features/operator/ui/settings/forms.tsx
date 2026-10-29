import {FormsConsole} from '../../../forms/console';
import {FoldWorkspace} from '../../../fold-ui/workspace';
import {FormEmbeddingSettings} from '../form-embedding-settings';
import {SettingsArea} from './area';

/** Settings › Forms: the contact forms and the websites that may embed them. */
export function FormsArea(){
 return <SettingsArea title="Forms">
  <FoldWorkspace embedded title="Forms">{workspace=><FormsConsole workspaceId={workspace}/>}</FoldWorkspace>
  <FormEmbeddingSettings/>
 </SettingsArea>;
}
