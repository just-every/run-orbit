import assert from 'node:assert/strict';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import type {launchFixture} from './launch-fixture';

/** The record editor and its permission control can save the same contact together. */
export async function partialSaveRace(f:Awaited<ReturnType<typeof launchFixture>>){
 const session=await createDependencies(f.db).auth.createSession(f.actor);
 for(const timing of ['read','batch'] as const)for(const stopping of [false,true]){
  const customer=await f.customer(),path=`records/contact/${customer.contactId}`;
  await f.request(path,'PATCH',{changes:{'custom:Seats':''},base:{}});
  const edit={changes:{'custom:Seats':'25'},base:{'custom:Seats':''}},stop={changes:{contactability:'do_not_contact'},base:{contactability:'contactable'}};
  let armed=false,intervened=false,interveningCopy:unknown;
  async function intervene(){
   if(intervened)return;
   intervened=true;
   const response=await f.request(path,'PATCH',stopping?edit:stop);
   assert.equal(response.status,200,await response.clone().text());
   interveningCopy=await(await f.request(path)).json();
  }
  const raced=new Proxy(f.db,{get(target,key){
   if(key==='prepare')return(sql:string)=>{
    const statement=target.prepare(sql);
    if(sql!=='SELECT * FROM contacts WHERE id=?')return statement;
    const wrap=(value:D1PreparedStatement):D1PreparedStatement=>new Proxy(value,{get(object,property){
     if(property==='bind')return(...values:unknown[])=>wrap(object.bind(...values));
     if(property==='first')return async()=>{const row=await object.first();armed=true;if(timing==='read')await intervene();return row;};
     const result=Reflect.get(object,property);return typeof result==='function'?result.bind(object):result;
    }});
    return wrap(statement);
   };
   if(key==='batch')return async(statements:D1PreparedStatement[])=>{if(armed&&timing==='batch')await intervene();return target.batch(statements);};
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});
  const app=createApp({database:raced,assets:{fetch:async()=>new Response(null,{status:404})}});
  const response=await app.request(`https://orbit.test/api/v1/${path}`,{method:'PATCH',headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify(stopping?stop:edit)});
  assert.equal(intervened,true);
  assert.equal(response.status,409,'A stale partial save must refuse instead of replacing the other control’s saved value');
  assert.deepEqual(await(await f.request(path)).json(),interveningCopy,'Refusal rolls back the entire stale save, including its history');
  // Autosave already rereads and retries disjoint fields on a 409.
  const retry=await f.request(path,'PATCH',stopping?stop:edit);assert.equal(retry.status,200,await retry.clone().text());
  const {record}=await(await f.request(path)).json() as any;
  assert.equal(JSON.parse(record.custom_fields_json).Seats,'25');
  assert.equal(record.contactability,'do_not_contact');
 }
}
