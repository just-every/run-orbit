import { audit, RecordError } from '../records/shared';
/** OUT-018 defaults: 4 messages a minute on the shared transport for each declared user (`seed.json → limits.operators`), and 1,000 one-to-one messages per user per rolling day. They stay estimated until the load journey is measured. */
export const declaredUsers=25,perUserPerMinute=4,defaultSharedPerMinute=declaredUsers*perUserPerMinute,defaultOneToOnePerDay=1000,defaultSequencePerDay=500;
export const sharedLimitSql=`COALESCE((SELECT value FROM sending_limits WHERE id='shared'),${defaultSharedPerMinute})`;
/** The one-to-one budget of the sender named by a SQL expression (a column or a bound parameter). */
export const oneToOneLimitSql=(operator:string)=>`COALESCE((SELECT value FROM sending_limits WHERE id='one-to-one:'||${operator}),${defaultOneToOnePerDay})`;
const windows=(now:Date)=>({minute:new Date(now.getTime()-60000).toISOString(),day:new Date(now.getTime()-86400000).toISOString()});
async function freedAt(db:D1Database,where:string,binds:unknown[],over:number,period:number){
 const row=await db.prepare(`SELECT claimed_at FROM outbound_delivery_budget WHERE ${where} ORDER BY claimed_at LIMIT 1 OFFSET ?`).bind(...binds,over).first<{claimed_at:string}>();
 return row?Date.parse(row.claimed_at)+period:0;
}
/** Which limit holds this sender's next message, in words, and when it may be sent; null when none is reached. */
export async function deferral(db:D1Database,operatorId:string,now=new Date()){
 const {minute,day}=windows(now);
 const row=(await db.prepare(`SELECT ${sharedLimitSql} AS shared,${oneToOneLimitSql('?1')} AS budget,(SELECT COUNT(*) FROM outbound_delivery_budget WHERE claimed_at>?2) AS sharedUsed,(SELECT COUNT(*) FROM outbound_delivery_budget WHERE operator_id=?1 AND claimed_at>?3) AS budgetUsed`).bind(operatorId,minute,day).first<{shared:number;budget:number;sharedUsed:number;budgetUsed:number}>())!;
 const limits:string[]=[];let retry=now.getTime();
 if(row.budgetUsed>=row.budget){limits.push(`this sender's one-to-one budget of ${row.budget} messages a rolling day`);retry=Math.max(retry,await freedAt(db,'operator_id=? AND claimed_at>?',[operatorId,day],row.budgetUsed-row.budget,86400000));}
 if(row.sharedUsed>=row.shared){limits.push(`the shared sending rate of ${row.shared} messages a minute`);retry=Math.max(retry,await freedAt(db,'claimed_at>?',[minute],row.sharedUsed-row.shared,60000));}
 return limits.length?{failure:`Sending limit reached: ${limits.join(' and ')}. Review and retry after the displayed time.`,retryAt:new Date(retry).toISOString()}:null;
}
async function requireOwner(db:D1Database,actor:string){
 if(!await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(actor).first())throw new RecordError(403,'Only the installation owner changes sending limits until TEAM-005 adds the administrator role.');
}
/** Budgets used and remaining: the owner sees every active user; anyone else sees their own. */
export async function sendingCapacity(db:D1Database,actor:string,now=new Date()){
 const {minute,day}=windows(now),owner=Boolean(await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(actor).first());
 const shared=(await db.prepare(`SELECT ${sharedLimitSql} AS perMinute,EXISTS(SELECT 1 FROM sending_limits WHERE id='shared') AS overridden,(SELECT COUNT(*) FROM outbound_delivery_budget WHERE claimed_at>?) AS used`).bind(minute).first<{perMinute:number;overridden:number;used:number}>())!;
 const users=(await db.prepare(`SELECT o.id,o.display_name AS name,${oneToOneLimitSql('o.id')} AS budget,EXISTS(SELECT 1 FROM sending_limits WHERE id='one-to-one:'||o.id) AS overridden,(SELECT COUNT(*) FROM outbound_delivery_budget m WHERE m.operator_id=o.id AND m.claimed_at>?) AS used FROM operators o WHERE o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id) AND (?=1 OR o.id=?) ORDER BY o.display_name,o.id`).bind(day,owner?1:0,actor).all<{id:string;name:string;budget:number;overridden:number;used:number}>()).results;
 return {owner,status:'estimated-until-load-tested',declaredUsers,perUserPerMinute,shared:{...shared,overridden:Boolean(shared.overridden),default:defaultSharedPerMinute},sequencePerDay:defaultSequencePerDay,
  users:users.map(user=>({...user,overridden:Boolean(user.overridden),remaining:Math.max(0,user.budget-user.used),default:defaultOneToOnePerDay}))};
}
export async function setSharedRate(db:D1Database,actor:string,perMinute:number|null){
 await requireOwner(db,actor);const now=new Date().toISOString(),previous=await db.prepare(`SELECT ${sharedLimitSql} AS value`).first<number>('value');
 await db.batch([perMinute===null?db.prepare("DELETE FROM sending_limits WHERE id='shared'"):db.prepare("INSERT INTO sending_limits VALUES('shared',?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at").bind(perMinute,actor,now),
  audit(db,actor,'sending.shared_rate.changed','workspace','workspace',{previous,current:perMinute??defaultSharedPerMinute})]);
 return {perMinute:perMinute??defaultSharedPerMinute};
}
export async function setOneToOneBudget(db:D1Database,actor:string,operatorId:string,perDay:number|null){
 await requireOwner(db,actor);
 if(!await db.prepare("SELECT 1 FROM operators WHERE id=? AND status='active'").bind(operatorId).first())throw new RecordError(404,'Active user not found.');
 const ceiling=(await db.prepare(`SELECT ${sharedLimitSql} AS value`).first<number>('value'))!*1440;
 if(perDay!==null&&perDay>ceiling)throw new RecordError(400,`A one-to-one budget can be raised up to the shared transport's ${ceiling} messages a day.`);
 const now=new Date().toISOString(),previous=await db.prepare(`SELECT ${oneToOneLimitSql('?')} AS value`).bind(operatorId).first<number>('value');
 await db.batch([perDay===null?db.prepare('DELETE FROM sending_limits WHERE id=?').bind(`one-to-one:${operatorId}`):db.prepare('INSERT INTO sending_limits VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at').bind(`one-to-one:${operatorId}`,perDay,actor,now),
  audit(db,actor,'sending.budget.changed','operator',operatorId,{budget:'one-to-one',previous,current:perDay??defaultOneToOnePerDay})]);
 return {oneToOnePerDay:perDay??defaultOneToOnePerDay};
}
