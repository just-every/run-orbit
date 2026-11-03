import {sha256} from '../access/mutations';

/** Bind acceptance to the queue the person actually saw, including a changed due date. */
export const queueReviewSql="json_object('state',o.queue_state,'reason',o.queue_reason,'dueAt',o.next_due_at,'lifecycle',o.lifecycle,'updatedAt',o.updated_at)";
export interface QueueReview {state:string;reason:string|null;dueAt:string|null;lifecycle:string;updatedAt:string}
export const queueRevision=(proposalId:string,review:QueueReview)=>sha256(JSON.stringify({proposalId,...review}));
export async function readQueueReview(db:D1Database,id:string){
 const row=await db.prepare(`SELECT ${queueReviewSql} AS review FROM opportunities o WHERE o.id=?`).bind(id).first<{review:string}>();
 return row?JSON.parse(row.review) as QueueReview:null;
}
