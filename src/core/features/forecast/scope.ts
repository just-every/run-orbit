import {NativeAnalyticsSources} from '../analytics/native-sources';
import type {ActorContext,DependencyRef} from '../../shared/expansion-contracts';
import {AccessError} from '../access/errors';
import {GraphRecords} from '../graph/repository';
import {salesAdmin,salesProfile,teamIds} from '../teams/policy';
import {isFullOperator} from '../access/identity-class';
import {domainEventStatements} from '../effects/event-statements';
import type {AccessService} from '../access/service';
import type {ForecastState,NativeForecastDeal} from './types';

/** Every forecast door projects its original input through the viewer's current graph access. */
export async function scopeForecast(db:D1Database,access:AccessService,c:ActorContext,state:ForecastState,historical=false):Promise<ForecastState>{
 const id=c.principal.kind==='operator'?c.principal.operatorId:'',profile=await salesProfile(db,id),admin=await salesAdmin(db,id),full=await isFullOperator(db,id);
 const graph=new GraphRecords(db,access,domainEventStatements),visible=new Map<string,Record<string,unknown>>(),refs=new Map<string,DependencyRef>();let cursor:string|undefined;
 do{const page=await graph.scanRecords(c,{types:['opportunity'],query:'',fields:[],filters:{},limit:1000,...(cursor?{cursor}:{})});if(page.incomplete)throw new AccessError('prerequisite','The forecast deal population is incomplete.');for(const row of page.items){visible.set(row.ref.id,row.fields);refs.set(row.ref.id,row.ref);}cursor=page.nextCursor??undefined;}while(cursor);
 const deals=state.deals.filter(deal=>typeof visible.get(deal.id)?.value_cents==='number').map(deal=>Object.fromEntries(Object.entries(deal).filter(([field])=>field==='id'||Object.hasOwn(visible.get(deal.id)!,field))) as unknown as NativeForecastDeal);
 const allowedDeals=new Set(deals.map(deal=>deal.id)),owned=new Set(deals.map(deal=>deal.owner_id));
 const memberships=await teamIds(db,id),allTeams=(await db.prepare('SELECT id,name FROM sales_teams WHERE active=1 ORDER BY name,id').all<{id:string;name:string}>()).results;
 const teams=allTeams.filter(team=>full||admin||profile?.scope==='all'||profile?.scope==='team'&&memberships.includes(team.id));
 const members=(await db.prepare("SELECT m.team_id,m.operator_id FROM sales_team_members m JOIN sales_teams t ON t.id=m.team_id AND t.active=1 JOIN operators o ON o.id=m.operator_id AND o.status='active'").all<{team_id:string;operator_id:string}>()).results;
 const repScope=new Set(full||admin||profile?.scope==='all'?state.operators.map(person=>person.id):profile?.scope==='team'?members.filter(member=>memberships.includes(member.team_id)).map(member=>member.operator_id):[id]);
 const amounts=full||admin||profile?.fields.some(field=>field==='amounts'||field==='*');
 const quotas=state.quotas.filter(quota=>amounts&&(quota.teamId?teams.some(team=>team.id===quota.teamId):repScope.has(quota.operatorId)));
 const notes=full||admin||profile?.fields.some(field=>field==='notes'||field==='*'),reviewed=<T extends {reason:string}>(row:T):T=>{if(notes)return row;const {reason,...visible}=row;return visible as T;};
 const measuredTeams=historical?(state.teams??[]).filter(team=>teams.some(current=>current.id===team.id)):teams.map(team=>({...team,operatorIds:members.filter(member=>member.team_id===team.id).map(member=>member.operator_id)}));
 const proofs=await new NativeAnalyticsSources(access).traceStatements(c,deals.map(deal=>({ref:refs.get(deal.id)!,fields:Object.keys(deal)})),'current');access.addDependencyFences(c,proofs,'forecast-records');
 return {...state,limited:!full,stageRules:state.stageRules.map(reviewed),canManage:admin,canOverride:admin||Boolean(profile?.role!=='read-only'&&profile?.permissions.includes('forecast.override')),teams:measuredTeams,deals,operators:state.operators.filter(person=>repScope.has(person.id)||owned.has(person.id)),dealInputs:state.dealInputs.filter(input=>allowedDeals.has(input.dealId)).map(reviewed),quotas:quotas.map(reviewed),reviewHistory:state.reviewHistory.filter(review=>review.kind==='stage'||review.kind==='deal'&&allowedDeals.has(review.subjectId)||review.kind==='quota'&&quotas.some(quota=>quota.id===review.id)).filter(()=>notes)};
}
