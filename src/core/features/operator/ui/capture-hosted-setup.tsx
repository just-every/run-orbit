import {SetupHelp,SetupLink as ConsoleLink} from './setup-help';
import {CopyField} from './capture-copy-field';
import {EnvironmentField,useDeployEnvironment} from './deploy-environment';

export function CaptureHostedSetup(){
 const {environment,setEnvironment,name}=useDeployEnvironment();
 const origin=typeof window==='undefined'?'https://YOUR-ORBIT-HOST':window.location.origin;
 const deploy=`rer deploy --env-file .dev.vars.deploy --environment ${name}`;
 return <SetupHelp>
  <p>Receiving internet mail needs a hosted Orbit and a receiving domain you control, such as <code>capture.example.com</code>. Neither <code>capture.localhost</code> nor <code>workers.dev</code> can receive mail. Choose one route below for that domain; keep its mail routing separate from your normal business inbox.</p>
  <EnvironmentField id="capture-hosting-environment" environment={environment} setEnvironment={setEnvironment}/>
  <h3>Route with SendGrid Inbound Parse</h3>
  <ol>
   <li>In your domain’s DNS console, add an <strong>MX</strong> record for the receiving subdomain (for example <code>capture</code>), priority <strong>10</strong>, destination <code>mx.sendgrid.net</code>. In SendGrid, authenticate your domain under <strong>Settings</strong> › <strong>Sender Authentication</strong> if it is not yet offered in the Domain dropdown.</li>
   <li>In <ConsoleLink href="https://app.sendgrid.com/settings/parse">SendGrid › Settings › Inbound Parse</ConsoleLink>, choose <strong>Add Host &amp; URL</strong>. Set <strong>Receiving domain</strong> to your subdomain, <strong>Destination URL</strong> to your hosted Orbit address below, select <strong>POST the raw, full MIME message</strong>, then <strong>Add</strong>. On localhost, replace the origin below with your hosted HTTPS origin.
    <CopyField label="Orbit inbound parse URL" value={`${origin}/api/v1/mail/capture`}/></li>
   <li>Enable request signatures using SendGrid’s <ConsoleLink href="https://www.twilio.com/docs/sendgrid/for-developers/parsing-email/securing-your-parse-webhooks">Parse security policy API</ConsoleLink>. This step uses the API, rather than an undocumented console toggle. In <strong>Settings</strong> › <strong>API Keys</strong> › <strong>Create API Key</strong>, make a private setup key with <strong>Full Access</strong>. In your terminal set <code>SENDGRID_SETUP_KEY</code> to that key, then run:
    <CopyField label="Create signed parse policy" block value={'curl --fail-with-body https://api.sendgrid.com/v3/user/webhooks/security/policies -X POST -H "Authorization: Bearer $SENDGRID_SETUP_KEY" -H "Content-Type: application/json" --data \'{"name":"Orbit capture","signature":{"enabled":true}}\''}/>
    Save the returned <code>policy.signature.public_key</code> and <code>policy.id</code>. Replace <code>capture.example.com</code> and <code>POLICY_ID</code> below with your receiving domain and that ID, then attach the policy:
    <CopyField label="Attach signed parse policy" block value={'curl --fail-with-body https://api.sendgrid.com/v3/user/webhooks/parse/settings/capture.example.com -X PATCH -H "Authorization: Bearer $SENDGRID_SETUP_KEY" -H "Content-Type: application/json" --data \'{"send_raw":true,"security_policy":"POLICY_ID"}\''}/>
    Revoke that setup key when finished; Orbit only needs the public verification key.</li>
   <li>In the private <code>.dev.vars.deploy</code> file in the Orbit folder you deployed from, add or replace <code>CAPTURE_MAIL_ADDRESS=orbit@capture.example.com</code> with your base receiving mailbox and <code>SENDGRID_PARSE_PUBLIC_KEY=PUBLIC_KEY</code> with the public key returned above. These are separate from the outbound mail key and delivery-event key. Keep each name once and keep the file private. Apply both settings with these separate commands:
    <CopyField label="Apply capture settings" block value={`${deploy} --set-secret CAPTURE_MAIL_ADDRESS\n${deploy} --set-secret SENDGRID_PARSE_PUBLIC_KEY`}/></li>
   <li>Open this page on your hosted Orbit and choose <strong>Create my Orbit address</strong>. If an address already exists, use the one it shows. Send a customer email to that exact private tagged address and check Capture for the result. Only the exact envelope address is accepted; the base mailbox alone is not your private address.</li>
  </ol>
  <p><ConsoleLink href="https://www.twilio.com/docs/sendgrid/for-developers/parsing-email/setting-up-the-inbound-parse-webhook">SendGrid domain and raw MIME steps</ConsoleLink></p>
  <h3>Or route with Cloudflare Email Routing</h3>
  <ol>
   <li>Open Cloudflare’s <strong>Compute</strong> › <strong>Email Service</strong> › <strong>Email Routing</strong>, select your domain and enable routing with its required DNS records. Under <strong>Settings</strong> › <strong>Subdomains</strong>, add a receiving subdomain such as <code>capture.example.com</code> and its DNS records. Use this route instead of SendGrid’s MX for that subdomain.</li>
   <li>Under <strong>Routing rules</strong>, choose <strong>Create routing rule</strong>, enter <code>orbit</code> as <strong>Email pattern</strong>, select the receiving subdomain, and choose action <strong>Send to a Worker</strong> with <strong>Destination</strong> set to this installation’s Worker, <code>sales-orbit-{name}</code>. Under <strong>Settings</strong>, enable <strong>Subaddressing</strong> so tagged mail reaches that rule.</li>
   <li>Set <code>CAPTURE_MAIL_ADDRESS=orbit@capture.example.com</code> in your private <code>.dev.vars.deploy</code> file, using your own domain, and run the command below in that Orbit folder. This route does not need <code>SENDGRID_PARSE_PUBLIC_KEY</code>. Then open this page on the hosted Orbit, create your private address and test it with customer mail.
    <CopyField label="Apply routed mailbox" value={`${deploy} --set-secret CAPTURE_MAIL_ADDRESS`} block/></li>
  </ol>
  <p><ConsoleLink href="https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/">Cloudflare Worker routing</ConsoleLink> · <ConsoleLink href="https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/#subaddressing">Subaddressing</ConsoleLink></p>
 </SetupHelp>;
}
