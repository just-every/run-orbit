import {securityHeaders} from '@runeditrun/rer/modules/operator-auth';
import {sha256} from './mutations';

const escape = (value:string) => value.replace(/[&<>"']/g, character => `&#${character.charCodeAt(0)};`);
type Invitation = {email:string; name:string};

function pending(invitation:Invitation, token:string, local:boolean, signIn:string) {
 const email = escape(invitation.email), name = escape(invitation.name);
 const intro = `<h1>You are invited to ${name}</h1><p>${name} invited <strong>${email}</strong> to work with them in Orbit. They choose which customer records you can see or change.</p>`;
 if (local) return intro + `<p>This invitation opens on the computer running Orbit. Accept it to open your shared records.</p><form method="post" action="/auth/local/invitation"><input type="hidden" name="invitation" value="${escape(token)}"><button class="action">Accept invitation as ${email}</button></form>`;
 return intro + `<p>Sign in with that address. Orbit emails it a sign-in link; open it on this device and Orbit accepts the invitation for you.</p><p><a class="action" href="${signIn}">Sign in as ${email}</a></p>`;
}

/** Reading an invitation never consumes it. Hosted visitors prove their email; local visitors confirm the one-use invitation. */
export async function invitationLanding(db:D1Database, url:URL, method:string, local:boolean):Promise<Response|null> {
 const token = url.searchParams.get('invitation');
 if (url.pathname !== '/app/access' || token === null) return null;
 const hash = token && token.length <= 200 ? await sha256(token) : null;
 const invitation = !hash ? null : await db.prepare("SELECT i.email,s.name FROM access_invitations i JOIN workspace_settings s WHERE i.token_hash=? AND i.accepted_by IS NULL AND i.revoked_at IS NULL AND i.expires_at>?").bind(hash,new Date().toISOString()).first<Invitation>();
 const accepted = !hash || invitation || local ? null : await db.prepare("SELECT i.email,s.name FROM access_invitations i JOIN workspace_settings s JOIN access_memberships m ON m.workspace_id=i.workspace_id AND m.operator_id=i.accepted_by AND m.status='active' WHERE i.token_hash=? AND i.revoked_at IS NULL").bind(hash).first<Invitation>();
 const recipient = invitation ?? accepted;
 const signIn = new URL('/signin', url);
 signIn.searchParams.set('returnTo', accepted ? '/app/shared-records' : url.pathname + url.search);
 if (recipient) signIn.searchParams.set('login_hint', recipient.email);
 const href = escape(signIn.pathname + signIn.search);
 const body = invitation ? pending(invitation,token,local,href) : accepted
  ? `<h1>Welcome back to ${escape(accepted.name)}</h1><p>You already accepted this invitation as <strong>${escape(accepted.email)}</strong>. Sign in with that address to open the records ${escape(accepted.name)} shares with you.</p><p><a class="action" href="${href}">Sign in as ${escape(accepted.email)}</a></p>`
  : '<h1>This invitation cannot be used</h1><p>The link has already been used, was withdrawn or has expired. Ask the person who invited you for a new invitation.</p><p><a href="/">Home</a></p>';
 const html = `<!doctype html><html lang="en" class="rer-themed"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${recipient ? `Invitation to ${escape(recipient.name)}` : 'Invitation'} · Orbit</title><link rel="stylesheet" href="/orbit-invitation.css"></head><body><main><p class="brand"><span data-rer-name>Orbit</span></p>${body}</main></body></html>`;
 // Send only the origin on the local confirmation POST so its CSRF check can verify it.
 return new Response(method==='HEAD'?null:html,{status:200,headers:{...securityHeaders(),'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':local?'strict-origin':'no-referrer','Content-Security-Policy':`default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; base-uri 'none'; form-action '${local?'self':'none'}'; frame-ancestors 'none'`}});
}
