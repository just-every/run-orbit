import type { ReactNode } from 'react';
import { ConsoleLink, type GuideStep } from './capture-guide';
import { CopyField } from './capture-copy-field';
import { ProviderKeyForm } from './capture-provider-form';
import type { CaptureProviderInfo } from './capture-types';

const Term = ({ children, meaning }: { children: ReactNode; meaning: string }) => <><strong>{children}</strong> <span className="capture-term">({meaning})</span></>;

/** Google Cloud: a project, two APIs, the consent screen, a Web client, then the key. */
export function googleSteps(provider: CaptureProviderInfo, finish: ReactNode, reconnect?: { id: string; name: string }): GuideStep[] {
  return [
    { title: 'Create a Google Cloud project', body: <ol>
      <li>Open Google Cloud and sign in with the Google account you will connect. <ConsoleLink href="https://console.cloud.google.com/projectcreate">Create a project</ConsoleLink></li>
      <li>Name it <strong>Orbit</strong> (any name works) and choose <strong>Create</strong>.</li>
      <li>When it is ready, check the project picker at the top of the page shows <strong>Orbit</strong>. The next steps all happen inside this project.</li>
    </ol> },
    { title: 'Turn on Gmail and Calendar access', body: <ol>
      <li>Turn on the Gmail API: <ConsoleLink href="https://console.cloud.google.com/apis/library/gmail.googleapis.com">Open Gmail API</ConsoleLink> and choose <strong>Enable</strong>.</li>
      <li>Turn on the Calendar API: <ConsoleLink href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com">Open Google Calendar API</ConsoleLink> and choose <strong>Enable</strong>.</li>
      <li>Skip the Calendar API if you only want mail.</li>
    </ol> },
    { title: 'Set up the consent screen', body: <>
      <p className="capture-guide__lead">The consent screen is the page Google shows when you approve Orbit.</p>
      <ol>
        <li><ConsoleLink href="https://console.cloud.google.com/auth/overview">Open Google Auth Platform</ConsoleLink> and choose <strong>Get started</strong>.</li>
        <li>App name: <strong>Orbit</strong>. User support email: your address. Choose <strong>Next</strong>.</li>
        <li>Audience: choose <strong>Internal</strong> if your company uses Google Workspace and only its accounts will connect. Otherwise choose <strong>External</strong>.</li>
        <li>Contact email: your address. Agree to the policy and choose <strong>Create</strong>.</li>
        <li>If you chose External: <ConsoleLink href="https://console.cloud.google.com/auth/audience">Open Audience</ConsoleLink> and choose <strong>Publish app</strong>, so access does not stop after 7 days. When you connect, Google warns the app is unverified: choose <strong>Advanced</strong>, then <strong>Go to Orbit</strong>. That is expected for an app only you use.</li>
      </ol>
    </> },
    { title: 'Create your sign-in key', body: <>
      <ol>
        <li><ConsoleLink href="https://console.cloud.google.com/auth/clients/create">Open Create OAuth client</ConsoleLink></li>
        <li>For <Term meaning="the kind of app">Application type</Term>, choose <strong>Web application</strong> and name it <strong>Orbit</strong>.</li>
        <li>Under <strong>Authorized redirect URIs</strong>, choose <strong>Add URI</strong> and paste this address:
          <CopyField label="Google redirect address" value={provider.redirectUri} />
          <span className="capture-note">The redirect address is where Google sends you back after you approve Orbit.</span>
        </li>
        <li>Choose <strong>Create</strong>. Google shows a <strong>Client ID</strong> and a <strong>Client secret</strong>. Keep that window open for the next step.</li>
      </ol>
    </> },
    { title: 'Paste the key and connect', heading: reconnect ? `Reconnect ${reconnect.name}` : undefined, next: false, body: <>
      <p className="capture-guide__lead">Copy each value from Google’s window and paste it here.</p>
      <ProviderKeyForm provider={provider} sourceId={reconnect?.id} sourceName={reconnect?.name} />
    </> },
    { title: 'Choose labels and calendars', next: false, body: finish },
  ];
}

/** Microsoft Entra: register a Web app, add read permissions, make a secret, then the key. */
export function microsoftSteps(provider: CaptureProviderInfo, finish: ReactNode, reconnect?: { id: string; name: string }): GuideStep[] {
  return [
    { title: 'Open App registrations', body: <ol>
      <li><ConsoleLink href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade/quickStartType~/null/sourceType/Microsoft_AAD_IAM">Open Microsoft Entra app registrations</ConsoleLink> and sign in.</li>
      <li>Use your work or school Microsoft account. A personal Outlook.com account can connect in step 5, but registering the app needs an organisation account or a free Azure account.</li>
    </ol> },
    { title: 'Register Orbit', body: <ol>
      <li>Choose <strong>New registration</strong> and name it <strong>Orbit</strong>.</li>
      <li>Under <Term meaning="who may sign in">Supported account types</Term>, choose <strong>Accounts in any organizational directory and personal Microsoft accounts</strong>.</li>
      <li>Under <strong>Redirect URI</strong>, choose <strong>Web</strong> and paste this address:
        <CopyField label="Microsoft redirect address" value={provider.redirectUri} />
        <span className="capture-note">The redirect address is where Microsoft sends you back after you approve Orbit.</span>
        {provider.redirectUri.startsWith('http://') ? <span className="capture-note">Orbit is running on this computer, and Microsoft refuses an http:// address in that box. Leave it empty, choose <strong>Register</strong>, then open <strong>Manifest</strong>, add this address to <code>replyUrlsWithType</code> with <code>"type": "Web"</code>, and save.</span> : null}
      </li>
      <li>Choose <strong>Register</strong>. On the page that opens, copy the <strong>Application (client) ID</strong>; that is your Client ID.</li>
    </ol> },
    { title: 'Allow reading mail and calendars', body: <ol>
      <li>In the menu on the left, open <strong>API permissions</strong> and choose <strong>Add a permission</strong>.</li>
      <li>Choose <strong>Microsoft Graph</strong>, then <Term meaning="Orbit acts only as you, when you allow it">Delegated permissions</Term>.</li>
      <li>Tick <strong>Mail.Read</strong>, <strong>Calendars.Read</strong> and <strong>offline_access</strong>, then choose <strong>Add permissions</strong>.</li>
    </ol> },
    { title: 'Create your sign-in key', body: <ol>
      <li>Open <strong>Certificates &amp; secrets</strong> and choose <strong>New client secret</strong>.</li>
      <li>Description: <strong>Orbit</strong>. Expires: <strong>24 months</strong>. Choose <strong>Add</strong>.</li>
      <li>Copy the <strong>Value</strong> at once (not the Secret ID). Microsoft shows it only this one time. That is your Client secret.</li>
    </ol> },
    { title: 'Paste the key and connect', heading: reconnect ? `Reconnect ${reconnect.name}` : undefined, next: false, body: <>
      <p className="capture-guide__lead">Paste the Application (client) ID and the secret Value.</p>
      <ProviderKeyForm provider={provider} sourceId={reconnect?.id} sourceName={reconnect?.name} />
    </> },
    { title: 'Choose folders and calendars', next: false, body: finish },
  ];
}
