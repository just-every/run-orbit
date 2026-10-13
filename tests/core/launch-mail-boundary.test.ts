import assert from 'node:assert/strict';
import {test} from 'node:test';
import {setTimeout as delay} from 'node:timers/promises';
import {isolatedDatabase} from '../support/isolated-database';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';
import {signRelayBody} from '../../src/base/sendgrid-event-relay/crypto';

test('BASE-ACCESS-003 SIGNAL-009 a real pending signed body spends only the next minute quota after verification',async context=>{
 const fixture=await isolatedDatabase();
 let controller:ReadableStreamDefaultController<Uint8Array>|undefined,pending:Promise<Response>|undefined;
 let closed=false,settled=false,failed=false,deadlineTimer:ReturnType<typeof setTimeout>|undefined,releasePull:(()=>void)|undefined;
 try{
  const db=fixture.db,secret=crypto.randomUUID()+crypto.randomUUID(),app=createMailEventRoutes(db,{relaySecret:secret});
  const body=new TextEncoder().encode('[]'),signedAt=Date.now(),timestamp=String(Math.floor(signedAt/1000));
  const signature=await signRelayBody(secret,timestamp,body);
  let consumed!:()=>void;
  const firstChunkConsumed=new Promise<void>(resolve=>{consumed=resolve;});
  const bodyHeld=new Promise<void>(resolve=>{releasePull=resolve;});
  let expire!:(reason:Error)=>void;
  const expired=new Promise<never>((_resolve,reject)=>{expire=reject;});
  const bounded=<T>(operation:Promise<T>)=>Promise.race([operation,expired]);
  let startedAt=0,startedMonotonic=0,deadline=0;
  let pulls=0;
  const stream=new ReadableStream<Uint8Array>({
   start(value){controller=value;},
   pull(value){
    if(pulls++===0){
     startedAt=Date.now();startedMonotonic=performance.now();deadline=startedMonotonic+65000;
     if(deadlineTimer)clearTimeout(deadlineTimer);
     deadlineTimer=setTimeout(()=>expire(new Error('Real minute boundary exceeded its 65-second monotonic deadline')),65000);
     value.enqueue(body.slice(0,1));
    }else{consumed();return bodyHeld;}
   },
  },{highWaterMark:0});
  const request=new Request('https://orbit.test/relay',{
   method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':signature},body:stream,duplex:'half',
  } as RequestInit & {duplex:'half'});
  // Start at the current phase. Never wait for a favourable signing/start window.
  deadlineTimer=setTimeout(()=>expire(new Error('The actual route did not read its body within five seconds')),5000);
  pending=Promise.resolve(app.request(request));
  void pending.then(()=>{settled=true;},()=>{settled=true;});
  await bounded(firstChunkConsumed);
  const minute=Math.floor(startedAt/60000);
  assert.equal(settled,false,'The actual route is waiting for the remaining signed body bytes');
  await bounded(db.prepare('INSERT INTO public_rate_limits VALUES(?,?,?)').bind(`signed-mail:${minute}`,600,startedAt+120000).run());
  while(Math.floor(Date.now()/60000)===minute){
   assert.ok(performance.now()<deadline,'Only one bounded actual transition is permitted');
   assert.equal(settled,false,'An incomplete signed body cannot spend quota or finish');
   await bounded(delay(Math.min(100,Math.max(1,(minute+1)*60000-Date.now()))));
  }
  assert.equal(Math.floor(Date.now()/60000),minute+1,'A skipped real minute is a failure, never a reason to reschedule');
  assert.equal(settled,false,'The request remains pending across the real boundary until its final bytes arrive');
  const before=await bounded(db.prepare("SELECT sum(count) total FROM public_rate_limits WHERE bucket LIKE 'signed-mail:%'").first<{total:number}>());
  assert.equal(before!.total,600,'No signed quota is consumed before the body closes');
  const releasedAt=Date.now();
  assert.equal(Math.floor(releasedAt/60000),minute+1);
  assert.ok(releasedAt-Number(timestamp)*1000<300000,'The authentic original timestamp is still inside the real verification window');
  assert.equal(settled,false);
  controller!.enqueue(body.slice(1));controller!.close();closed=true;releasePull!();
  const response=await bounded(pending),completedAt=Date.now();
  assert.ok(performance.now()<deadline,'Verification must finish within the original monotonic deadline');
  assert.equal(Math.floor(completedAt/60000),minute+1);
  assert.equal(response.status,200,'Verification after body completion uses the new minute despite the exhausted old bucket');
  const old=await bounded(db.prepare('SELECT count FROM public_rate_limits WHERE bucket=?').bind(`signed-mail:${minute}`).first<{count:number}>());
  const next=await bounded(db.prepare('SELECT count FROM public_rate_limits WHERE bucket=?').bind(`signed-mail:${minute+1}`).first<{count:number}>());
  const totals=await bounded(db.prepare("SELECT sum(count) total,count(*) buckets FROM public_rate_limits WHERE bucket LIKE 'signed-mail:%'").first<{total:number;buckets:number}>());
  assert.equal(old!.count,600);assert.equal(next!.count,1);assert.equal(totals!.total,601);assert.equal(totals!.buckets,2);
  context.diagnostic(JSON.stringify({signedAt,startedAt,releasedAt,completedAt,minute,nextMinute:minute+1,elapsedMs:Math.round(performance.now()-startedMonotonic),oldCount:old!.count,newCount:next!.count,total:totals!.total}));
 }catch(error){failed=true;throw error;}finally{
  if(deadlineTimer)clearTimeout(deadlineTimer);
  if(controller&&!closed)controller.error(new Error('Boundary test is disposing its incomplete body'));
  releasePull?.();
  const cleanupErrors:unknown[]=[];
  async function cleanup(operation:Promise<unknown>){
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{await Promise.race([operation,new Promise<never>((_resolve,reject)=>{
    timer=setTimeout(()=>reject(new Error('Boundary test cleanup exceeded five seconds')),5000);
   })]);}catch(error){cleanupErrors.push(error);}finally{if(timer)clearTimeout(timer);}
  }
  // Observe a late route rejection and always dispose D1, even if the route stalls.
  if(pending)await cleanup(pending.then(()=>undefined,()=>undefined));
  await cleanup(fixture.dispose());
  if(cleanupErrors.length){
   context.diagnostic(JSON.stringify({cleanupFailures:cleanupErrors.length,originalFailureRetained:failed}));
   if(!failed)throw new AggregateError(cleanupErrors,'Boundary test cleanup failed');
  }
 }
});
