import { contactEmailKey } from '../records/identity';
import type { SignalEvent } from './contracts';
import type { SignalTarget } from './linking-repository';

/** A prepared association is valid only while its record and identity still exist. */
export function linkTargetFence(db:D1Database,event:SignalEvent,targets:SignalTarget[],reviewed:boolean){
 const tables={contact:'contacts',company:'companies',opportunity:'opportunities'};
 const statements=targets.map(target=>db.prepare(`INSERT INTO runtime_controls(name,value)
   SELECT 'signal_link_target',NULL WHERE NOT EXISTS(SELECT 1 FROM ${tables[target.type]} WHERE id=?)`).bind(target.id));
 // Explicit IDs and human review define their own association. Automatic email
 // links must still uniquely identify the prepared contact when the batch runs.
 if(!reviewed&&!event.record&&event.email){
  const key=contactEmailKey(event.email);
  for(const target of targets.filter(target=>target.type==='contact'))statements.push(db.prepare(`
   WITH matches AS (SELECT id FROM contacts WHERE email_key=? UNION
     SELECT survivor_id AS id FROM record_aliases WHERE record_type='contact' AND identity_key=?)
   INSERT INTO runtime_controls(name,value) SELECT 'signal_link_identity',NULL
   WHERE (SELECT count(*) FROM matches)<>1 OR NOT EXISTS(SELECT 1 FROM matches WHERE id=?)`).bind(key,key,target.id));
 }
 return statements;
}
