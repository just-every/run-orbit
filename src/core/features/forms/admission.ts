import {AccessError} from '../access/errors';
import {embedOrigin} from './embedding';
/** The workspace embed allowlist is also the authority for direct browser intake. */
export async function admittedFormOrigin(db:D1Database,request:Request){
 const origin=request.headers.get('Origin'),local=new URL(request.url).origin;
 if(origin===local)return {origin,external:false,hostname:new URL(origin).hostname};
 if(!origin||!embedOrigin.safeParse(origin).success||!await db.prepare('SELECT 1 FROM form_embed_origins WHERE origin=?').bind(origin).first())throw new AccessError('permission','Request origin is not allowed.');
 return {origin,external:true,hostname:new URL(origin).hostname};
}
export function formOriginFence(db:D1Database,origin:string){
 const guard=crypto.randomUUID();return [db.prepare('INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM form_embed_origins WHERE origin=?) THEN 1 ELSE 0 END)').bind(guard,origin),db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(guard)];
}
