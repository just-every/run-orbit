import {eraseD1ImportTarget} from '../../../modules/import-kit/d1/index';
import {erasureContext} from './erasure';
import {containsMailbox,withdrawImportReviews} from './review-erasure';
import {redactImportedNativeCopies} from './native-erasure';
import {sql} from './targets';

/** Withdraw reversible source copies before removing an attributed operator identity. */
export async function eraseImportOwnerIdentity(db:D1Database,id:string,email:string,actor:string){
 const markers=(await db.prepare("SELECT kind,id,original_json FROM crm_import_targets WHERE kind IN('contact-owner','company-owner')").all<{kind:string;id:string;original_json:string}>()).results;
 const affected=markers.filter(marker=>{const value=JSON.parse(marker.original_json);return value.row.owner_id===id||value.history?.previous===id||value.history?.actor===id;});
 const native=[];
 for(const marker of affected){native.push(sql("DELETE FROM notifications WHERE event_key IN(SELECT 'import-ownership:'||p.job_id||':'||o.id FROM ik_provenance p CROSS JOIN operators o WHERE p.target_kind=? AND p.target_id=?)",marker.kind,marker.id),sql('DELETE FROM crm_import_targets WHERE kind=? AND id=?',marker.kind,marker.id));}
 // Related-source erasure severs reversible import effects while preserving each current native owner.
 await eraseD1ImportTarget('reference',`operator-erasure:${id}`,native,erasureContext(db,actor),{
  source:record=>{const payload=record.payload as any;return payload.ownerMapping?.ownerId===id||payload.actorId===id||payload.previousOwnerId===id||containsMailbox(JSON.stringify(payload),[email]);},
  original:bytes=>containsMailbox(Buffer.from(bytes).toString('utf8'),[email])
 });
 const statements=[...await withdrawImportReviews(db,id,[email]),...await redactImportedNativeCopies(db,'',[email])];
 // The source owner's label belongs to the mapped identity, even when it is not an email.
 for(const table of ['contacts','companies']){
  const source="CASE WHEN json_valid(json_extract(custom_fields_json,'$.import_source')) THEN json_extract(custom_fields_json,'$.import_source') ELSE '{}' END";
  statements.push(sql(`UPDATE ${table} SET custom_fields_json=json_set(custom_fields_json,'$.import_source',json_set(${source},'$.owner','Erased operator')) WHERE json_extract(${source},'$.ownerId')=?`,id));
 }
 return statements.map(statement=>db.prepare(statement.sql).bind(...statement.params??[]));
}
