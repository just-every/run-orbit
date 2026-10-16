import {parseMessage} from '../mime';

/**
 * Gmail and Google Workspace confirm a new forwarding address by mailing it a
 * code and a link. That message has no customer in it, so capture would not
 * store it; Orbit shows the code to the owner instead, so automatic forwarding
 * can be finished from the Capture page.
 */
export interface ForwardingConfirmation {provider:'Gmail';account:string|null;code:string|null;link:string|null;receivedAt:string}

export function forwardingConfirmation(raw:string,now=new Date()):ForwardingConfirmation|null{
 const message=parseMessage(raw),from=(message.rawHeader('from')??'').toLowerCase(),subject=message.header('subject')??'';
 if(!/<?forwarding-noreply@google\.com>?\s*$/.test(from)||!/forwarding confirmation/i.test(subject))return null;
 const code=/#(\d{6,12})/.exec(subject)?.[1]??/confirmation code:\s*(\d{6,12})/i.exec(message.text)?.[1]??null;
 const account=/receive mail from\s+([^\s]+@[^\s]+)/i.exec(subject)?.[1]?.toLowerCase()??null;
 const link=/https:\/\/(?:mail-settings|mail|isolated\.mail)\.google\.com\/mail\/vf-[^\s<>"')]+/.exec(message.text)?.[0]??null;
 return {provider:'Gmail',account,code,link,receivedAt:now.toISOString()};
}
