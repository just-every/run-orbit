import {SetupHelp,SetupLink as ConsoleLink} from './setup-help';
import {CopyField} from './capture-copy-field';

export function SlackSetupHelp(){
 const origin=typeof window==='undefined'?'https://YOUR-ORBIT-HOST':window.location.origin;
 return <SetupHelp>
  <p>The installation owner connects a Slack app for this workspace. Use your hosted Orbit’s public HTTPS address for callbacks; Slack cannot reach localhost.</p>
  <ol>
   <li>Open <ConsoleLink href="https://api.slack.com/apps">Your Apps in Slack</ConsoleLink>, choose <strong>Create New App</strong> › <strong>From scratch</strong>, name it Orbit, select your workspace and choose <strong>Create App</strong>. Ask a workspace administrator to approve installation if required.</li>
   <li>Open <strong>OAuth &amp; Permissions</strong> › <strong>Bot Token Scopes</strong> › <strong>Add an OAuth Scope</strong>. Add <code>chat:write</code> to post and delete bot notices, <code>channels:read</code> to check public channels, and <code>groups:read</code> if using private channels. Add <code>users:read</code> for user-change safety events and mapped personal recipient checks. For opted-in personal mentions, also add <code>im:write</code>.</li>
   <li>On that page choose <strong>Install to Workspace</strong> (or <strong>Install to Team</strong>) and <strong>Allow</strong>. Copy the <strong>Bot User OAuth Token</strong> into Orbit’s <strong>Bot token</strong> field. Under <strong>Basic Information</strong> › <strong>App Credentials</strong>, reveal <strong>Signing Secret</strong> and paste it into <strong>Slack app signing secret</strong>. Choose <strong>Verify and connect Slack</strong> here before enabling Events, so Orbit can answer Slack’s URL check.</li>
   <li>In Slack’s <strong>Interactivity &amp; Shortcuts</strong>, turn <strong>Interactivity</strong> on, set <strong>Request URL</strong> to the address below, and save. In <strong>Event Subscriptions</strong>, turn <strong>Enable Events</strong> on and use the second address as <strong>Request URL</strong>.
    <CopyField label="Slack interactivity URL" value={`${origin}/api/v1/slack/actions`}/>
    <CopyField label="Slack events URL" value={`${origin}/api/v1/slack/events`}/>
    Under <strong>Subscribe to bot events</strong>, add <code>user_change</code>, <code>channel_shared</code>, <code>channel_unshared</code>, <code>channel_archive</code>, <code>group_archive</code>, <code>channel_left</code>, <code>member_left_channel</code>, <code>app_uninstalled</code> and <code>tokens_revoked</code>. Save changes and reinstall the app if Slack requests updated permissions.</li>
   <li>In Slack, invite the app to each internal channel with <code>/invite @Orbit</code> (use your app’s name). Back here choose <strong>Load member channels</strong> or <strong>Load private member channels</strong>, choose a channel and its event types. Shared and external channels are refused. After a permitted notice is accepted, use <strong>Map Slack identities</strong> for notice buttons.</li>
  </ol>
  <p><ConsoleLink href="https://docs.slack.dev/tools/bolt-js/creating-an-app/">Slack app and credential guide</ConsoleLink> · <ConsoleLink href="https://docs.slack.dev/apis/web-api/using-the-conversations-api/">Channel permissions</ConsoleLink></p>
 </SetupHelp>;
}

export function MailchimpSetupHelp(){return <SetupHelp>
 <ol>
  <li>Sign in to the Mailchimp account that owns your marketing audience, with a role permitted to create API keys (Manager or above). Open your profile icon › <strong>Profile</strong> › <strong>Extras</strong> › <strong>API keys</strong>.</li>
  <li>Under <strong>Your API Keys</strong>, choose <strong>Create A Key</strong>, name it Orbit, then choose <strong>Generate Key</strong> and <strong>Copy Key to Clipboard</strong>. This is a Marketing API key; a Transactional key does not work here. Mailchimp shows the full key once, and new keys expire after one year.</li>
  <li>Paste it into <strong>Mailchimp API key</strong> here and choose <strong>Check key and connect</strong>. Then choose <strong>Load audiences</strong>, select your audience and choose <strong>Use this audience</strong>. If you have none, create one in Mailchimp first. Follow <strong>Unsubscribes from Mailchimp</strong> here to add Orbit’s webhook to that audience.</li>
 </ol>
 <p>API keys grant account access: keep this one private and replace it here before it expires. <ConsoleLink href="https://mailchimp.com/help/about-api-keys/">Mailchimp’s API key steps</ConsoleLink></p>
</SetupHelp>;}

export function TwilioSetupHelp(){return <SetupHelp>
 <p>The installation owner needs a Twilio account with Programmable Voice and a public HTTPS Orbit installation. Orbit rings your phone first, then connects the customer after you review both numbers.</p>
 <ol>
  <li>Open the <ConsoleLink href="https://console.twilio.com/">Twilio Console</ConsoleLink> and select the account that owns your calling number. On its home page, copy <strong>Account SID</strong> and reveal <strong>Auth Token</strong>. Put these in <strong>Account SID</strong> and <strong>Auth token</strong> here. Use the account’s live credentials, including on a trial; Test Credentials cannot place real calls.</li>
  <li>Follow the Console’s <strong>Voice</strong> setup guide to get a voice-capable number. In the legacy Console, use <strong>Phone Numbers</strong> › <strong>Manage</strong> › <strong>Buy a number</strong> and filter for <strong>Voice</strong>. Complete any identity or regional requirements Twilio shows. Find your purchased or assigned trial number under <strong>Active Numbers</strong>; enter it as <strong>Twilio phone</strong>.</li>
  <li>Enter the phone you will answer as <strong>Your phone</strong>. Use international format for both, such as <code>+12025550101</code>. On a trial, verify your phone and every customer test destination with Twilio’s trial setup (legacy Console: <strong>Verified Caller IDs</strong>). Trial calling is restricted; upgrade and enable the required Voice geographic permissions for regular customer calls.</li>
  <li>Choose <strong>Connect Twilio</strong> here. Saving the settings is not a test call. Open a contact with a permitted phone number, review the exact numbers and confirm one call. Orbit supplies its status callback automatically; do not paste that callback into the number’s incoming <strong>A call comes in</strong> field.</li>
 </ol>
 <p>Twilio bills number rental and calling usage, including both legs of a connected call. <ConsoleLink href="https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account">Twilio account and trial guide</ConsoleLink> · <ConsoleLink href="https://www.twilio.com/en-us/voice/pricing">Voice pricing</ConsoleLink></p>
</SetupHelp>;}
