import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
/** Real HTTPS ingress, configured through the native operator session. */
export async function signedSource({page,origin,opportunityId}) {
 const sourceId=`acceptance-${Date.now()}`;
 const configured=await page.request.put(`${origin}/api/v1/sources/${sourceId}`,{headers:{Origin:origin},data:{name:'Test-owned acceptance source',enabled:true}});assert.equal(configured.status(),200);
 // Orbit generates the signing secret and returns it once.
 const {secret}=await configured.json();
 const event={eventId:crypto.randomUUID(),type:'form.submitted',subject:'The test-owned customer requested this bounded acceptance follow-up.',occurredAt:new Date().toISOString(),record:{type:'opportunity',id:opportunityId}},body=JSON.stringify(event),timestamp=String(Math.floor(Date.now()/1000)),signature=createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex');
 const post=body=>fetch(`${origin}/api/v1/signals/${sourceId}`,{method:'POST',headers:{'Content-Type':'application/json','X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':signature},body});
 const accepted=await post(body);assert.equal(accepted.status,201);const signal=await accepted.json();assert.equal(signal.linked,true);const replay=await post(body);assert.equal(replay.status,201);const repeated=await replay.json();assert.equal(repeated.id,signal.id);assert.equal(repeated.replayed,true);assert.equal((await post(body+' ')).status,401);
 return{sourceId,signalId:signal.id,signedIngress:true,replayOnce:true,tamperRejected:true};
}
