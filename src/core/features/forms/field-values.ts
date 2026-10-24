import {RecordError} from '../records/shared';
import type {FormDefinition} from './definition';
/** The reviewed definition alone decides what a visitor may send. Picklists accept
 * only their published choices, query fields only bounded text, and fixed hidden
 * values come from the definition, never from the request. */
export function submittedFormValues(form:FormDefinition,values:Record<string,string>,consent?:boolean){
 const fields=new Map(form.fields.map(field=>[field.id,field]));
 for(const [id,value]of Object.entries(values)){
  const field=fields.get(id);
  if(!field||(field.hidden&&'value' in field.hidden))throw new RecordError(400,'Use the published fields and consent choice.');
  if(field.choices&&value!==''&&!field.choices.includes(value))throw new RecordError(400,'Choose one of the published options.');
  if(field.hidden&&value.length>500)throw new RecordError(400,'A page value exceeds 500 characters.');
 }
 if(form.fields.some(field=>field.required&&!values[field.id]?.trim())||(!form.consentWording&&consent))throw new RecordError(400,'Use the published fields and consent choice.');
 return {...values,...Object.fromEntries(form.fields.flatMap(field=>field.hidden&&'value' in field.hidden?[[field.id,field.hidden.value]]:[]))} as Record<string,string>;
}
