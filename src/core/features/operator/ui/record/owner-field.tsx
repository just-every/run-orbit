import {useCallback,useMemo} from 'react';
import {AutosaveField,choiceProps} from '../autosave/field';
import {SaveRefused,useAutosave,type Values} from '../autosave/use-autosave';
import type {ReviewedRecordChange} from '../reviewed-record-changes';
import {saveRequest} from './record-api';

/** A contact's or a company's one owner (INPUT-001): choosing runs today's reviewed assignment for this one record in one
 * go (review, then apply); a change the review refuses comes back in words. The list's bulk assignment keeps its review. */
export function OwnerField({kind,id,ownership,operators,onSaved}:{kind:'contact'|'company';id:string;ownership:{ownerId:string|null;ownerName:string|null}|undefined;operators:any[];onSaved:()=>void}){
 const copy=useMemo(()=>({owner:ownership?.ownerId??null}),[ownership?.ownerId]);
 const people=operators.filter(operator=>operator.status==='active'&&!operator.collaborator);
 const send=useCallback(async(changes:Values,_base:Values,_copy:Values,init:{keepalive?:boolean})=>{
  const batch=await saveRequest<{id:string;items:ReviewedRecordChange[]}>('records/ownership/review','POST',{kind,ids:[id],ownerId:changes.owner??null},init);
  const review=batch.items.find(item=>item.failure);
  if(review)throw new SaveRefused(review.failure!,422);
  const applied=await saveRequest<{id:string;items:ReviewedRecordChange[]}>(`records/ownership/${batch.id}/apply`,'POST',{},init);
  const refused=applied.items.find(item=>item.failure);
  if(refused)throw new SaveRefused(refused.failure!,422);
  return {copy:{owner:changes.owner??null},changed:true};
 },[kind,id]);
 const form=useAutosave<Values>({key:`owner.${kind}.${id}`,copy,send,reread:async()=>copy,onSaved});
 return <AutosaveField form={form} field="owner" label="Owner" quiet describe={value=>people.find(person=>person.id===value)?.display_name??'Unassigned'}>
  <select {...choiceProps(form,'owner',value=>value||null)}><option value="">Unassigned</option>{people.map(person=><option key={person.id} value={person.id}>{person.display_name}</option>)}</select>
 </AutosaveField>;
}
