import {SetupHelp,SetupLink} from './setup-help';
import {CopyField} from './capture-copy-field';

export function ZoomSetupHelp({webhookPath}:{webhookPath:string}){
 const origin=typeof window==='undefined'?'https://YOUR-ORBIT-HOST':window.location.origin;
 const local=typeof window!=='undefined'&&['localhost','127.0.0.1','[::1]'].includes(window.location.hostname);
 return <>
  {local&&<p><strong>Zoom cannot reach this local copy.</strong> An address on 127.0.0.1 or localhost only works on your computer. Deploy Orbit to a public HTTPS address using the <a href="https://github.com/just-every/run-orbit#deploy-to-your-cloudflare-account" target="_blank" rel="noopener noreferrer">Orbit deployment guide</a>, then connect Zoom from Settings on that hosted installation. For temporary development, use a public HTTPS tunnel to this copy and keep it running while Zoom delivers events. Use the public address plus <code>{webhookPath}</code>, never the loopback URL, in Zoom.</p>}
  <SetupHelp>
   <p>The Zoom account owner or an administrator with permission to build Server-to-Server OAuth apps connects the account. No meeting is created and no invitation is sent.</p>
   <ol>
    <li>Sign in to the <SetupLink href="https://marketplace.zoom.us/">Zoom App Marketplace</SetupLink>. Choose <strong>Develop</strong> › <strong>Build App</strong> › <strong>Server-to-Server OAuth</strong> › <strong>Create</strong>. Name the app Orbit and complete the required company and developer contact information.</li>
    <li>In <strong>App Credentials</strong>, copy <strong>Account ID</strong>, <strong>Client ID</strong> and <strong>Client Secret</strong> into the three matching Zoom fields here. Keep them private.</li>
    <li>Open <strong>Scopes</strong> › <strong>Add Scopes</strong>. Add <code>meeting:read:meeting:admin</code> (read a scheduled meeting) and <code>meeting:read:list_past_participants:admin</code> (read past meeting participants). These authorize Orbit’s meeting details and attendance reads. Accounts using Zoom’s legacy scope selector use <code>meeting:read:admin</code>. Orbit does not need recording or transcript scopes.</li>
    <li>Under <strong>Feature</strong> (shown as <strong>Features</strong> in some versions), find <strong>Event Subscriptions</strong>. Reveal or generate the <strong>Secret Token</strong> and copy it into <strong>Zoom webhook secret token</strong> here. Save the app settings and activate the app from <strong>Activation</strong> when Zoom’s required information is complete. Choose <strong>Check and connect Zoom</strong> here so Orbit has the token before Zoom validates the endpoint.</li>
    <li>Enable <strong>Event Subscriptions</strong> and add a subscription with <strong>Event notification endpoint URL</strong> set to your reachable HTTPS Orbit address and the path below. Choose <strong>Validate</strong>, then add <strong>Meeting ended</strong> (<code>meeting.ended</code>) and <strong>Meeting deleted</strong> (<code>meeting.deleted</code>). Save the subscription and confirm the app is activated. Zoom’s validation challenge uses the secret token saved here.
     <CopyField block label={local?'Event URL template — replace the host':'Zoom event notification endpoint URL'} value={`${local?'https://YOUR-PUBLIC-ORBIT-HOST':origin}${webhookPath}`}/>
    </li>
   </ol>
   <p><SetupLink href="https://developers.zoom.us/docs/internal-apps/create/">Zoom’s Server-to-Server OAuth app instructions</SetupLink> · <SetupLink href="https://developers.zoom.us/docs/api/webhooks/">Zoom’s event subscription and validation guide</SetupLink></p>
  </SetupHelp>
 </>;
}
