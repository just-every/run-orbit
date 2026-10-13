import {z} from 'zod';
import {withoutMailboxComments} from './mailbox-comments';

/** Parse one mailbox. Angles inside a quoted display name are never an address. */
export function replySender(from:string):string|null{
 const uncommented=withoutMailboxComments(from);if(uncommented===null)return null;from=uncommented;
 let quoted=false,escaped=false,open=-1,close=-1;
 for(let i=0;i<from.length;i++){
  const char=from[i];
  if(escaped){escaped=false;continue;}
  if(quoted&&char==='\\'){escaped=true;continue;}
  if(char==='"'){quoted=!quoted;continue;}
  if(quoted)continue;
  if(char===','||char===';')return null;
  if(char==='<'){if(open!==-1||close!==-1)return null;open=i;}
  if(char==='>'){if(open===-1||close!==-1)return null;close=i;}
 }
 if(quoted||escaped||(open===-1)!==(close===-1))return null;
 if(close!==-1&&from.slice(close+1).trim())return null;
 if(open!==-1){
  // A bare address before the angle mailbox is malformed, not a display name.
  const display=from.slice(0,open).trim();
  const words=display.match(/"(?:[^"\\\r\n]|\\[^\r\n])*"|[^\s]+/gu)??[];
  if(words.some(word=>!/^"(?:[^"\\\r\n]|\\[^\r\n])*"$/u.test(word)&&!/^[-a-zA-Z0-9!#$%&'*+\/=?^_`{|}~.\u0080-\uFFFF]+$/u.test(word)))return null;
 }

 // CFWS may surround the local part and domain, but never join split atoms.
 const address=(open===-1?from:from.slice(open+1,close)).trim();
 const parts=address.match(/^([^\s@]+)\s*@\s*([^\s@]+)$/u);if(!parts)return null;
 const mailbox=`${parts[1]}@${parts[2]}`.toLowerCase();
 return z.email().safeParse(mailbox).success?mailbox:null;
}
