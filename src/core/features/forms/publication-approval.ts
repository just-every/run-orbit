import {check} from '../access/errors';
import {sha256} from '../access/mutations';
import {captureAuthorizationSchema,type PublicationApproval} from './definition';
import type {Publication} from './service';
import type {SqlStatement} from '../../shared/expansion-contracts';

export async function requiresCaptureAuthorization(db:D1Database,operation:Publication){
 if(operation.state==='withdrawn')return true;
 return !await db.prepare(`SELECT 1 FROM access_form_authorities a JOIN operators o ON o.id=a.custodian_id
  WHERE a.id=? AND a.form_id=? AND a.form_revision=? AND a.artifact_hash=? AND a.revoked_at IS NULL
  AND a.expires_at>? AND o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=o.id)`)
  .bind(operation.authority_id,operation.form_id,operation.form_revision,operation.artifact_hash,new Date().toISOString()).first();
}

/** Restore carries reviewed content, never the authority to capture new visitors. */
export async function publicationApprovalStatements(db:D1Database,operation:Publication,actor:string,reviewed:PublicationApproval):Promise<SqlStatement[]>{
 const renewal=await requiresCaptureAuthorization(db,operation);
 check(['compiled','withdrawn','approved'].includes(operation.state)||(operation.state==='published'&&renewal),'Review a compiled or withdrawn publication before approval.');
 check(operation.artifact_hash===reviewed.artifactHash&&operation.form_revision===reviewed.formRevision,'Review this exact compiled artifact and form revision.');
 const artifact=await db.prepare("SELECT body_json FROM content_entities WHERE id=? AND kind='artifact'").bind(operation.artifact_id).first<{body_json:string}>(),html=artifact&&JSON.parse(artifact.body_json).html;
 check(typeof html==='string'&&await sha256(html)===operation.artifact_hash,'Artifact bytes changed.');
 check(!renewal||reviewed.capture,'Choose a new contact limit and future expiry to authorize this publication again.');
 const capture=reviewed.capture?captureAuthorizationSchema.parse(reviewed.capture):undefined;
 if(capture)check(Date.parse(capture.expiresAt)>Date.now(),'Choose a future expiry for the new capture authorization.');
 const authorityId=capture?crypto.randomUUID():operation.authority_id,guard=crypto.randomUUID(),at=new Date().toISOString();
 const statements:SqlStatement[]=[{
  sql:`INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM publication_operations p JOIN content_entities f ON f.id=p.form_id
   WHERE p.id=? AND p.state=? AND p.authority_id=? AND p.artifact_hash=? AND p.form_revision=? AND f.revision=p.form_revision)
   ${capture?'':"AND EXISTS(SELECT 1 FROM access_form_authorities WHERE id=? AND revoked_at IS NULL AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))"} THEN 1 ELSE 0 END)`,
  bindings:[guard,operation.id,operation.state,operation.authority_id,reviewed.artifactHash,reviewed.formRevision,...(capture?[]:[authorityId])]
 },{sql:'DELETE FROM access_write_guards WHERE id=?',bindings:[guard]}];
 if(capture)statements.push(
  {sql:'UPDATE access_form_authorities SET revoked_at=? WHERE id=?',bindings:[at,operation.authority_id]},
  {sql:'INSERT INTO access_form_authorities VALUES(?,?,?,?,?,?,0,?,NULL)',bindings:[authorityId,operation.form_id,operation.form_revision,actor,operation.artifact_hash,capture.maxRecords,capture.expiresAt]}
 );
 statements.push({sql:"UPDATE publication_operations SET state='approved',authority_id=?,approved_by=?,approved_at=?,published_at=NULL,receipt_json=NULL WHERE id=?",bindings:[authorityId,actor,at,operation.id]});
 return statements;
}
