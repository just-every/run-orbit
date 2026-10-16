const vendors:Record<string,string>={csv:'spreadsheet',hubspot:'HubSpot export',pipedrive:'Pipedrive export'};
/** An import's name with its kind, unless the name already says it: "HubSpot 72407 (HubSpot export)", "Spreadsheet". */
export function importLabel(account:string,vendor:string){const kind=vendors[vendor];if(!kind)return account;return account.trim().toLowerCase()===kind.toLowerCase()||!account.trim()?account.trim()||kind[0]!.toUpperCase()+kind.slice(1):`${account} (${kind})`;}
/** Decode only the importer-owned custom field's structured format, never customer prose. */
export function importProvenance(name:string,value:unknown):Record<string,unknown>|null{
 if(name!=='import_source'||typeof value!=='string')return null;
 let parsed:unknown;try{parsed=JSON.parse(value);}catch{return null;}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return null;
 const source=parsed as Record<string,unknown>;
 if(!['csv','hubspot','pipedrive'].includes(String(source.vendor))||typeof source.account!=='string'||typeof source.sourceId!=='string')return null;
 if(!['owner','stage','description'].every(key=>Object.hasOwn(source,key)&&(source[key]===null||typeof source[key]==='string')))return null;
 // Read as the person sees their old system. A contact matched by email carries a hashed
 // identity, which means nothing to them; a real ID from the old system is shown.
 const {vendor,account,sourceId,owner,stage,description,...later}=source;
 return {imported_from:importLabel(account,String(vendor)),...String(sourceId).startsWith('email:')?{}:{id_in_old_system:sourceId},...owner?{owner_in_old_system:owner}:{},...stage?{stage_in_old_system:stage}:{},...description?{description}:{},...later};
}
export function customFieldValue(name:string,value:unknown){return importProvenance(name,value)??value;}
