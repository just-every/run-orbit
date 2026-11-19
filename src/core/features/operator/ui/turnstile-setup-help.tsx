import {SetupHelp,SetupLink} from './setup-help';
import {CopyField} from './capture-copy-field';
import {EnvironmentField,useDeployEnvironment} from './deploy-environment';
import {isHostedWebhook} from './recipe-snippet';

/** Turnstile is optional: the site key is typed into the form, and its matching secret lives in the installation's private server settings. */
export function TurnstileSetupHelp(){
 const {environment,setEnvironment,name}=useDeployEnvironment(),hosted=typeof window!=='undefined'&&isHostedWebhook(window.location.origin);
 return <SetupHelp>
  <p>Cloudflare Turnstile is optional. The ordinary form works without it. With it, a visitor is checked before the form can be sent.</p>
  <ol>
   <li>Sign in to the <SetupLink href="https://dash.cloudflare.com/?to=/:account/turnstile">Cloudflare dashboard’s Turnstile page</SetupLink> and choose <strong>Add widget</strong>. Name it Orbit forms, add the address that serves your published form as its hostname, choose <strong>Managed</strong> and create it. {hosted?null:<>A form on this computer is served from <code>localhost</code>; Turnstile works only on the hosted installation’s address.</>}</li>
   <li>Copy the <strong>Site Key</strong> into <strong>Optional Turnstile site key</strong> above. It is public. Copy the <strong>Secret Key</strong> too and keep it private: it is the server secret named <code>ORBIT_FORM_TURNSTILE_SECRET</code>.</li>
   <li>Add one line, <code>ORBIT_FORM_TURNSTILE_SECRET=</code> followed by the Secret Key, to {hosted?<>the private <code>.dev.vars.deploy</code> file in the Orbit folder you deployed from (the README’s “Deploy to your Cloudflare account”). Choose the environment below, then run the command:</>:<>the file named <code>.dev.vars</code> in your Orbit folder (on a Mac, run <code>open -e .dev.vars</code>), keeping its other lines. Then run <code>rer dev --stop</code> and <code>rer dev</code> again; editing the file alone does not update the running server. If the terminal says <code>rer: command not found</code>, type <code>~/.local/bin/rer</code> in place of <code>rer</code>.</>}</li>
  </ol>
  {hosted&&<><EnvironmentField id="turnstile-hosting-environment" environment={environment} setEnvironment={setEnvironment}/>
  <CopyField label="Apply the Turnstile secret" block value={`rer deploy --env-file .dev.vars.deploy --environment ${name} --set-secret ORBIT_FORM_TURNSTILE_SECRET`}/></>}
  <p>Then save the form with its site key, compile it, and review and publish that revision. Until the secret is applied, a form with a site key refuses every enquiry, with the reason in Forms → Read spam and refusals.</p>
 </SetupHelp>;
}
