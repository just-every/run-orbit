import {z} from 'zod';
import {RecordError} from '../records/shared';
export const mappingSchema=z.object({recordType:z.enum(['contact','company','opportunity']),field:z.string().max(100),valueType:z.enum(['text','number','boolean']).optional()}).strict().refine(value=>isMappedField(value.recordType,value.field),'Choose an allowed native or custom property.');
export type FormMapping=z.infer<typeof mappingSchema>;
const nativeFields={contact:['name','email','phone','job_title','timezone'],company:['name','primary_domain'],opportunity:['title','value_cents','expected_close_at']};
/** Name, email, phone and job title save to the contact unless a field maps them elsewhere. */
export function fieldMapping(field:{id:string;mapping?:FormMapping}):FormMapping|undefined{return field.mapping??(['name','email','phone','job_title'].includes(field.id)?{recordType:'contact',field:field.id}:undefined);}
export function isMappedField(kind:string,field:string){return kind in nativeFields&&((nativeFields[kind as keyof typeof nativeFields] as string[]).includes(field)||/^custom\.[a-z][a-z0-9_]{0,63}$/.test(field));}
/** This single allowlist also validates edited proposals before an SQL column is selected. */
export function mappedValue(mapping:FormMapping,input:string):string|number|boolean|null{
 if(!isMappedField(mapping.recordType,mapping.field))throw new RecordError(400,'This property is not allowed for form intake.');
 const value=input.trim();if(!value)return null;
 if(mapping.field.startsWith('custom.')){
  if(mapping.valueType==='number'){if(!/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value)||!Number.isFinite(Number(value)))throw new RecordError(400,'Enter a finite custom number.');return Number(value);}
  if(mapping.valueType==='boolean'){if(!['true','false'].includes(value))throw new RecordError(400,'Enter true or false for this custom property.');return value==='true';}
  if(value.length>4000)throw new RecordError(400,'Custom text exceeds 4000 characters.');return value;
 }
 if(mapping.field==='value_cents'){const n=Number(value);if(!/^\d+$/.test(value)||!Number.isSafeInteger(n)||n>100000000000)throw new RecordError(400,'Enter a non-negative amount in cents.');return n;}
 if(mapping.field==='expected_close_at'){if(!z.iso.datetime().safeParse(value).success)throw new RecordError(400,'Enter an ISO close date and time.');return value;}
 if(value.length>500)throw new RecordError(400,'This value exceeds 500 characters.');
 if(mapping.field==='email'){if(value.length>254||!z.email().safeParse(value).success)throw new RecordError(400,'Enter a valid email address.');return value.toLowerCase();}
 if(mapping.field==='primary_domain'){const domain=value.toLowerCase().replace(/^www\./,'');if(!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain))throw new RecordError(400,'Enter a company domain without a URL path.');return domain;}
 if(mapping.field==='timezone'){try{new Intl.DateTimeFormat('en',{timeZone:value});}catch{throw new RecordError(400,'Enter a valid time zone.');}}
 return value;
}
export function setMapped(target:Record<string,any>,field:string,value:unknown){if(field.startsWith('custom.')){target.custom_fields??={};target.custom_fields[field.slice(7)]=value;}else target[field]=value;}
export function mappedFormValues(fields:{id:string;mapping?:FormMapping}[],values:Record<string,string|undefined>){
 const result:{contact:Record<string,any>;company:Record<string,any>;opportunity:Record<string,any>}={contact:{},company:{},opportunity:{}};
 for(const field of fields){const mapping=fieldMapping(field);if(!mapping||values[field.id]===undefined)continue;const value=mappedValue(mapping,values[field.id]!);if(value!==null)setMapped(result[mapping.recordType],mapping.field,value);}
 return result;
}
