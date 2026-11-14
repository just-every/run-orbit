type Row=Record<string,string|number|null>;
type Proof={id:string;token:string};
type Contact={id:string;name:string;email:string|null;contactability:string};
export type EmailPermissionPreview={count:number;names:{id:string;name:string}[];archivedCount:number;additionalCount:number};
/** Project the same archived addresses and clear receipts used by restore, without changing them. */
export class ArchiveEmailPermissionPreview{
 private contacts:Contact[]=[];
 private aliases=new Map<string,string[]>();
 private contexts:{id:string;key:string}[]=[];
 private proofs:Proof[]=[];
 private cleared=new Set<string>();
 add(table:string,row:Row){
  if(table==='contacts')this.contacts.push({id:String(row.id),name:String(row.name||row.email||'Unnamed contact'),email:typeof row.email==='string'?row.email:null,contactability:String(row.contactability)});
  if(table==='record_aliases'&&row.record_type==='contact'&&typeof row.survivor_id==='string'&&typeof row.identity_key==='string'){
   const values=this.aliases.get(row.survivor_id)??[];values.push(row.identity_key);this.aliases.set(row.survivor_id,values);
  }
  if(table==='privacy_matching_contexts'){
   if(typeof row.context_id!=='string'||!/^[a-f0-9]{32}$/.test(row.context_id)||typeof row.matching_key!=='string'||!/^[a-f0-9]{64}$/.test(row.matching_key))throw new Error('Archive email permission details are invalid.');
   this.contexts.push({id:row.context_id,key:row.matching_key});
  }
  if(table==='audit_entries'&&row.action==='contact.suppressed')this.proofs.push({id:String(row.id),token:String(row.entity_id)});
  if(table==='audit_entries'&&row.action==='contact.suppression_cleared'){
   const details=JSON.parse(String(row.details_json));
   for(const id of details.proofs??[])this.cleared.add(`${row.entity_id}/${id}`);
  }
 }
 async finish():Promise<EmailPermissionPreview>{
  const normalize=(email:string)=>email.trim().toLowerCase();
  const addresses=[...new Set(this.contacts.flatMap(contact=>[contact.email,...(this.aliases.get(contact.id)??[])].filter((email):email is string=>!!email?.trim()).map(normalize)))];
  const target=new Map<string,Proof[]>();
  // Bounded requests reveal matching proof IDs, never this installation's private matching keys.
  for(let offset=0;offset<addresses.length||offset===0;offset+=200){
   const emails=addresses.slice(offset,offset+200),response=await fetch('/api/v1/records/archive/preview/email-stops',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({emails,includeClears:offset===0})});
   if(!response.ok)throw new Error('Email stops could not be checked. Restore has not started.');
   const result=await response.json() as {matches:Proof[][];clears:Proof[]};
   for(const proof of result.clears)this.cleared.add(`${proof.token}/${proof.id}`);
   emails.forEach((email,index)=>target.set(email,result.matches[index]));
  }
  const archiveStops=new Set(this.proofs.filter(proof=>!this.cleared.has(`${proof.token}/${proof.id}`)).map(proof=>proof.token));
  const keys=await Promise.all(this.contexts.map(async context=>({id:context.id,key:await crypto.subtle.importKey('raw',Uint8Array.from(context.key.match(/../g)!,byte=>parseInt(byte,16)),{name:'HMAC',hash:'SHA-256'},false,['sign'])})));
  const stopped=new Set<string>();
  for(const email of addresses){
   if(target.get(email)?.some(proof=>!this.cleared.has(`${proof.token}/${proof.id}`))){stopped.add(email);continue;}
   for(const context of keys){
    const digest=await crypto.subtle.sign('HMAC',context.key,new TextEncoder().encode(`orbit-mail-suppression-v1:${email}`));
    const token=context.id+':'+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
    if(archiveStops.has(token)){stopped.add(email);break;}
   }
  }
  const held=this.contacts.filter(contact=>contact.contactability==='do_not_contact'||[contact.email,...(this.aliases.get(contact.id)??[])].some(email=>email&&stopped.has(normalize(email))));
  held.sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
  const archivedCount=held.filter(contact=>contact.contactability==='do_not_contact').length;
  return {count:held.length,names:held.slice(0,5).map(({id,name})=>({id,name})),archivedCount,additionalCount:held.length-archivedCount};
 }
}
