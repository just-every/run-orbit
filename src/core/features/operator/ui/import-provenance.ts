/** Decode only the importer-owned custom field's structured format, never customer prose. */
export function importProvenance(name:string,value:unknown):Record<string,unknown>|null{
 if(name!=='import_source'||typeof value!=='string')return null;
 let parsed:unknown;try{parsed=JSON.parse(value);}catch{return null;}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return null;
 const source=parsed as Record<string,unknown>;
 if(!['csv','hubspot','pipedrive'].includes(String(source.vendor))||typeof source.account!=='string'||typeof source.sourceId!=='string')return null;
 if(!['owner','stage','description'].every(key=>Object.hasOwn(source,key)&&(source[key]===null||typeof source[key]==='string')))return null;
 // Additional metadata remains visible, including fields from a later importer.
 return source.vendor==='csv'?{...source,vendor:'Generic CSV'}:source;
}
export function customFieldValue(name:string,value:unknown){return importProvenance(name,value)??value;}
