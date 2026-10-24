import {canonicalJson,sha256} from '../../../modules/import-kit/d1/index';
import type {AuthenticatedOperator} from '../identity';
import {audit,mutationJob} from '../records/shared';
import {captureAccess} from './mail-rule';
import {CaptureError} from './contracts';

interface RecordLink{record_type:'contact'|'company'|'opportunity';record_id:string}
interface Association{source_id:string;payload_json:string}
async function association(db:D1Database,id:string){
 const row=await db.prepare("SELECT s.source_id,t.payload_json FROM signals s JOIN capture_items i ON i.signal_id=s.id AND i.kind='message' JOIN timeline_entries t ON t.id=s.id WHERE s.id=? AND json_extract(t.payload_json,'$.associationRule') IS NOT NULL").bind(id).first<Association>();
 if(!row)throw new CaptureError(404,'An automatic captured mail association was not found.');
 return row;
}
async function correctionAccess(db:D1Database,operator:AuthenticatedOperator,write=false){
 const fences=await captureAccess(db,operator,write),predicate="EXISTS(SELECT 1 FROM access_memberships WHERE operator_id=? AND workspace_id='workspace' AND status='active' AND role='legacy_operator')";
 if(!await db.prepare('SELECT 1 WHERE '+predicate).bind(operator.operatorId).first())throw new CaptureError(403,'Deal corrections require a full operator with workspace access.');
 return [...fences,db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'capture_correction_access',NULL WHERE NOT ("+predicate+")").bind(operator.operatorId)];
}
async function records(db:D1Database,id:string){return (await db.prepare('SELECT record_type,record_id FROM signal_links WHERE signal_id=? ORDER BY record_type,record_id').bind(id).all<RecordLink>()).results;}
const choiceQuery="SELECT id,title,lifecycle,updated_at FROM opportunities ORDER BY title,id";
const correctionQuery="SELECT id FROM timeline_entries WHERE kind='capture.association_corrected' AND json_extract(payload_json,'$.signalId')=? ORDER BY id";
async function review(db:D1Database,id:string){
 const [original,linked,available,history]=await Promise.all([association(db,id),records(db,id),db.prepare(choiceQuery).all<{id:string;title:string;lifecycle:string;updated_at:string}>(),db.prepare(correctionQuery).bind(id).all<{id:string}>()]);
 const revision=sha256(canonicalJson({original,linked,choices:available.results,history:history.results}));
 return {original,linked,available:available.results,history:history.results,revision};
}
export async function readDealLinks(db:D1Database,id:string,operator:AuthenticatedOperator){
 const fences=await correctionAccess(db,operator);await db.batch(fences);
 // Capture currently admits only full operators, who can read and change all
 // native deals. Restricted roles remain denied at captureAccess.
 const snapshot=await review(db,id),currentIds=new Set(snapshot.linked.filter(row=>row.record_type==='opportunity').map(row=>row.record_id));
 await db.batch(await correctionAccess(db,operator));
 return {rule:JSON.parse(snapshot.original.payload_json).associationRule as string,revision:snapshot.revision,current:snapshot.available.filter(row=>currentIds.has(row.id)).map(({id,title})=>({id,title})),choices:snapshot.available.map(({id,title,lifecycle})=>({id,title,lifecycle}))};
}
async function replay(db:D1Database,id:string,operator:string,requestId:string,opportunityId:string|null,revision:string){
 const previous=await db.prepare("SELECT payload_json FROM timeline_entries WHERE id=? AND kind='capture.association_corrected'").bind(`capture-correction:${operator}:${requestId}`).first<{payload_json:string}>();
 if(!previous)return false;
 const payload=JSON.parse(previous.payload_json);
 if(payload.opportunityId!==opportunityId||payload.signalId!==id||payload.reviewedRevision!==revision)throw new CaptureError(409,'This correction identity was already used for another action.');
 return true;
}
/** Replace only deal associations in one native action; the captured signal and original remain byte-for-byte intact. */
export async function correctDealLinks(db:D1Database,id:string,operator:AuthenticatedOperator,opportunityId:string|null,requestId:string,revision:string){
 const fences=await correctionAccess(db,operator,true);await db.batch(fences);
 if(await replay(db,id,operator.operatorId,requestId,opportunityId,revision))return {saved:true,replayed:true};
 const snapshotReview=await review(db,id);if(snapshotReview.revision!==revision)throw new CaptureError(409,'This association or deal review changed. Reload before correcting it.');
 const {original,linked}=snapshotReview,contacts=linked.filter(row=>row.record_type==='contact').map(row=>row.record_id),current=linked.filter(row=>row.record_type==='opportunity').map(row=>row.record_id);
 if(!contacts.length)throw new CaptureError(409,'The contact for this evidence is no longer available.');
 if(opportunityId&&!snapshotReview.available.some(deal=>deal.id===opportunityId))throw new CaptureError(403,'Choose a deal you can view and change.');
 const changed=!((opportunityId===null&&!current.length)||(current.length===1&&current[0]===opportunityId));
 const at=new Date().toISOString(),actor=operator.operatorId,trace=`capture-correction:${actor}:${requestId}`,next=opportunityId?[opportunityId]:[],contactCompany=linked.filter(row=>row.record_type!=='opportunity');
 const snapshot=JSON.stringify(linked),statements=[...fences,
  db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'capture_correction_current',NULL WHERE NOT EXISTS(SELECT 1 FROM capture_items i JOIN timeline_entries t ON t.id=i.signal_id WHERE i.signal_id=? AND i.kind='message' AND t.payload_json=?) OR (SELECT json_group_array(json_object('record_type',record_type,'record_id',record_id)) FROM (SELECT record_type,record_id FROM signal_links WHERE signal_id=? ORDER BY record_type,record_id))<>?").bind(id,original.payload_json,id,snapshot),
  db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'capture_correction_choices',NULL WHERE (SELECT json_group_array(json_array(id,title,lifecycle,updated_at)) FROM ("+choiceQuery+"))<>?").bind(JSON.stringify(snapshotReview.available.map(row=>[row.id,row.title,row.lifecycle,row.updated_at]))),
  db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'capture_correction_revision',NULL WHERE (SELECT json_group_array(id) FROM ("+correctionQuery+"))<>?").bind(id,JSON.stringify(snapshotReview.history.map(row=>row.id))),
  ...(changed?[db.prepare("DELETE FROM signal_links WHERE signal_id=? AND record_type='opportunity'").bind(id),
  db.prepare("DELETE FROM timeline_entry_records WHERE timeline_entry_id=? AND record_type='opportunity'").bind(id),
  ...next.flatMap(deal=>[db.prepare("INSERT INTO signal_links(signal_id,record_type,record_id,linking_basis,linked_at) VALUES(?,'opportunity',?,'Operator corrected captured mail association',?)").bind(id,deal,at),db.prepare("INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) VALUES(?,'opportunity',?)").bind(id,deal)])]:[]),
  db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,'capture.association_corrected',?,?,'operator',?,?,?)").bind(trace,at,at,actor,original.source_id,JSON.stringify({signalId:id,previousOpportunityIds:current,opportunityId,contactIds:contacts,requestId,reviewedRevision:revision,associationRule:JSON.parse(original.payload_json).associationRule})),
  ...contactCompany.map(row=>db.prepare('INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) VALUES(?,?,?)').bind(trace,row.record_type,row.record_id)),
  ...[...new Set([...current,...next])].flatMap(deal=>[db.prepare("INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) VALUES(?,'opportunity',?)").bind(trace,deal),...(changed?[mutationJob(db,deal,actor,'Captured mail association corrected')]:[])]),
  audit(db,actor,'capture.association_corrected','contact',contacts[0]!,{signalId:id,contactIds:contacts,previousOpportunityIds:current,opportunityId})];
 try{await db.batch(statements);}
 catch(error){if(await replay(db,id,actor,requestId,opportunityId,revision))return {saved:true,replayed:true};if(/constraint failed/i.test(String(error)))throw new CaptureError(409,'This association or workspace access changed. Reload before correcting it.');throw error;}
 return {saved:true,replayed:false};
}
