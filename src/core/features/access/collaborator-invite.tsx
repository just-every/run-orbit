import {CopyField} from '../operator/ui/capture-copy-field';
import {formatDate} from '../operator/ui/formatters';
export interface CreatedInvitation{email:string;role:string;token:string;expiresAt:string;local:boolean}
const roleNames:Record<string,string>={guest:'Guest',analyst:'Analyst',seller:'Seller'};

/** The accept link carries the one-time token, so the collaborator never handles it themselves. */
export const acceptLink=(origin:string,token:string)=>`${origin}/app/access?${new URLSearchParams({invitation:token})}`;

/** On this computer email sign-in is off and the link points at this computer, so it cannot reach anyone else. */
function LocalInvitation({invitation}:{invitation:CreatedInvitation}){
 return <div className="fold-row" aria-label="Invitation ready"><h3>Invitation ready for {invitation.email}</h3>
  <p>On the computer running Orbit, open this link in a private window and choose <strong>Accept invitation as {invitation.email}</strong>. It signs them in to their shared records.</p>
  <p>To invite someone on another computer, use your hosted Orbit.</p>
  <CopyField label="Invitation link" value={acceptLink(window.location.origin,invitation.token)}/>
  <p>The link works once, only for {invitation.email}, until {formatDate(invitation.expiresAt)}.</p>
 </div>;
}
export function CreatedInvitationPanel({invitation}:{invitation:CreatedInvitation}){
 if(invitation.local)return <LocalInvitation invitation={invitation}/>;
 return <div className="fold-row" aria-label="Invitation ready"><h3>Invitation ready for {invitation.email}</h3>
  <p>Send {invitation.email} this link, by email or chat:</p>
  <CopyField label="Invitation link" value={acceptLink(window.location.origin,invitation.token)}/>
  <ol>
   <li>They open the link and sign in to Orbit with <strong>{invitation.email}</strong>. Orbit emails that address a sign-in link.</li>
   <li>After sign-in, Orbit accepts the invitation for them. They start as <strong>{roleNames[invitation.role]??invitation.role}</strong>.</li>
  </ol>
  <p>The link works once, only for {invitation.email}, until {formatDate(invitation.expiresAt)}. Orbit does not keep a copy, so copy it now. If it is lost, create a new invitation.</p>
 </div>;
}
