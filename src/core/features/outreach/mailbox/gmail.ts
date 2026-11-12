import {encodeId} from '../../capture/providers/config';
import {MailboxSendError} from './errors';
import {gmailRaw,mailboxMime} from './mime';
const base='https://gmail.googleapis.com/gmail/v1/users/me';
export interface GmailReceipt{providerMessageId:string;providerThreadId:string;messageId:string}
type Request=(url:string,init?:RequestInit)=>Promise<Response>;
async function receipt(request:Request,id:string,messageId:string):Promise<GmailReceipt>{
 const url=new URL(base+'/messages/'+encodeId(id));url.searchParams.set('format','metadata');url.searchParams.append('metadataHeaders','Message-ID');
 const response=await request(url.href),value=await response.json() as any;
 if(!response.ok||!value.labelIds?.includes('SENT')||typeof value.id!=='string'||typeof value.threadId!=='string'||!value.payload?.headers?.some((h:any)=>String(h.name).toLowerCase()==='message-id'&&h.value===messageId))throw new MailboxSendError('The mailbox has not confirmed the exact message in Sent. Reconciliation will read it again without sending.','delivery-unknown');
 return {providerMessageId:value.id,providerThreadId:value.threadId,messageId};
}
export async function gmailLookup(request:Request,messageId:string){
 const url=new URL(base+'/messages');url.searchParams.set('labelIds','SENT');url.searchParams.set('q','rfc822msgid:'+messageId);url.searchParams.set('maxResults','10');
 const response=await request(url.href);if(!response.ok)throw new MailboxSendError('Sent lookup is unavailable; delivery remains unresolved.','delivery-unknown');
 const value=await response.json() as any;if(!value.messages?.length)return undefined;
 // Never accept an unrelated message returned by a search.
 for(const row of value.messages){if(typeof row.id==='string')try{return await receipt(request,row.id,messageId);}catch(error){if(!(error instanceof MailboxSendError))throw error;}}
 return undefined;
}
export async function gmailSend(request:Request,message:Parameters<typeof mailboxMime>[0],from:string,threadId?:string){
 const response=await request(base+'/messages/send',{method:'POST',body:JSON.stringify({raw:gmailRaw(mailboxMime(message,from)),...(threadId?{threadId}:{})})});
 if(!response.ok)throw new MailboxSendError('Gmail did not accept the reviewed message.','delivery-unknown');
 const value=await response.json() as any;if(typeof value.id!=='string')throw new MailboxSendError('Gmail returned no message identity; reconciliation is required.','delivery-unknown');
 return receipt(request,value.id,message.message_id!);
}
