import {canonicalJson,sha256,type D1Database,type D1UndoEffect,type TargetRow} from '../../../modules/import-kit/d1/index';
import {tables,type NativeValue} from './targets';
import {readImportOwner} from './ownership';
import {stopRead} from './targets-stop';
/** A complete native snapshot in a bounded number of reads, including relation rows. */
export async function readUndoTargets(db:D1Database,destination:string,effects:D1UndoEffect[]){
 const values=new Map<string,TargetRow>(),ids=JSON.stringify(effects.map(e=>e.expected.targetId));
 const markers=(await db.prepare('SELECT kind,id,revision,original_json FROM crm_import_targets WHERE id IN(SELECT value FROM json_each(?))').bind(ids).all()).results;
 const markerMap=new Map(markers.map(row=>[`${row.kind}:${row.id}`,row]));
 for(const [kind,table] of Object.entries(tables)){
  const selected=effects.filter(e=>e.expected.targetKind===kind);if(!selected.length)continue;
  const selectedIds=JSON.stringify(selected.map(e=>e.expected.targetId)),rows=(await db.prepare(`SELECT * FROM ${table} WHERE id IN(SELECT value FROM json_each(?))`).bind(selectedIds).all()).results;
  const linkTable=kind==='deal'?'opportunity_contacts':kind==='note'?'timeline_entry_records':null,foreign=kind==='deal'?'opportunity_id':'timeline_entry_id';
  const relationRows=linkTable?(await db.prepare(`SELECT * FROM ${linkTable} WHERE ${foreign} IN(SELECT value FROM json_each(?)) ORDER BY ${kind==='deal'?'contact_id':'record_type,record_id'}`).bind(selectedIds).all()).results:[];
  for(const row of rows){const marker=markerMap.get(`${kind}:${row.id}`),original=marker?JSON.parse(marker.original_json):null,value:NativeValue={row,...original?.ownership?{ownership:await readImportOwner(db,original.ownership)}:{},links:relationRows.filter(link=>link[foreign]===row.id),...original?.suppressionTokens?{suppressionTokens:original.suppressionTokens}:{}};
   values.set(`${kind}:${row.id}`,{destination,targetKind:kind,targetId:row.id,value,revision:marker?.revision??sha256(canonicalJson(value))});}
 }
 for(const effect of effects.filter(e=>e.expected.targetKind==='suppression')){const value=await stopRead(db,destination,effect.expected.targetId);if(value)values.set(`suppression:${effect.expected.targetId}`,value);}
 return values;
}
