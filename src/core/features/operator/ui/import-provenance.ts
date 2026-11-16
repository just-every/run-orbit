const vendors:Record<string,string>={csv:'spreadsheet',hubspot:'HubSpot export',pipedrive:'Pipedrive export'};
/** An import's name with its kind, unless the name already says it: "HubSpot 72407 (HubSpot export)", "Spreadsheet". */
export function importLabel(account:string,vendor:string){const kind=vendors[vendor];if(!kind)return account;return account.trim().toLowerCase()===kind.toLowerCase()||!account.trim()?account.trim()||kind[0]!.toUpperCase()+kind.slice(1):`${account} (${kind})`;}
/** Decode only the importer-owned custom field's structured format, never customer prose. */
export function importProvenance(name:string,value:unknown,operators:readonly {id:string;display_name:string}[]=[]):Record<string,unknown>|null{
 if(name!=='import_source')return null;
 // Imports store JSON text; native erasure can retain the same structure as an object.
 let parsed:unknown=value;if(typeof value==='string'){try{parsed=JSON.parse(value);}catch{return null;}}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return null;
 const source=parsed as Record<string,unknown>;
 if(!['csv','hubspot','pipedrive'].includes(String(source.vendor))||typeof source.account!=='string'||typeof source.sourceId!=='string')return null;
 if(!['owner','stage','description'].every(key=>Object.hasOwn(source,key)&&(source[key]===null||typeof source[key]==='string')))return null;
 // Read as the person sees their old system. A contact matched by email carries a hashed
 // identity, which means nothing to them; a real ID from the old system is shown.
 const {vendor,account,sourceId,owner,stage,description}=source;
 const assigned=operators.find(person=>person.id===source.ownerId)?.display_name;
 // Only human-readable provenance belongs in ordinary record details. Older imports
 // may contain internal owner IDs or future metadata; never spread that storage shape.
 return {imported_from:importLabel(account,String(vendor)),
  .../^(email:|company-name:)/.test(String(sourceId))?{}:{id_in_old_system:sourceId},
  ...assigned?{assigned_to:assigned}:{},
  ...owner?{owner_in_old_system:owner}:{},...stage?{stage_in_old_system:stage}:{},
  ...description?{description}:{},...typeof source.file==='string'?{file:source.file}:{},
  ...typeof source.row==='number'?{row:source.row}:{}};
}
export function customFieldValue(name:string,value:unknown){return importProvenance(name,value)??value;}
