import {replySender} from './reply-sender';

/** Keep every referenced thread while refusing ambiguous identity or time headers. */
export function replyHeaders(form:FormData){
 const fields=form.getAll('headers');
 if(fields.some(value=>typeof value!=='string'))return null;
 const values=new Map<string,string[]>();
 for(const field of fields){
  for(const line of String(field).replace(/\r?\n[ \t]+/g,' ').split(/\r?\n/)){
   const senderField=/^\s*from(?:[\s:\u0000-\u001f\u007f-\u009f]|$)/i.test(line);
   if(senderField&&/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(line))return null;
   const match=line.match(/^([a-z0-9-]+):\s*(.*)$/i);
   // A malformed sender field is not evidence that raw From was omitted.
   if(!match){if(senderField)return null;continue;}
   const name=match[1]!.toLowerCase(),entries=values.get(name)??[];entries.push(match[2]!.trim());values.set(name,entries);
  }
 }
 const messages=values.get('message-id')??[],dates=values.get('date')??[];
 if(messages.length!==1||!messages[0]||dates.length!==1||!Number.isFinite(Date.parse(dates[0]!)))return null;
 const senders=values.get('from')??[],sender=senders.length===1?replySender(senders[0]!):undefined;
 if(senders.length>1||sender===null)return null;
 // Match Capture's automatic-mail indicators, considering every header rather
 // than letting a second Auto-Submitted: no conceal an automatic submission.
 const automatic=(values.get('auto-submitted')??[]).some(value=>value.toLowerCase()!=='no')
  ||['x-autoreply','x-autorespond'].some(name=>(values.get(name)??[]).some(Boolean))
  ||(values.get('precedence')??[]).some(value=>/auto[_-]reply/i.test(value));
 return {sender,automatic,messageId:messages[0],occurredAt:new Date(dates[0]!).toISOString(),references:[...(values.get('references')??[]),...(values.get('in-reply-to')??[])].join(' ')};
}
