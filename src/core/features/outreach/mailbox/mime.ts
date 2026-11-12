import {MailboxSendError} from './errors';
const base64=(value:string)=>{const bytes=new TextEncoder().encode(value);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);};
export function mailboxMime(input:{recipient_email:string;subject:string;body:string;message_id?:string;reference_ids?:string;opt_out?:boolean;opt_out_url?:string},from:string){
 const clean=(value:string)=>{if(/[\r\n\x00]/.test(value))throw new MailboxSendError('Mail headers contain an invalid line break.','failed');return value;};
 const address=(value:string)=>{if(!/^[^\s<>@,;]+@[^\s<>@,;]+$/.test(value))throw new MailboxSendError('Choose exactly one mailbox address.','failed');return clean(value);};
 if(!input.message_id||!/^<[^\s<>]+@[^\s<>]+>$/.test(input.message_id))throw new MailboxSendError('The reviewed message has no durable Message-ID.','failed');
 const subject=clean(input.subject),words:string[]=[];let word='',bytes=0;
 for(const character of subject){const size=new TextEncoder().encode(character).length;if(bytes+size>42){words.push(word);word='';bytes=0;}word+=character;bytes+=size;}if(word)words.push(word);
 const encoded=words.map(part=>'=?UTF-8?B?'+base64(part)+'?=').join('\r\n ');
 const headers=['From: '+address(from),'To: '+address(input.recipient_email),'Subject: '+encoded,'Message-ID: '+clean(input.message_id),'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64'];
 if(input.reference_ids)headers.push('References: '+clean(input.reference_ids),'In-Reply-To: '+clean(input.reference_ids));
 if(input.opt_out){
  if(!input.opt_out_url)throw new MailboxSendError('Opt-out requires this installation’s configured origin.','failed');
  const url=new URL(clean(input.opt_out_url));if(!['http:','https:'].includes(url.protocol))throw new MailboxSendError('Invalid opt-out origin.','failed');
  headers.push('List-Unsubscribe: <'+url.href+'>','List-Unsubscribe-Post: List-Unsubscribe=One-Click');
 }
 return headers.join('\r\n')+'\r\n\r\n'+(base64(input.body+(input.opt_out&&input.opt_out_url?'\n\nUnsubscribe: '+input.opt_out_url:'')).match(/.{1,76}/g)??[]).join('\r\n');
}
export const gmailRaw=(mime:string)=>base64(mime).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
