import {createId} from '../../shared/ids';
import {RecordError,audit} from '../records/shared';
import {automaticOwnership} from './automatic';
export interface OwnershipRules {company:'off'|'unowned'|'always';firstEmail:boolean}
const defaults:OwnershipRules={company:'off',firstEmail:false};
const key='ownership_rules';
const hash=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');
async function owner(db:D1Database,actor:string){if(!await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)").bind(actor).first())throw new RecordError(403,'Only the installation owner can configure assignment rules.');}
export async function ownershipRules(db:D1Database,actor:string){
 const row=await db.prepare('SELECT value FROM runtime_controls WHERE name=?').bind(key).first<string>('value');
 const editable=!!await db.prepare("SELECT 1 FROM operators WHERE id=? AND status='active' AND setup_owner=1").bind(actor).first();
 return {rules:row?JSON.parse(row) as OwnershipRules:defaults,editable};
}
function affected(company:OwnershipRules['company']){
 return `SELECT c.id AS record_id,c.name AS record_name,c.company_id,c.updated_at,co.owner_id,COALESCE(co.revision,0) AS company_revision,x.owner_id AS previous_owner_id,COALESCE(x.revision,0) AS revision
  FROM contacts c LEFT JOIN record_ownership x ON x.record_type='contact' AND x.record_id=c.id
  LEFT JOIN record_ownership co ON co.record_type='company' AND co.record_id=c.company_id
  WHERE c.company_id IS NOT NULL AND x.owner_id IS NOT co.owner_id AND ${company==='off'?'0':company==='always'?'1':'x.owner_id IS NULL AND co.owner_id IS NOT NULL'}
  AND (co.owner_id IS NULL OR EXISTS(SELECT 1 FROM operators o WHERE o.id=co.owner_id AND o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=o.id))) ORDER BY c.id`;
}
async function state(db:D1Database,rules:OwnershipRules){
 const current=await db.prepare('SELECT value FROM runtime_controls WHERE name=?').bind(key).first<string>('value');
 const rows=(await db.prepare(affected(rules.company)).all<any>()).results;return {current,rows};
}
export async function previewOwnershipRules(db:D1Database,actor:string,rules:OwnershipRules){
 await owner(db,actor);const snapshot=await state(db,rules),id=createId();
 // Store no customer names or before images in the single-use preview capability.
 await db.prepare('INSERT INTO runtime_controls(name,value) VALUES(?,?)').bind(`ownership_rules_preview:${id}`,JSON.stringify({actor,rules,fingerprint:await hash(snapshot)})).run();
 const operators=(await db.prepare('SELECT id,display_name FROM operators').all<{id:string;display_name:string}>()).results;
 const names=new Map(operators.map(row=>[row.id,row.display_name]));
 return {id,rules,changes:snapshot.rows.map(row=>({recordId:row.record_id,name:row.record_name,previousOwner:names.get(row.previous_owner_id)??'Unassigned',newOwner:names.get(row.owner_id)??'Unassigned'}))};
}
export async function applyOwnershipRules(db:D1Database,actor:string,id:string){
 await owner(db,actor);const previewKey=`ownership_rules_preview:${id}`,value=await db.prepare('SELECT value FROM runtime_controls WHERE name=?').bind(previewKey).first<string>('value');
 if(!value)throw new RecordError(409,'Review the assignment rules again.');
 const preview=JSON.parse(value) as {actor:string;rules:OwnershipRules;fingerprint:string};if(preview.actor!==actor)throw new RecordError(403,'This preview belongs to another operator.');
 const snapshot=await state(db,preview.rules);if(await hash(snapshot)!==preview.fingerprint)throw new RecordError(409,'Owners changed. Review the affected records again.');
 const guard=createId(),selection=affected(preview.rules.company);
 try{await db.batch([
  db.prepare(`INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND setup_owner=1 AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id))
   AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) AND (SELECT value FROM runtime_controls WHERE name=?) IS ?
   AND (SELECT json_group_array(json_object('record_id',record_id,'record_name',record_name,'company_id',company_id,'updated_at',updated_at,'owner_id',owner_id,'company_revision',company_revision,'previous_owner_id',previous_owner_id,'revision',revision)) FROM (${selection}))=?
   AND EXISTS(SELECT 1 FROM runtime_controls WHERE name=? AND value=?) THEN 1 ELSE 0 END)`).bind(guard,actor,key,snapshot.current,JSON.stringify(snapshot.rows),previewKey,value),
  db.prepare('INSERT INTO runtime_controls(name,value) VALUES(?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(preview.rules)),
  ...automaticOwnership(db,'contact',selection,[],actor,'Company-to-contact owner rule'),
  audit(db,actor,'ownership.rules.changed','workspace','workspace',{previous:snapshot.current?JSON.parse(snapshot.current):defaults,current:preview.rules}),
  db.prepare('DELETE FROM runtime_controls WHERE name=?').bind(previewKey),db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(guard)
 ]);}catch(error){if(/access_write_guards|CHECK constraint failed/.test(String(error)))throw new RecordError(409,'Owners or authority changed. Review the rules again.');throw error;}
 return ownershipRules(db,actor);
}
