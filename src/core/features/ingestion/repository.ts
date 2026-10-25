import {isNativeSource,signedSourcePredicate} from './source-authority';
import { contactStopStatements } from '../records/suppression-effects';
import { weights } from '../workbench/policies';
import { createId } from '../../shared/ids';
import type { SourceSecurity } from '../../platform/source-security';
import { evaluationStatements } from '../workbench/evaluation-repository';
import { confidence, IngestionError, type SignalEvent } from './contracts';
import { resolveTarget, targetsFor, type SignalTarget } from './linking-repository';
import { mailboxStopStatements, stopsMailbox } from './stop-repository';
import { linkTargetFence } from './linking-fence';
import {isTestEvent,customerSignalSql} from '../signals/test-events';
import { stopReason } from '../outreach/stop-reason';
import {formSchema,hiddenValues} from '../forms/definition';
import {prepareReplyLink,replyEventKey,replyNotificationStatements} from '../notifications/reply-events';

interface SourceAuthority {secret_ciphertext:string|null}
export class IngestionRepository {
  constructor(readonly db:D1Database){}
  async hasEvent(source:string,event:string){return Boolean(await this.existing(source,event));}
  async recipeContacts(){return (await this.db.prepare('SELECT id,name,email FROM contacts ORDER BY created_at DESC,rowid DESC LIMIT 100').all()).results;}
  async contact(id:string){return this.db.prepare('SELECT id FROM contacts WHERE id=?').bind(id).first();}
  /** Framed embeds forward only the query parameters each reviewed form declares. */
  async publishedForms(){return (await this.db.prepare(`SELECT p.slug,p.id AS operationId,p.form_revision AS revision,f.body_json
    FROM publication_targets t JOIN publication_operations p ON p.id=t.operation_id
    JOIN content_entities f ON f.id=p.form_id JOIN access_form_authorities a ON a.id=p.authority_id
    JOIN operators o ON o.id=a.custodian_id JOIN signal_sources ss ON ss.id='form:'||p.form_id
    WHERE p.state='published' AND f.revision=p.form_revision AND ss.enabled=1 AND a.revoked_at IS NULL
      AND a.expires_at>? AND o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=o.id)
      AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))
    ORDER BY p.published_at DESC LIMIT 100`).bind(new Date().toISOString()).all<{slug:string;operationId:string;revision:number;body_json:string}>()).results.map(({body_json,...form})=>({...form,parameters:hiddenValues(formSchema.parse(JSON.parse(body_json).form)).flatMap(item=>'parameter' in item?[item.parameter]:[])}));}
  async source(id:string){return this.db.prepare('SELECT id,type,enabled,secret_ciphertext FROM signal_sources WHERE id=?').bind(id).first<{id:string;type:string;enabled:number;secret_ciphertext:string|null}>();}
  async sources(){return (await this.db.prepare('SELECT id,name,type,enabled,secret_ciphertext IS NOT NULL AS has_signing_secret,last_accepted_at,last_error,rejected_count,cursor FROM signal_sources ORDER BY name').all()).results;}
  async configure(input:{id:string;name:string;secret:string;enabled:boolean},security:SourceSecurity){
    if(isNativeSource(input.id,(await this.source(input.id))?.type))throw new IngestionError(403,'Capture and mail provider sources cannot accept signed events.');
    const now=new Date().toISOString();
    const result=await this.db.prepare(`INSERT INTO signal_sources(id,name,type,enabled,created_at,updated_at,secret_ciphertext) VALUES(?,?,'signed_webhook',?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,enabled=excluded.enabled,secret_ciphertext=excluded.secret_ciphertext,updated_at=excluded.updated_at WHERE ${signedSourcePredicate}`).bind(input.id,input.name,Number(input.enabled),now,now,await security.seal(input.secret)).run();
    if(result.meta.changes!==1)throw new IngestionError(403,'Capture and mail provider sources cannot accept signed events.');
  }
  async setEnabled(id:string,enabled:boolean,security?:SourceSecurity){
    const source=await this.source(id);if(isNativeSource(id,source?.type))throw new IngestionError(403,'Capture and mail provider sources cannot accept signed events.');if(!source)throw new IngestionError(404,'Source not found.');
    if(source.secret_ciphertext&&!security)throw new IngestionError(503,'Source security is unavailable.');
    // A fresh encryption nonce revokes in-flight requests without changing the
    // tool's signing secret or adding local authority to portable record data.
    const ciphertext=source.secret_ciphertext?await security!.seal(await security!.open(source.secret_ciphertext)):null;
    const result=await this.db.prepare(`UPDATE signal_sources SET enabled=?,secret_ciphertext=?,updated_at=? WHERE id=? AND secret_ciphertext IS ? AND ${signedSourcePredicate}`).bind(Number(enabled),ciphertext,new Date().toISOString(),id,source.secret_ciphertext).run();
    if(result.meta.changes!==1)throw new IngestionError(409,'Source changed. Reload before changing its enabled state.');
  }
  async reject(source:string,eventId:string|null,reason:string,fences:D1PreparedStatement[]=[]){const now=new Date().toISOString();await this.db.batch([...fences,this.db.prepare('UPDATE signal_sources SET last_error=?,rejected_count=rejected_count+1,updated_at=? WHERE id=?').bind(reason,now,source),this.db.prepare('INSERT INTO source_event_errors(id,source_id,source_event_id,reason,created_at) VALUES(?,?,?,?,?)').bind(createId(),source,eventId,reason,now)]);}
  private sourceFence(source:string,authority:SourceAuthority){return this.db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'source_authority_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM signal_sources WHERE id=? AND enabled=1 AND secret_ciphertext=? AND ${signedSourcePredicate})`).bind(source,authority.secret_ciphertext);}
  private async assertAuthority(source:string,authority:SourceAuthority){
    try{await this.db.batch([this.sourceFence(source,authority)]);}catch{throw new IngestionError(403,'Source authority changed; use its current signing secret.');}
  }
  private async sourceChanged(source:string,authority:SourceAuthority){const current=await this.source(source);return !current?.enabled||isNativeSource(source,current.type)||current.secret_ciphertext!==authority.secret_ciphertext;}
  async ingest(source:string,event:SignalEvent,hash:string,raw:string,authority?:SourceAuthority){
    const existing=await this.existing(source,event.eventId);
    if(existing){
      if(authority)await this.assertAuthority(source,authority);
      return this.replay(existing,hash);
    }
    const plan=await this.prepare(source,event,hash,raw);
    try{await this.db.batch([...(authority?[this.sourceFence(source,authority)]:[]),...plan.statements]);}
    catch(error){
      if(authority&&await this.sourceChanged(source,authority))throw new IngestionError(403,'Source authority changed; use its current signing secret.');
      const raced=await this.existing(source,event.eventId);if(raced){if(authority)await this.assertAuthority(source,authority);return this.replay(raced,hash);}throw error;
    }
    return {id:plan.id,linked:plan.linked};
  }
  async prepare(source:string,event:SignalEvent,hash:string,raw:string){
    const test=isTestEvent(event),target=test?null:await resolveTarget(this.db,event),id=createId(),at=new Date().toISOString();
    const targets=target?await targetsFor(this.db,target):[];
    const statements=[this.db.prepare('INSERT INTO signals(id,source_id,source_event_id,type,subject,occurred_at,received_at,payload_hash,confidence,linking_basis,created_at,payload_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,source,event.eventId,test?`${source}:test`:event.type,event.subject,event.occurredAt,at,hash,test?'inferred':confidence(event.type),test?'Source connection test':target?.basis??'Unlinked',at,raw),
      this.db.prepare('UPDATE signal_sources SET last_accepted_at=?,updated_at=? WHERE id=?').bind(at,at,source),
      ...(test?[]:await mailboxStopStatements(this.db,event,at)),
      ...await this.linkStatements(id,event,targets,source,at)];
    if(!target&&!test)statements.push(this.db.prepare('INSERT INTO unlinked_signals(signal_id,reason) VALUES(?,?)').bind(id,['page.viewed','chat.started','content.downloaded'].includes(event.type)&&!event.identityBasis?'Source visitor identity basis is missing':'No unique record match'));
    return {id,linked:Boolean(target),statements};
  }
  private async existing(source:string,eventId:string){return this.db.prepare('SELECT id,payload_hash FROM signals WHERE source_id=? AND source_event_id=?').bind(source,eventId).first<{id:string;payload_hash:string}>();}
  private replay(row:{id:string;payload_hash:string},hash:string){if(row.payload_hash!==hash)throw new IngestionError(409,'Source event identity already carries different payload.');return {id:row.id,replayed:true};}
  /** `evidence` adds what the timeline shows of a captured original (sender, date, quoted lines). */
  async linkStatements(id:string,event:SignalEvent,targets:SignalTarget[],actor:string,at:string,actorType:'source'|'operator'='source',sourceName=actor,evidence?:Record<string,unknown>){
    if(isTestEvent(event))return [];
    const statements=linkTargetFence(this.db,event,targets,actorType==='operator'),notificationEventKey=await replyEventKey(id,event);
    if(notificationEventKey)statements.push(prepareReplyLink(this.db,id,notificationEventKey));
    if(targets.length)statements.push(this.db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,'signal.recorded',?,?,?,?,?,?)").bind(id,event.occurredAt,at,actorType,actor,sourceName,JSON.stringify({signalId:id,subject:event.subject,...evidence,...(notificationEventKey?{notificationEventKey}:{})})));
    for(const target of targets){statements.push(this.db.prepare('INSERT INTO signal_links(signal_id,record_type,record_id,linking_basis,linked_at) VALUES(?,?,?,?,?)').bind(id,target.type,target.id,target.basis,at),this.db.prepare('INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) VALUES(?,?,?)').bind(id,target.type,target.id));if(target.type==='opportunity'&&(weights[event.type]??0)!==0)statements.push(...evaluationStatements(this.db,target.id,actor,'New customer evidence',new Date(at)));}
    if(event.type==='form.submitted')for(const target of targets.filter(t=>t.type==='opportunity'))statements.push(this.db.prepare("UPDATE opportunities SET queue_state='now',queue_reason=CASE WHEN queue_state='now' AND queue_reason IN ('Customer reply','Delivery problem') THEN queue_reason ELSE 'Form submitted' END,next_due_at=NULL,updated_at=? WHERE id=? AND lifecycle='open'").bind(at,target.id));
    const contacts=targets.filter(target=>target.type==='contact');
    if((['email.replied','meeting.booked'].includes(event.type)||stopsMailbox(event))&&!(stopsMailbox(event)&&event.email!==undefined))for(const contact of contacts){
      statements.push(this.db.prepare("UPDATE drafts SET is_stale=1,stale_reason=?,updated_at=? WHERE recipient_contact_id=?").bind(stopReason(event.type),at,contact.id),this.db.prepare("UPDATE outbound_messages SET state='cancelled',failure=?,updated_at=? WHERE contact_id=? AND state='scheduled'").bind(stopReason(event.type),at,contact.id));
      if(event.type==='email.unsubscribed'||event.permanentBounce)statements.push(...await contactStopStatements(this.db,contact.id));
    }
    if(['email.replied','email.bounced'].includes(event.type))for(const target of targets.filter(t=>t.type==='opportunity'))statements.push(this.db.prepare("UPDATE opportunities SET queue_state='now',queue_reason=?,next_due_at=NULL,updated_at=? WHERE id=? AND lifecycle='open'").bind(event.type==='email.replied'?'Customer reply':'Delivery problem',at,target.id));
    if(notificationEventKey)statements.push(...replyNotificationStatements(this.db,id,notificationEventKey,targets.filter(t=>t.type==='opportunity').map(t=>t.id),at,contacts.map(t=>t.id)));
    return statements;
  }
  async unlinked(){return (await this.db.prepare(`SELECT s.id,s.source_id,ss.name AS source_name,s.type,s.subject,s.occurred_at,u.reason,json_extract(s.payload_json,'$.email') AS email,json_extract(s.payload_json,'$.domain') AS domain,json_extract(s.payload_json,'$.data.name') AS name FROM unlinked_signals u JOIN signals s ON s.id=u.signal_id LEFT JOIN signal_sources ss ON ss.id=s.source_id WHERE u.resolved_at IS NULL AND ${customerSignalSql()} ORDER BY s.received_at DESC LIMIT 100`).all()).results;}
  async link(id:string,target:SignalTarget,actor:string){
    const signal=await this.db.prepare('SELECT s.payload_json,s.source_event_id,s.type,s.subject,s.occurred_at FROM signals s JOIN unlinked_signals u ON u.signal_id=s.id WHERE s.id=? AND u.resolved_at IS NULL').bind(id).first<{payload_json:string;source_event_id:string;type:string;subject:string;occurred_at:string}>();if(!signal)throw new IngestionError(409,'Signal is already linked or missing.');
    // Vendor payloads retain their original bytes; canonical event identity and
    // meaning come from the verified signal columns when an operator links one.
    const event={...JSON.parse(signal.payload_json),eventId:signal.source_event_id,type:signal.type,subject:signal.subject,occurredAt:signal.occurred_at} as SignalEvent;
    if(isTestEvent(event))throw new IngestionError(409,'Source connection tests cannot become customer evidence.');
    // Visitor data lacking a basis must not become contact history through review either.
    if(['page.viewed','chat.started','content.downloaded'].includes(event.type)&&!event.identityBasis)throw new IngestionError(409,'A source-held visitor identity basis is required.');
    const resolved=await resolveTarget(this.db,{...event,record:{type:target.type,id:target.id}});if(!resolved)throw new IngestionError(404,'Record not found.');
    const at=new Date().toISOString();await this.db.batch([...await this.linkStatements(id,event,await targetsFor(this.db,{...resolved,basis:'Operator reviewed record link'}),actor,at,'operator','operator.review'),this.db.prepare('UPDATE unlinked_signals SET resolved_at=? WHERE signal_id=?').bind(at,id)]);
  }
}
