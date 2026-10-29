import {Hono} from 'hono';
import type {AuthenticatedOperator} from '../identity';
import {customerSignalSql} from '../signals/test-events';

/** How many items wait for a person on Review, by kind: counts only, read from the same rows Review lists. */
export interface ReviewSummary {proposals:number;events:number;replies:number;calls:number}

export async function reviewSummary(db:D1Database,operatorId:string):Promise<ReviewSummary>{
 const count=(sql:string,...values:unknown[])=>db.prepare(sql).bind(...values).first<{n:number}>().then(row=>row?.n??0);
 const [proposals,events,replies,calls]=await Promise.all([
  // Changes Orbit found in captured mail and meetings (Proposed changes).
  count("SELECT count(*) AS n FROM capture_proposals p JOIN signals s ON s.id=p.signal_id WHERE p.status='pending'"),
  // Customer events no record matched (Events without a record).
  count(`SELECT count(*) AS n FROM unlinked_signals u JOIN signals s ON s.id=u.signal_id WHERE u.resolved_at IS NULL AND ${customerSignalSql()}`),
  // Replies that arrived without their thread (Replies without a thread).
  count('SELECT count(*) AS n FROM unlinked_replies WHERE opportunity_id IS NULL'),
  // Calls from numbers no contact has, for the installation owner while calling is connected (Calls without a contact).
  count("SELECT count(*) AS n FROM call_events e WHERE EXISTS(SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active') AND EXISTS(SELECT 1 FROM call_credentials WHERE id=1) AND e.contact_id IS NULL AND NOT EXISTS(SELECT 1 FROM call_events newer WHERE newer.account_sid=e.account_sid AND newer.call_sid=e.call_sid AND newer.sequence>e.sequence)",operatorId),
 ]);
 return {proposals,events,replies,calls};
}

export function createReviewRoutes(db:D1Database){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.get('/summary',async c=>c.json(await reviewSummary(db,c.get('operator').operatorId)));
 return app;
}
