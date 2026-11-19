import {Hono} from 'hono';
import {createD1DevelopmentOutbox} from '../../../base/modules/mail/src/development/index.mjs';

/** The demo's captured customer mail, newest first. It exists only while the demo is the mail provider. */
export function demoOutboxRoutes(database:D1Database,demo:boolean){
 const app=new Hono();
 app.get('/',async context=>{
  if(!demo)return context.json({error:'The demo outbox exists only in the demo.'},404);
  const captured=await createD1DevelopmentOutbox({db:database}).list();
  return context.json({messages:captured.map(({id,createdAt,message})=>({id,createdAt:new Date(createdAt).toISOString(),to:message.to,subject:message.subject,body:message.text??''}))});
 });
 return app;
}
