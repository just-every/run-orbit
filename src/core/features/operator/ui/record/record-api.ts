import type {ContactContext,OpportunityContext} from '../../../relationships/contracts';
import {SaveRefused,type SaveAnswer,type Values} from '../autosave/use-autosave';
import type {RecordKind} from '../records-api';

/** One JSON request for a record page's saves: a refusal keeps the server's words, a 409 its current copy, which
 * values turns from the server's row into the form's own values (the hook compares and sends again on those). */
export async function saveRequest<T>(path:string,method:string,body:unknown,init:{keepalive?:boolean}={},values?:(row:Values)=>Values):Promise<T>{
 const response=await fetch(`/api/v1/${path}`,{method,credentials:'same-origin',keepalive:init.keepalive,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const result=await response.json().catch(()=>({})) as T&{error?:string;current?:Values;changedBy?:string|null};
 if(!response.ok)throw new SaveRefused(result.error??'Orbit refused this change.',response.status,result.current&&values?values(result.current):result.current,result.changedBy);
 return result;
}

/** A record's own values, saved one change at a time (PATCH, with the values each change replaces). */
export async function patchRecord(kind:RecordKind,id:string,changes:Values,base:Values,init:{keepalive?:boolean}):Promise<SaveAnswer<Values>>{
 const result=await saveRequest<{changed:boolean;record:Values}>(`records/${kind}/${id}`,'PATCH',{changes,base},init,recordValues);
 return {copy:recordValues(result.record),changed:result.changed};
}
export async function readRecord<T=any>(kind:RecordKind,id:string):Promise<T>{
 const response=await fetch(`/api/v1/records/${kind}/${id}`,{credentials:'same-origin'});
 const result=await response.json().catch(()=>({})) as T&{error?:string};
 if(!response.ok)throw Object.assign(new Error(result.error??'Orbit could not load this record.'),{status:response.status});
 return result;
}
/** A record row as the fields a page saves: its columns, and each custom field as custom:<key>. */
export function recordValues(row:Values):Values{
 const custom=JSON.parse(row.custom_fields_json??'{}') as Values;
 return {...row,...Object.fromEntries(Object.entries(custom).map(([key,value])=>[`custom:${key}`,value]))};
}

/** A deal's or a contact's relationships, as the fields their page saves; products are one per line. */
export type DealContextValues={revision:string;company:string|null;companyName:string;stakeholders:OpportunityContext['stakeholders'];products:string;nextStep:string;mutualCommitments:string};
export type ContactContextValues={revision:string;primaryCompany:ContactContext['primaryCompany'];secondaryCompanies:ContactContext['secondaryCompanies']};
export const dealContextValues=(context:OpportunityContext):DealContextValues=>({revision:context.revision,company:context.company?.id??null,companyName:context.company?.name??'',stakeholders:context.stakeholders,products:context.products.join('\n'),nextStep:context.nextStep,mutualCommitments:context.mutualCommitments});
export const contactContextValues=(context:ContactContext):ContactContextValues=>({revision:context.revision,primaryCompany:context.primaryCompany,secondaryCompanies:context.secondaryCompanies});

export async function readContext<T>(kind:'opportunity'|'contact',id:string):Promise<T>{
 const response=await fetch(`/api/v1/relationships/${kind}/${id}`,{credentials:'same-origin'});
 const result=await response.json().catch(()=>({})) as T&{error?:string};
 if(!response.ok)throw new Error(result.error??'Orbit could not load these relationships.');
 return result;
}
/** The whole context with its revision, the one change applied (today's body); 409 when it changed meanwhile. */
export async function saveDealContext(id:string,changes:Partial<DealContextValues>,copy:DealContextValues,init:{keepalive?:boolean}):Promise<SaveAnswer<DealContextValues>>{
 const next={...copy,...changes},stakeholders=next.stakeholders;
 const body={revision:copy.revision,companyId:next.company,primaryContactId:stakeholders.find(item=>item.isPrimary)?.contactId??stakeholders[0]?.contactId??null,
  stakeholders:stakeholders.map(({contactId,roles,verified})=>({contactId,roles,verified})),
  products:[...new Map(next.products.split('\n').map(item=>item.trim()).filter(Boolean).map(item=>[item.toLowerCase(),item])).values()],nextStep:next.nextStep,mutualCommitments:next.mutualCommitments};
 const context=await saveRequest<OpportunityContext>(`relationships/opportunity/${id}`,'PUT',body,init);
 return {copy:dealContextValues(context),changed:context.revision!==copy.revision};
}
export async function saveContactContext(id:string,changes:Partial<ContactContextValues>,copy:ContactContextValues,init:{keepalive?:boolean}):Promise<SaveAnswer<ContactContextValues>>{
 const next={...copy,...changes};
 const context=await saveRequest<ContactContext>(`relationships/contact/${id}`,'PUT',{revision:copy.revision,secondaryCompanies:next.secondaryCompanies.map(({companyId,verified})=>({companyId,verified}))},init);
 return {copy:contactContextValues(context),changed:context.revision!==copy.revision};
}
