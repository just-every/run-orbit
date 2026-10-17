import {parseCsv} from '../../../shared/csv';
import type {ImportInput} from '../../imports/contracts';
export type ImportOwnerUser={id:string;name:string;email:string};
export function ImportOwnerMapping({files,owners,setOwners,users}:{files:ImportInput['files'];owners:NonNullable<ImportInput['owners']>;setOwners:(owners:NonNullable<ImportInput['owners']>)=>void;users:ImportOwnerUser[]}){
 const values=files.flatMap(file=>{
  if((file.kind!=='contact'&&file.kind!=='company')||!file.mapping.owner)return [];
  const [headers,...rows]=parseCsv(file.csv.replace(/^\uFEFF/,'')),column=headers?.indexOf(file.mapping.owner)??-1,counts=new Map<string,number>();
  if(column>=0)for(const row of rows){const value=row[column]?.trim();if(value)counts.set(value,(counts.get(value)??0)+1);}
  return [...counts].map(([value,count])=>({kind:file.kind as 'contact'|'company',value,count}));
 });
 if(!values.length)return null;
 return <fieldset><legend>Contact and company owners</legend><p>Orbit matches an owner only by their exact email address. Choose an active Orbit user for other values, or leave them unassigned. This does not invite anyone. Existing Orbit records keep their owner; review changes on their record page.</p>{values.map(({kind,value,count})=>{
  const explicit=Object.hasOwn(owners[kind],value),matches=users.filter(user=>user.email.toLowerCase()===value.toLowerCase()),matched=matches.length===1?matches[0]:undefined,selected=explicit?owners[kind][value]??'':matched?.id??'';
  return <label key={`${kind}:${value}`}>{kind==='contact'?'Contact':'Company'} owner “{value}” · {count} {count===1?'row':'rows'}{!explicit&&matched?' · exact email match':!explicit?' · unmatched':''}<select aria-label={`${kind} owner ${value}`} value={selected} onChange={event=>setOwners({...owners,[kind]:{...owners[kind],[value]:event.target.value||null}})}><option value="">Leave unassigned</option>{users.map(user=><option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}</select></label>;
 })}</fieldset>;
}
export function ImportOwnerReview({owners}:{owners:any[]}){
 if(!owners?.length)return null;
 return <section aria-label="Saved owner mapping"><h3>Reviewed owner mapping</h3><ul>{owners.map(owner=><li key={`${owner.kind}:${owner.value}`}>{owner.kind==='contact'?'Contact':'Company'} owner “{owner.value}” · {owner.count} {owner.count===1?'row':'rows'} → {owner.ownerId?owner.ownerName:'Unassigned'} ({owner.method==='email'?'exact email match':owner.method==='explicit'?'explicit mapping':'unmatched'}){owner.linkedCount?` · ${owner.linkedCount} existing records keep their current owner; open their record below to review an assignment.`:''}</li>)}</ul></section>;
}
