/**
 * The installation's Orbit address. The owner configures one mailbox that
 * reaches this Worker (CAPTURE_MAIL_ADDRESS, e.g. orbit@capture.example.com,
 * through Cloudflare Email Routing or SendGrid Inbound Parse). Orbit adds a
 * private tag to it: only mail sent to `orbit+<tag>@capture.example.com`
 * reaches capture, so a guessed or published base address cannot write evidence.
 */
export interface MailboxConfig {local:string;domain:string}

export function mailboxConfig(value:string|undefined):MailboxConfig|null{
 const match=/^([a-z0-9][a-z0-9._-]{0,40})@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)$/.exec((value??'').trim().toLowerCase());
 return match&&!match[1]!.includes('+')?{local:match[1]!,domain:match[2]!}:null;
}

const alphabet='abcdefghijkmnpqrstuvwxyz23456789';
export function newTag(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),byte=>alphabet[byte%alphabet.length]).join('');}
export function formatAddress(config:MailboxConfig,tag:string){return `${config.local}+${tag}@${config.domain}`;}

function equal(left:string,right:string){
 if(left.length!==right.length)return false;
 let difference=0;for(let index=0;index<left.length;index++)difference|=left.charCodeAt(index)^right.charCodeAt(index);
 return difference===0;
}
/** True when one envelope recipient is exactly this installation's tagged address. */
export function addressedTo(recipients:string[],config:MailboxConfig,tag:string){
 const expected=formatAddress(config,tag);
 return recipients.some(recipient=>{
  const address=(/<([^<>]+)>/.exec(recipient)?.[1]??recipient).trim().toLowerCase();
  return equal(address,expected);
 });
}
