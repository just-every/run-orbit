import {SetupHelp,SetupLink as ConsoleLink} from './setup-help';
import {CopyField} from './capture-copy-field';
import {EnvironmentField,useDeployEnvironment} from './deploy-environment';

export function AISetupHelp(){
 const {environment,setEnvironment,name}=useDeployEnvironment();
 const deploy=`rer deploy --env-file .dev.vars.deploy --environment ${name}`;
 return <SetupHelp>
  <p>Whoever runs this installation enables AI in its private server settings. There is no API-key field in Workspace. AI requests send the customer information you review to OpenAI.</p>
  <ol>
   <li>Sign in to the <ConsoleLink href="https://platform.openai.com/api-keys">OpenAI API dashboard’s API keys page</ConsoleLink>, select your project and choose <strong>Create new secret key</strong>. Save the key privately. Set up API billing in <ConsoleLink href="https://platform.openai.com/settings/organization/billing/overview">Billing</ConsoleLink>; API usage is billed separately from ChatGPT.</li>
   <li>Choose a model available to your project from <ConsoleLink href="https://platform.openai.com/docs/models">OpenAI’s model list</ConsoleLink>. It must support the <strong>Responses API</strong>, <strong>Structured Outputs</strong> and <strong>low</strong> reasoning effort used by Orbit. Use its exact API model ID as <code>AI_MODEL</code>.</li>
   <li>In your Orbit folder, open <code>.dev.vars</code> for this computer or the private <code>.dev.vars.deploy</code> file used for your hosted installation. Add or replace these names, keeping each once:
    <ul><li><code>OPENAI_API_KEY</code>: your project’s secret key.</li><li><code>AI_MODEL</code>: the chosen API model ID.</li><li><code>AI_INPUT_COST_PER_MILLION</code> and <code>AI_OUTPUT_COST_PER_MILLION</code>: the model’s current standard USD input and output prices per million tokens from <ConsoleLink href="https://platform.openai.com/docs/pricing">OpenAI pricing</ConsoleLink>, as numbers without a dollar sign.</li><li><code>AI_CACHED_INPUT_COST_PER_MILLION</code>: optional cached-input rate in the same units. If omitted, Orbit estimates cached tokens at the ordinary input rate.</li></ul>
    Keep the other settings, save the file and keep it private.</li>
   <li>For this computer, stop its <code>rer dev</code> process, then run <code>rer dev</code> again. For an existing hosted Orbit, use the deployment environment below and run the command in the Orbit folder you deployed from. Editing the file alone does not update the server.</li>
  </ol>
  <EnvironmentField id="ai-hosting-environment" environment={environment} setEnvironment={setEnvironment}/>
  <CopyField label="Apply hosted AI settings" block value={deploy}/>
  <p>The full deployment applies these settings together. Return to <strong>Settings › Workspace › AI</strong>: it should show summaries and drafts on. Preview an AI request from a deal, review it, then generate. A refused request stays visibly failed.</p>
  <p><strong>What it costs.</strong> OpenAI charges for token usage at your model’s rates. Orbit estimates each call as uncached input × input rate + cached input × cached rate + output × output rate, divided by one million. This section shows estimated USD totals by day and feature after calls; these rates are accounting settings, not a spending limit. Check actual charges and limits in OpenAI’s Billing and Usage pages.</p>
 </SetupHelp>;
}
