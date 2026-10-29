import {Hono} from 'hono';
import {AccessService} from '../../access/service';
import type {AuthenticatedOperator} from '../../identity';
import type {SourceSecurity} from '../../../platform/source-security';
import {CaptureError} from '../contracts';
import {formatAddress,mailboxConfig} from './address';
import {createForwardAddress,forwardSource,forwardStatus} from './source';
import {MAX_FORWARDED_BYTES,receiveForwarded} from './receive';

export function createForwardRoutes(db:D1Database,config:{security?:SourceSecurity;address?:string;local?:boolean}){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),mailbox=mailboxConfig(config.address);
 app.onError((error,c)=>{
  const message=error instanceof CaptureError?error.message:'The Orbit address could not be created.';
  return (c.req.header('accept')??'').includes('text/html')?c.redirect(`/app/settings/capture/connect/address?error=${encodeURIComponent(message)}`,303):c.json({error:message},error instanceof CaptureError?error.status:500);
 });
 app.get('/',async c=>c.json({...await forwardStatus(db,config.security,mailbox),local:Boolean(config.local)}));
 app.post('/',async c=>{
  const form=!(c.req.header('content-type')??'').includes('application/json');
  if(!config.security)throw new CaptureError(503,'An Orbit address needs ORBIT_ENCRYPTION_KEY.');
  if(!mailbox)throw new CaptureError(503,'This Orbit has no mail address yet. Set CAPTURE_MAIL_ADDRESS and deploy again.');
  const operator=c.get('operator'),access=new AccessService(db),actor=await access.authorizeLegacy(operator,crypto.randomUUID(),'legacy.write');
  const address=await createForwardAddress(db,config.security,mailbox,operator.operatorId,access.fence(actor).map(statement=>db.prepare(statement.sql).bind(...statement.bindings)));
  return form?c.redirect('/app/settings/capture/connect/address?created=1',303):c.json({address},201);
 });
 // On this computer no mail server can reach Orbit. A saved message goes through
 // the same receiving code as delivered mail, addressed to this installation's address.
 app.post('/try',async c=>{
  if(!config.local)throw new CaptureError(404,'Not found.');
  if(!config.security||!mailbox)throw new CaptureError(503,'This Orbit has no mail address yet.');
  const live=await forwardSource(db,config.security);if(!live)throw new CaptureError(409,'Create your Orbit address first.');
  const file=(await c.req.formData()).get('message');
  if(!file||typeof file==='string'||!file.size)throw new CaptureError(400,'Choose a saved email (.eml) file.');
  if(file.size>MAX_FORWARDED_BYTES)throw new CaptureError(413,'That message is larger than 10 MB.');
  const outcome=await receiveForwarded(db,config.security,mailbox,{recipients:[formatAddress(mailbox,live.credential.tag)],raw:new TextDecoder('utf-8').decode(await file.arrayBuffer())});
  return c.json(outcome);
 });
 return app;
}
