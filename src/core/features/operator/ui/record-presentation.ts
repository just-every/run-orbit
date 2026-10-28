import {label} from './formatters';

export function recordStateLabel(value:string){return ({now:'Needs attention',next:'Up next',none:'No attention needed',do_not_contact:'Do not contact'} as Record<string,string>)[value]??label(value);}
const stateFields=new Set(['lifecycle','band','queue_state','contactability','state','status','actor_type','outcome']);
export function recordFieldValue(key:string,value:unknown):unknown{return typeof value==='string'&&stateFields.has(key)?recordStateLabel(value):value;}
const identifier=/^[0-9A-HJKMNP-TV-Z]{26}$/;
/** Record presentation keeps customer words while leaving implementation identifiers out. */
export function recordWords(value:unknown,key=''):unknown{
 if(value===null||value===undefined||value==='')return undefined;
 if(typeof value==='string')return identifier.test(value)?undefined:recordFieldValue(key,value);
 if(Array.isArray(value)){const items=value.map(item=>recordWords(item,key)).filter(item=>item!==undefined);return items.length?items:undefined;}
 if(typeof value==='object'){
  const entries=Object.entries(value).filter(([field])=>!/(^id$|_ids?$|Ids?$|_key$|_revision$)/.test(field)).map(([field,item])=>[field,recordWords(item,field)] as const).filter(([,item])=>item!==undefined);
  return entries.length?Object.fromEntries(entries):undefined;
 }
 return value;
}
