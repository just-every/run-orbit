import {Hono} from 'hono';
import type {AppEnvironment} from '../../shared/expansion-contracts';
import {AccessService} from '../access/service';
import {GraphRecords} from '../graph/repository';
import {domainEventStatements} from '../effects/event-statements';
import {salesProfile} from './policy';
import {deny} from '../access/errors';
const cell=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;
/** A filtered data export is separate from an installation archive. */
export function salesExportRoutes(db:D1Database){const app=new Hono<AppEnvironment>(),access=new AccessService(db),graph=new GraphRecords(db,access,domainEventStatements);
 app.get('/',async c=>{const actor=c.get('actor'),id=actor.principal.kind==='operator'?actor.principal.operatorId:'',profile=await salesProfile(db,id);if(profile&&!profile.permissions.includes('export'))deny('Export permission is required.');
 const kind=c.req.query('kind')??'contact';if(!['contact','company','opportunity'].includes(kind))deny('Choose a supported record type.');let cursor:string|undefined;const records:Record<string,unknown>[]=[];
 do{const page=await graph.scanRecords(actor,{types:[kind],query:'',fields:[],filters:{},limit:1000,...(cursor?{cursor}:{})});records.push(...page.items.map(record=>({id:record.ref.id,...record.fields})));cursor=page.nextCursor??undefined;}while(cursor);
 const columns=[...new Set(records.flatMap(row=>Object.keys(row)))],csv=[columns.map(cell).join(','),...records.map(row=>columns.map(name=>cell(row[name])).join(','))].join('\r\n');return new Response(csv,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':`attachment; filename="${kind}.csv"`,'cache-control':'no-store'}});
 });return app;}
