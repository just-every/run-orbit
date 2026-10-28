import {Hono} from 'hono';
import type {AuthenticatedOperator} from '../identity';
import {createNotificationRoutes} from '../notifications/routes';
import {salesCanRead} from './record-access';
import {readsEntries} from '../access/grant-entries';
async function target(db:D1Database,key:string,opportunityId:string|null):Promise<{kind:string;id:string;source?:string;entry?:string}[]>{
 const mention=/^mention:(entry|task|handoff):(.+)$/.exec(key);
 if(mention){const [,source,entry]=mention;if(source==='entry')return(await db.prepare('SELECT record_type AS kind,record_id AS id FROM timeline_entry_records WHERE timeline_entry_id=?').bind(entry).all<{kind:string;id:string}>()).results.map(row=>({...row,source,entry}));
 const table=source==='task'?'sales_tasks':'handoff_tasks',query=source==='task'?"SELECT record_type AS kind,COALESCE(contact_id,company_id,opportunity_id) AS id FROM sales_tasks WHERE id=?":"SELECT 'opportunity' AS kind,opportunity_id AS id FROM handoff_tasks WHERE id=?";const row=await db.prepare(query).bind(entry).first<{kind:string;id:string}>();return row?[{...row,source,entry}]:[];}
 if(key.startsWith('ownership:'))return(await db.prepare('SELECT b.record_type AS kind,i.record_id AS id FROM ownership_batches b JOIN ownership_batch_items i ON i.batch_id=b.id WHERE b.id=? AND i.applied=1 AND i.undone=0').bind(key.slice(10)).all<{kind:string;id:string}>()).results;
 return opportunityId?[{kind:'opportunity',id:opportunityId}]:[];
}
export function salesNotificationRoutes(db:D1Database){const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),original=createNotificationRoutes(db);
 app.all('*',async c=>{const actor=c.get('operator'),mounted=new Hono<{Variables:{operator:AuthenticatedOperator}}>();mounted.use('*',async(ctx,next)=>{ctx.set('operator',actor);await next();});mounted.route('/',original);const url=new URL(c.req.url);url.pathname=url.pathname.slice('/api/v1/notifications'.length)||'/';
 if(c.req.method!=='GET')return mounted.fetch(new Request(url,c.req.raw));
 const response=await mounted.fetch(new Request(url,c.req.raw));if(!response.ok)return response;const body=await response.json() as {notifications:{id:string;readAt:string|null}[]},visible=[];
 for(const notice of body.notifications){const row=await db.prepare('SELECT event_key,opportunity_id FROM notifications WHERE id=? AND operator_id=?').bind(notice.id,actor.operatorId).first<{event_key:string;opportunity_id:string|null}>();if(!row)continue;const refs=await target(db,row.event_key,row.opportunity_id);if(!refs.length)continue;let allowed=true;
 for(const ref of refs){if(!await salesCanRead(db,actor.operatorId,ref.kind,ref.id,ref.source?['notes']:[])){allowed=false;break;}if(ref.source){if(!await readsEntries(db,actor.operatorId,ref.kind,ref.id)||await db.prepare('SELECT 1 FROM entry_privacy WHERE source=? AND entry_id=? AND author_id<>?').bind(ref.source,ref.entry,actor.operatorId).first()){allowed=false;break;}}}
 if(allowed)visible.push(notice);
 }
 return c.json({notifications:visible,unread:visible.filter(notice=>!notice.readAt).length});
 });return app;}
