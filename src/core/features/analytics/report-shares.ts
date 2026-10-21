import {z} from 'zod';
import type {ActorContext,SqlStatement} from '../../shared/expansion-contracts';
import {AccessError} from '../access/errors';
import type {OperationsStore} from '../operations/store';

/** REPORT-001 sharing: a report is private, shared with named operators, or workspace-wide. Sharing decides who may
 * open the report; it never grants record access, because every viewer's own access computes what they see.
 * Until TEAM-005, the installation owner administers every report's sharing. */
export type Audience='private'|'operators'|'workspace';
export interface ReportShare{audience:Audience;ownerId:string|null;operatorIds:string[];revision:number;stored:boolean}
export const shareInput=z.object({audience:z.enum(['private','operators','workspace']),operatorIds:z.array(z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/)).max(200),revision:z.number().int().min(0)}).strict();
const operatorOf=(c:ActorContext)=>c.principal.kind==='operator'?c.principal.operatorId:'';
/** SQL: the report `definition` (an expression) is visible to operator `?`. A report without a share row keeps workspace visibility. */
export const visibleSql=(definition:string)=>`(NOT EXISTS(SELECT 1 FROM analytics_report_shares s WHERE s.workspace_id=?1 AND s.definition_id=${definition}) OR EXISTS(SELECT 1 FROM analytics_report_shares s WHERE s.workspace_id=?1 AND s.definition_id=${definition} AND (s.audience='workspace' OR s.owner_id=?2 OR (s.audience='operators' AND EXISTS(SELECT 1 FROM json_each(s.operators_json) named WHERE named.value=?2)) OR EXISTS(SELECT 1 FROM operators admin WHERE admin.id=?2 AND admin.setup_owner=1 AND admin.status='active'))))`;
export class ReportShares{
 constructor(readonly store:OperationsStore){}
 async read(c:ActorContext,id:string):Promise<ReportShare>{
  const row=await this.store.db.prepare('SELECT owner_id,audience,operators_json,revision FROM analytics_report_shares WHERE workspace_id=? AND definition_id=?').bind(c.workspaceId,id).first<{owner_id:string|null;audience:Audience;operators_json:string;revision:number}>();
  return row?{audience:row.audience,ownerId:row.owner_id,operatorIds:JSON.parse(row.operators_json),revision:row.revision,stored:true}:{audience:'workspace',ownerId:null,operatorIds:[],revision:0,stored:false};
 }
 private async administrator(operatorId:string){return Boolean(await this.store.db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(operatorId).first());}
 async canManage(c:ActorContext,share:ReportShare){const operator=operatorOf(c);return Boolean(operator)&&(share.ownerId===operator||await this.administrator(operator));}
 /** Refuse a report this viewer may not open, and fence the answer into the same batch as the read. */
 async assertVisible(c:ActorContext,id:string):Promise<SqlStatement[]>{
  const operator=operatorOf(c),visible=await this.store.db.prepare(`SELECT ${visibleSql('?3')} AS visible`).bind(c.workspaceId,operator,id).first<{visible:number}>();
  if(!visible?.visible)throw new AccessError('permission','This report is not shared with you.');
  return this.fence(c,id);
 }
 fence(c:ActorContext,id:string):SqlStatement[]{const guard=crypto.randomUUID();return [{sql:`INSERT INTO access_write_guards VALUES(?4,CASE WHEN ${visibleSql('?3')} THEN 1 ELSE 0 END)`,bindings:[c.workspaceId,operatorOf(c),id,guard]},{sql:'DELETE FROM access_write_guards WHERE id=?',bindings:[guard]}];}
 /** Active members of this workspace, full operators or collaborators, whom a manager may name. */
 async members(c:ActorContext){return (await this.store.db.prepare("SELECT o.id,o.display_name AS name,o.email,EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=o.id) AS collaborator FROM operators o JOIN access_memberships m ON m.operator_id=o.id WHERE m.workspace_id=? AND m.status='active' AND o.status='active' ORDER BY o.display_name,o.id").bind(c.workspaceId).all<{id:string;name:string;email:string;collaborator:number}>()).results;}
 /** Sharing as its viewer sees it: who may open the report, and the members to name for those who manage it. */
 async describe(c:ActorContext,id:string){const share=await this.read(c,id),canManage=await this.canManage(c,share);return {...share,canManage,members:canManage?await this.members(c):[]};}
 /** Named sharing lists active members of this workspace, full operators or collaborators. */
 async named(c:ActorContext,audience:Audience,operatorIds:string[]){
  const named=audience==='operators'?[...new Set(operatorIds)]:[];
  if(audience==='operators'&&!named.length)throw new AccessError('validation','Choose at least one operator to share with.');
  const active=named.length?(await this.store.db.prepare("SELECT o.id FROM operators o JOIN access_memberships m ON m.operator_id=o.id WHERE m.workspace_id=? AND m.status='active' AND o.status='active' AND o.id IN(SELECT value FROM json_each(?))").bind(c.workspaceId,JSON.stringify(named)).all<{id:string}>()).results.map(row=>row.id):[];
  if(active.length!==named.length)throw new AccessError('validation','Share only with active operators of this workspace.');
  return named;
 }
 /** New reports record their author as owner; later versions keep the existing sharing. */
 createStatements(c:ActorContext,id:string,audience:Audience='workspace',operatorIds:string[]=[]):SqlStatement[]{return [{sql:'INSERT INTO analytics_report_shares(workspace_id,definition_id,owner_id,audience,operators_json,revision,updated_by,updated_at) VALUES(?,?,?,?,?,1,?,?) ON CONFLICT(workspace_id,definition_id) DO NOTHING',bindings:[c.workspaceId,id,operatorOf(c)||null,audience,JSON.stringify(operatorIds),operatorOf(c)||null,new Date().toISOString()]}];}
 async update(c:ActorContext,id:string,input:z.infer<typeof shareInput>){
  const share=await this.read(c,id);if(!await this.canManage(c,share))throw new AccessError('permission','Only the report owner or the installation owner changes its sharing.');
  if(input.revision!==share.revision)throw new AccessError('conflict','Sharing changed since you opened it. Reload before saving.');
  const named=await this.named(c,input.audience,input.operatorIds);
  const now=new Date().toISOString(),statements:SqlStatement[]=share.stored?[...this.store.guard('EXISTS(SELECT 1 FROM analytics_report_shares WHERE workspace_id=? AND definition_id=? AND revision=?)',[c.workspaceId,id,share.revision]),{sql:'UPDATE analytics_report_shares SET audience=?,operators_json=?,revision=revision+1,updated_by=?,updated_at=? WHERE workspace_id=? AND definition_id=?',bindings:[input.audience,JSON.stringify(named),operatorOf(c),now,c.workspaceId,id]}]:[...this.store.guard('NOT EXISTS(SELECT 1 FROM analytics_report_shares WHERE workspace_id=? AND definition_id=?)',[c.workspaceId,id]),{sql:'INSERT INTO analytics_report_shares(workspace_id,definition_id,owner_id,audience,operators_json,revision,updated_by,updated_at) VALUES(?,?,NULL,?,?,1,?,?)',bindings:[c.workspaceId,id,input.audience,JSON.stringify(named),operatorOf(c),now]}];
  await this.store.commit(c,'analytics.share',id,share.revision+1,[...this.store.guard('EXISTS(SELECT 1 FROM analytics_definitions WHERE workspace_id=? AND id=?)',[c.workspaceId,id]),...statements],{audience:input.audience,operators:named.length});
  return this.read(c,id);
 }
}
