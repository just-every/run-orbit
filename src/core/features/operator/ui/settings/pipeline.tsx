import {OperatorState} from '../operator-shell';
import {PipelineSettings} from '../pipeline-settings';
import {TypedFieldSettings} from '../typed-field-settings';
import {WorkflowsSettings} from '../workflows-settings';
import {SettingsArea} from './area';
import {useWorkspaceSettings} from './use-workspace-settings';

/** Settings › Pipeline: the pipelines and their stages, workflows and the fields of your own. */
export function PipelineArea(){
 const settings=useWorkspaceSettings();
 return <SettingsArea title="Pipeline">
  {settings.error?<OperatorState kind="error">{settings.error.message}</OperatorState>:null}
  {settings.data?<PipelineSettings settings={settings.data} onChanged={settings.changed}/>:settings.error?null:<OperatorState>Loading pipelines…</OperatorState>}
  <WorkflowsSettings/>
  <TypedFieldSettings/>
 </SettingsArea>;
}
