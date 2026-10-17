import {RecordError} from '../records/shared';
import {openTaskInventory} from '../tasks';

type OwnedRow=Record<string,string|number|null>&{id:string;name:string|null;email?:string|null;updated_at:string;owner_revision:number};
const digest=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');

/** Keep the complete native rows in the review digest and commit fence. A timestamp alone
 * cannot distinguish two edits in the same millisecond or an owner changed and restored. */
export async function removalInventory(db:D1Database,id:string){
 const operator=await db.prepare('SELECT id,display_name,status,setup_owner,updated_at FROM operators WHERE id=?').bind(id).first<{id:string;display_name:string;status:string;setup_owner:number;updated_at:string}>();
 if(!operator)throw new RecordError(404,'Operator not found.');
 const [opportunities,contacts,companies,tasks,handoffs,messages]=await Promise.all([
  db.prepare("SELECT * FROM opportunities WHERE owner_id=? AND lifecycle='open' ORDER BY id").bind(id).all<OwnedRow&{title:string}>(),
  db.prepare('SELECT * FROM contacts WHERE owner_id=? ORDER BY id').bind(id).all<OwnedRow>(),
  db.prepare('SELECT * FROM companies WHERE owner_id=? ORDER BY id').bind(id).all<OwnedRow>(),
  openTaskInventory(db,id),
  db.prepare("SELECT id,title,revision,opportunity_id FROM handoff_tasks WHERE assignee_id=? AND status='open' ORDER BY id").bind(id).all<{id:string;title:string;revision:string;opportunity_id:string}>(),
  db.prepare("SELECT id,subject FROM outbound_messages WHERE operator_id=? AND state='scheduled' ORDER BY id").bind(id).all<{id:string;subject:string}>()
 ]);
 const inventory={operator,opportunities:opportunities.results,contacts:contacts.results,companies:companies.results,tasks,handoffs:handoffs.results,scheduledMessages:messages.results};
 return {...inventory,review:await digest(inventory)};
}

export async function removalReview(db:D1Database,id:string){
 const inventory=await removalInventory(db,id);
 const record=(row:OwnedRow)=>({id:row.id,name:row.name,email:row.email??null,updated_at:row.updated_at,owner_revision:row.owner_revision});
 return {...inventory,contacts:inventory.contacts.map(record),companies:inventory.companies.map(record),opportunities:inventory.opportunities.map(row=>({id:row.id,title:row.title,updated_at:row.updated_at}))};
}
