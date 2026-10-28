import {salesEntryAuthority} from './entry-authority';
import {salesWorkbenchAllowed} from './workbench-authority';
import {salesMutationResponse} from './mutation-routes';
import {salesReadResponse} from './read-routes';
import {salesNotificationRoutes} from './notifications';
import type {MiddlewareHandler} from 'hono';
import {Hono} from 'hono';
import type {AuthenticatedOperator} from '../identity';
import {salesProfile,salesAdmin} from './policy';
import {AccessService} from '../access/service';
import {legacyDatabase} from '../access/legacy-database';
import {restrictedEdit} from '../access/native-boundary';
import {createRecordsRoutes} from '../records/routes';
import {AccessError} from '../access/errors';
/** A native sales role has its own boundary; an assigned record is never a workspace credential. */
export function salesNativeBoundary(db:D1Database):MiddlewareHandler<{Variables:{operator:AuthenticatedOperator}}>{return async(c,next)=>{
 const actor=c.get('operator'),profile=await salesProfile(db,actor.operatorId);if(!profile){await next();return;}
 try{
  const path=c.req.path,read=['GET','HEAD'].includes(c.req.method),admin=await salesAdmin(db,actor.operatorId);
  if(['/api/v1/assistance/preview','/api/v1/assistance/generate'].includes(path)){await next();return;}
  if(path.startsWith('/api/v1/settings/teams')||path.startsWith('/api/v1/settings/slack')||path.startsWith('/api/v1/library')||path.startsWith('/api/v1/settings/sending')){await next();return;}
  const owner=await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(actor.operatorId).first();if(owner){await next();return;}
  if(await salesEntryAuthority(db,actor.operatorId,path)){await next();return;}
  if(await salesWorkbenchAllowed(db,actor,c.req.raw)){await next();return;}
  const scopedRead=await salesReadResponse(db,actor,c.req.raw);if(scopedRead)return scopedRead;
  if(admin&&(path.startsWith('/api/v1/settings')||path.startsWith('/api/v1/setup')||path.startsWith('/api/v1/workspace'))){await next();return;}
  if(path.startsWith('/api/v1/settings')||path.startsWith('/api/v1/setup')||path.startsWith('/api/v1/workspace'))return c.json({error:'Sales administration permission is required.'},403);
  if(admin&&profile.scope==='all'&&profile.fields.includes('*')&&profile.permissions.includes('source.connect')&&(path.startsWith('/api/v1/sources')||path.startsWith('/api/v1/capture'))){await next();return;}
  if(path.startsWith('/api/v1/records/archive/')){const permission=path.startsWith('/api/v1/records/archive/imports')?'import':'export';if(admin&&profile.scope==='all'&&profile.fields.includes('*')&&profile.permissions.includes(permission)){await next();return;}return c.json({error:'Installation archives require the corresponding permission and full sales administration access.'},403);}
  if(admin&&profile.scope==='all'&&profile.fields.includes('*')&&profile.permissions.includes('import')&&path.startsWith('/api/v1/imports')){await next();return;}
  const mutation=await salesMutationResponse(db,actor,c.req.raw);if(mutation)return mutation;
  if(path.startsWith('/api/v1/sources')||path.startsWith('/api/v1/capture')||path.startsWith('/api/v1/imports'))return c.json({error:'This source or import operation requires sales administration.'},403);
  if(path.startsWith('/api/v1/records/')){
   if(path.includes('/archive'))return c.json({error:'Installation archives require sales administration. Use the permitted-record export.'},403);
   const access=new AccessService(db),scope=await access.originalWorkspace(),context=await access.resolveOperatorContext(actor,scope.workspaceId,crypto.randomUUID());
   const match=/^\/api\/v1\/records\/(contact|company|opportunity)\/([0-9A-HJKMNP-TV-Z]{26})$/.exec(path);
   if(c.req.method==='PUT'&&match)return c.json(await restrictedEdit(db,context,match[1] as 'contact'|'company'|'opportunity',match[2],await c.req.json()));
   if(!read)return c.json({error:'Use a permitted record action.'},403);
   const child=createRecordsRoutes(legacyDatabase(db,context),{ownership:false}),url=new URL(c.req.url);url.pathname=url.pathname.slice('/api/v1/records'.length)||'/';
   const mounted=new Hono<{Variables:{operator:AuthenticatedOperator}}>();mounted.use('*',async(ctx,run)=>{ctx.set('operator',actor);await run();});mounted.route('/',child);return mounted.fetch(new Request(url,c.req.raw));
  }
  if(path.startsWith('/api/v1/notifications')){const mounted=new Hono<{Variables:{operator:AuthenticatedOperator}}>();mounted.use('*',async(ctx,run)=>{ctx.set('operator',actor);await run();});mounted.route('/',salesNotificationRoutes(db));return mounted.fetch(c.req.raw);}
  return c.json({error:'Your sales role does not permit this workspace operation.'},403);
 }catch(error){if(error instanceof AccessError)return c.json({error:error.message},error.status);throw error;}
};}
