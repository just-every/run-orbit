import {Hono} from 'hono';
import {AccessService} from '../../access/service';
import type {AuthenticatedOperator} from '../../identity';
import type {SourceSecurity} from '../../../platform/source-security';
import {CaptureError} from '../contracts';
import type {FeedFetch} from './feed';
import {connectCalendarLink,syncCalendarLink} from './source';

export function createCalendarLinkRoutes(db:D1Database,config:{security?:SourceSecurity;fetcher?:FeedFetch}){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),fetcher=config.fetcher??fetch;
 const security=()=>{if(!config.security)throw new CaptureError(503,'Calendar links need ORBIT_ENCRYPTION_KEY.');return config.security;};
 app.onError((error,c)=>{
  const message=error instanceof CaptureError?error.message:'The calendar could not be added.';
  return (c.req.header('accept')??'').includes('text/html')?c.redirect(`/app/settings/capture/connect/calendar?error=${encodeURIComponent(message)}`,303):c.json({error:message},error instanceof CaptureError?error.status:500);
 });
 app.post('/',async c=>{
  const form=!(c.req.header('content-type')??'').includes('application/json');
  const input=form?Object.fromEntries(await c.req.formData()):await c.req.json();
  const operator=c.get('operator'),access=new AccessService(db),actor=await access.authorizeLegacy(operator,crypto.randomUUID(),'legacy.write');
  const id=await connectCalendarLink(db,security(),fetcher,input,operator.operatorId,access.fence(actor).map(statement=>db.prepare(statement.sql).bind(...statement.bindings)));
  // Read the calendar now, so the page shows what it found; a slow calendar finishes on the next refresh.
  const {more,...summary}=await syncCalendarLink(db,id,security(),fetcher).catch(()=>({more:true,captured:0,skipped:0,proposals:0}));
  return form?c.redirect(`/app/settings/capture?connected=${encodeURIComponent(id)}`,303):c.json({id,summary,more},201);
 });
 return app;
}

export function syncLinkedCalendar(db:D1Database,id:string,security:SourceSecurity|undefined,fetcher:FeedFetch=fetch){
 if(!security)throw new CaptureError(503,'Calendar links need ORBIT_ENCRYPTION_KEY.');
 return syncCalendarLink(db,id,security,fetcher);
}
