import type {MiddlewareHandler} from 'hono';
import type {AuthenticatedOperator} from '../identity';
import {AccessService} from './service';
import {isFullOperator} from './identity-class';
import {legacyDatabase} from './legacy-database';
import {RecordsRepository} from '../records/repository';
import {AccessError,deny,check} from './errors';
import {revisionGuard} from './mutations';
import {createRecordsRoutes} from '../records/routes';
import type {ActorContext} from '../../shared/expansion-contracts';
import {collaboratorMentions,createCollaboratorNotificationRoutes} from '../notifications/collaborator';
export const nativeEditableFields={contact:['name','email','phone','job_title','timezone','company_id','contactability','custom_fields'],company:['name','primary_domain','custom_fields'],opportunity:['title','stage_id','owner_id','company_id','value_cents','expected_close_at','contact_ids','primary_contact_id','custom_fields']} as const;
export async function restrictedEdit(db:D1Database,c:ActorContext,kind:keyof typeof nativeEditableFields,id:string,raw:unknown){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))deny('Provide a record field object.');const patch=raw as Record<string,unknown>;if(Object.keys(patch).some(key=>!(nativeEditableFields[kind] as readonly string[]).includes(key)))deny('This record field cannot be edited.');if(patch.contactability!==undefined&&patch.contactability!=='do_not_contact')deny('Collaborators cannot clear do-not-contact.');
 if(patch.custom_fields&&typeof patch.custom_fields==='object'&&Object.hasOwn(patch.custom_fields,'import_source'))deny('The import record cannot be edited here.');
 if(patch.custom_fields!==undefined&&(!patch.custom_fields||typeof patch.custom_fields!=='object'||Array.isArray(patch.custom_fields)||Object.values(patch.custom_fields).some(value=>value!==null&&typeof value==='object')))deny('Custom fields must be flat scalar values.');
 const fields=Object.keys(patch).flatMap(key=>key==='custom_fields'?Object.keys(patch[key] as object).map(field=>`custom_fields_json.${field}`):[key]);
 const access=new AccessService(db);await access.authorize(c,'graph.update',{...c,type:kind,id},fields);const row=await db.prepare('SELECT revision FROM graph_records WHERE id=? AND workspace_id=? AND kind=?').bind(id,c.workspaceId,kind).first<{revision:number}>();if(!row)deny('Record is unavailable.');
 const related: {kind:'company'|'contact';id:string}[]=[];
 if(typeof patch.company_id==='string')related.push({kind:'company',id:patch.company_id});
 if(patch.contact_ids!==undefined){check(Array.isArray(patch.contact_ids)&&patch.contact_ids.every(id=>typeof id==='string'),'Choose related contact identities.');for(const id of patch.contact_ids as string[])related.push({kind:'contact',id});}
 if(typeof patch.primary_contact_id==='string')related.push({kind:'contact',id:patch.primary_contact_id});
 const relatedFences=[];for(const ref of related){await access.authorize(c,'graph.read',{...c,type:ref.kind,id:ref.id},[]);const current=await db.prepare('SELECT revision FROM graph_records WHERE workspace_id=? AND kind=? AND id=? AND retired_into_id IS NULL').bind(c.workspaceId,ref.kind,ref.id).first<{revision:number}>();if(!current)deny('Related record is unavailable.');relatedFences.push(...revisionGuard('graph_records',ref.id,c.workspaceId,current.revision,ref.kind));}
 const table={contact:'contacts',company:'companies',opportunity:'opportunities'}[kind],current=await db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first<Record<string,any>>();if(!current)deny('Record is unavailable.');const merged:Record<string,unknown>={...Object.fromEntries(nativeEditableFields[kind].filter(key=>key in current).map(key=>[key,current[key]])),...patch,custom_fields:{...JSON.parse(current.custom_fields_json),...(patch.custom_fields??{}) as object}};
 if(kind==='opportunity'){const related=(await db.prepare('SELECT contact_id,is_primary FROM opportunity_contacts WHERE opportunity_id=?').bind(id).all<{contact_id:string;is_primary:number}>()).results;merged.contact_ids??=related.map(r=>r.contact_id);merged.primary_contact_id??=related.find(r=>r.is_primary)?.contact_id??null;}
 const plan=await new RecordsRepository(db).prepareSave(kind,merged,c.principal.kind==='operator'?c.principal.operatorId:'',id,{ordinaryEdit:true});
 await db.batch([...access.fence(c),...revisionGuard('graph_records',id,c.workspaceId,row.revision,kind),...relatedFences].map(s=>db.prepare(s.sql).bind(...s.bindings)).concat(plan.statements));return{id:plan.id};
}
/** Every native API has a class boundary. Restricted reads use the same fenced native repositories. */
export function collaboratorNativeBoundary(db:D1Database):MiddlewareHandler<{Variables:{operator:AuthenticatedOperator}}>{return async(c,next)=>{
 const operator=c.get('operator');if(await isFullOperator(db,operator.operatorId)){await next();return;}
 try{const path=c.req.path;
  // RECORD-017: a collaborator reads only their own mention notifications about records shared with them with entries now.
  // The scoped reads require an active membership and a live grant, so someone who has not accepted an invitation reads none.
  if(path==='/api/v1/notifications'||path.startsWith('/api/v1/notifications/')||(path==='/api/v1/records/mentions'&&c.req.method==='GET')){
   if(path==='/api/v1/records/mentions')return c.json({mentions:await collaboratorMentions(db,operator.operatorId)});
   const {Hono}=await import('hono');const scoped=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),url=new URL(c.req.url);url.pathname=url.pathname.slice('/api/v1/notifications'.length)||'/';scoped.use('*',async(ctx,next)=>{ctx.set('operator',operator);await next();});scoped.route('/',createCollaboratorNotificationRoutes(db));return scoped.fetch(new Request(url,c.req.raw));
  }
  const access=new AccessService(db),actor=await access.authorizeLegacy(operator,crypto.randomUUID(),['GET','HEAD'].includes(c.req.method)?'legacy.read':'legacy.write');
  if(!path.startsWith('/api/v1/records/')||path.includes('/archive')||path.startsWith('/api/v1/records/mention'))deny('This native operation requires a full operator.');
  const edit=/^\/api\/v1\/records\/(contact|company|opportunity)\/([0-9A-HJKMNP-TV-Z]{26})$/.exec(path);
  if(c.req.method==='PUT'&&edit)return c.json(await restrictedEdit(db,actor,edit[1] as keyof typeof nativeEditableFields,edit[2],await c.req.json()));
  if(!['GET','HEAD'].includes(c.req.method))deny('Only explicitly permitted record edits are available to collaborators.');
  const child=createRecordsRoutes(legacyDatabase(db,actor)),url=new URL(c.req.url);url.pathname=url.pathname.slice('/api/v1/records'.length)||'/';
  const {Hono}=await import('hono');const scoped=new Hono<{Variables:{operator:AuthenticatedOperator}}>();scoped.use('*',async(ctx,next)=>{ctx.set('operator',operator);await next();});scoped.route('/',child);return scoped.fetch(new Request(url,c.req.raw));
 }catch(error){if(error instanceof AccessError)return c.json({error:error.message},error.status);throw error;}
};}
