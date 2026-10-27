import type {RecordKind} from '../records/shared';

/** Withdraw local authority before the native erasure removes graph edges. */
export function apiCredentialErasure(db:D1Database,kind:RecordKind,id:string){
 const deals=kind==='opportunity'?'SELECT ? AS id':kind==='contact'?'SELECT opportunity_id AS id FROM opportunity_contacts WHERE contact_id=?':'SELECT id FROM opportunities WHERE company_id=?';
 return [db.prepare(`DELETE FROM api_credentials WHERE EXISTS(SELECT 1 FROM json_each(records_json) r WHERE r.value IN(${deals}))`).bind(id)];
}
