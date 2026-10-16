import {CopyField} from '../operator/ui/capture-copy-field';
import {formatDate} from '../operator/ui/formatters';
export interface CreatedInvitation{email:string;role:string;token:string;expiresAt:string}
const roleNames:Record<string,string>={guest:'Guest',analyst:'Analyst',seller:'Seller'};

/** The accept link carries the one-time token, so the collaborator never handles it themselves. */
export const acceptLink=(origin:string,token:string)=>`${origin}/app/access?${new URLSearchParams({invitation:token})}`;

export function CreatedInvitationPanel({invitation}:{invitation:CreatedInvitation}){
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
