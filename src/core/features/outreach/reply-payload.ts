import {payloadHash} from '../../platform/source-security';

/** Hash every accepted form value; MIME framing and generated boundaries are transport only. */
export async function replyPayloadHash(form:FormData){
 const fields=new Map<string,unknown[]>();
 for(const [name,value] of form.entries()){
  const values=fields.get(name)??[];
  if(typeof value==='string')values.push({text:value});
  else {
   const digest=await crypto.subtle.digest('SHA-256',await value.arrayBuffer());
   values.push({file:{name:value.name,type:value.type,size:value.size,sha256:Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')}});
  }
  fields.set(name,values);
 }
 return payloadHash(JSON.stringify({format:'orbit-reply-form-v1',fields:[...fields].sort(([a],[b])=>a<b?-1:a>b?1:0)}));
}
