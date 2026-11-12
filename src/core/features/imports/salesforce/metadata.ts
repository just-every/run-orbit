import {RecordError} from '../../records/shared';
import {api} from './security';
import type {SalesforceProvider} from './provider';
export const objects=['Account','Contact'] as const;
export type ObjectName=typeof objects[number];
export interface Field {name:string;label:string;type:string;custom:boolean;supported:boolean}
export interface Diagnostic {source:string;reason:string;exportStep:string}
export interface Metadata {fields:Record<ObjectName,Field[]>;diagnostics:Diagnostic[]}
export const mappings={Account:{id:'Id',name:'Name',owner:'OwnerId',description:'Description'},Contact:{id:'Id',first_name:'FirstName',last_name:'LastName',email:'Email',phone:'Phone',job_title:'Title',company_ids:'AccountId',owner:'OwnerId',dnc:'HasOptedOutOfEmail'}};
const supported=new Set(['string','textarea','email','phone','url','boolean','double','int','currency','percent','date','datetime','picklist','multipicklist','id']);
const supportedReference=new Set(['AccountId','OwnerId']);
export async function describe(provider:SalesforceProvider):Promise<Metadata>{
 const fields={} as Metadata['fields'],diagnostics:Diagnostic[]=[];
 for(const object of objects){
  const {body}=await provider.get(`${api}/sobjects/${object}/describe`),source=`${object} describe`;
  if(body.name!==object||body.queryable!==true||!Array.isArray(body.fields))throw new RecordError(409,`${object} is unavailable for query. Ask the Salesforce administrator for object read access, or export ${object} records from Data Export.`);
  fields[object]=body.fields.filter((f:any)=>typeof f.name==='string'&&/^[A-Za-z][A-Za-z0-9_]{0,199}$/.test(f.name)&&f.deprecatedAndHidden!==true).map((f:any)=>({name:f.name,label:typeof f.label==='string'?f.label:f.name,type:String(f.type),custom:f.custom===true,supported:supported.has(f.type)||f.type==='reference'&&supportedReference.has(f.name)}));
  if(!fields[object].some(f=>f.name==='Id'))throw new RecordError(409,`${object}.Id is unavailable. Grant read access or export records with original IDs.`);
  for(const name of Object.values(mappings[object]))if(!fields[object].some(f=>f.name===name&&f.supported))diagnostics.push({source:`${object}.${name}`,reason:'Unavailable under the current field permissions; not read or mapped.',exportStep:`Ask a Salesforce administrator for field read access to ${object}.${name}, or include it with Id in a ${object} Data Export and review separately.`});
  for(const field of fields[object].filter(f=>!f.supported))diagnostics.push({source:`${object}.${field.name}`,reason:`Unsupported metadata type ${field.type}; not read or mapped.`,exportStep:`Export ${object}.${field.name} with Id using Salesforce Data Export and map it explicitly in a later supported migration.`});
  if(body.recordTypeInfos?.length)diagnostics.push({source:`${source}: recordTypeInfos`,reason:'Record type translation is not supported by this Account and Contact connection.',exportStep:`Export RecordTypeId with ${object} Id and retain the Salesforce record type definitions for a separate migration.`});
 }
 for(const name of ['Lead','Opportunity','custom objects','products','activities','Files','Attachment','Flow','Process Builder','workflow rules'])diagnostics.push({source:`Salesforce ${name}`,reason:'Outside this Account and Contact pull; no entities, files or automation are imported or activated.',exportStep:`Use Salesforce Data Export or the metadata export for ${name}; retain IDs and associations for the remaining guided migration.`});
 return{fields,diagnostics};
}
