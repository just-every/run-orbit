import {audit,RecordError} from '../records/shared';
import {salesAdmin} from '../teams/policy';
import {defaultOneToOnePerDay,defaultSequencePerDay,sharedLimitSql} from './sending-limits';
export type SendingBudgetKind='one-to-one'|'sequence';
/** An explicit team budget applies per member; overlapping explicit caps use the lowest. */
export const teamBudgetSql=(operator:string,kind:SendingBudgetKind='one-to-one')=>`(SELECT min(l.value) FROM sending_limits l JOIN sales_team_members tm ON l.id='team:${kind}:'||tm.team_id JOIN sales_teams t ON t.id=tm.team_id AND t.active=1 WHERE tm.operator_id=${operator})`;
export const effectiveBudgetSql=(operator:string,kind:SendingBudgetKind='one-to-one')=>`(WITH budget_sender AS (SELECT ${operator} AS operator_id) SELECT COALESCE(min(l.value),${kind==='sequence'?defaultSequencePerDay:defaultOneToOnePerDay}) FROM budget_sender JOIN sending_limits l ON l.id='${kind}:'||budget_sender.operator_id OR EXISTS(SELECT 1 FROM sales_team_members tm JOIN sales_teams t ON t.id=tm.team_id AND t.active=1 WHERE tm.operator_id=budget_sender.operator_id AND l.id='team:${kind}:'||tm.team_id))`;

export async function teamCapacity(db:D1Database,actor:string,admin:boolean){
 return (await db.prepare(`SELECT t.id,t.name,COALESCE((SELECT value FROM sending_limits WHERE id='team:one-to-one:'||t.id),?) AS budget,EXISTS(SELECT 1 FROM sending_limits WHERE id='team:one-to-one:'||t.id) AS overridden,COALESCE((SELECT value FROM sending_limits WHERE id='team:sequence:'||t.id),?) AS sequenceBudget,EXISTS(SELECT 1 FROM sending_limits WHERE id='team:sequence:'||t.id) AS sequenceOverridden FROM sales_teams t WHERE t.active=1 AND (?=1 OR EXISTS(SELECT 1 FROM sales_team_members tm WHERE tm.team_id=t.id AND tm.operator_id=?)) ORDER BY t.name,t.id`).bind(defaultOneToOnePerDay,defaultSequencePerDay,Number(admin),actor).all<{id:string;name:string;budget:number;overridden:number;sequenceBudget:number;sequenceOverridden:number}>()).results.map(team=>({...team,overridden:!!team.overridden,sequenceOverridden:!!team.sequenceOverridden}));
}
export async function setTeamBudget(db:D1Database,actor:string,teamId:string,perDay:number|null,kind:SendingBudgetKind='one-to-one'){
 if(!await salesAdmin(db,actor))throw new RecordError(403,'Only sales administrators change sending limits.');
 if(!await db.prepare('SELECT 1 FROM sales_teams WHERE id=? AND active=1').bind(teamId).first())throw new RecordError(404,'Active sales team not found.');
 const ceiling=(await db.prepare(`SELECT ${sharedLimitSql} AS value`).first<number>('value'))!*1440;
 if(perDay!==null&&(!Number.isInteger(perDay)||perDay<1||perDay>ceiling))throw new RecordError(400,`Choose a budget from 1 to the shared transport's ${ceiling} messages a day.`);
 const key=`team:${kind}:${teamId}`,fallback=kind==='sequence'?defaultSequencePerDay:defaultOneToOnePerDay,previous=await db.prepare('SELECT value FROM sending_limits WHERE id=?').bind(key).first<number>('value'),at=new Date().toISOString();
 await db.batch([perDay===null?db.prepare('DELETE FROM sending_limits WHERE id=?').bind(key):db.prepare('INSERT INTO sending_limits VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at').bind(key,perDay,actor,at),audit(db,actor,'sending.team_budget.changed','sales_team',teamId,{budget:kind,previous:previous??fallback,current:perDay??fallback,reset:perDay===null})]);
 return {kind,perDay:perDay??fallback};
}
