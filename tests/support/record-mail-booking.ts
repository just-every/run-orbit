import assert from 'node:assert/strict';
import {createId} from '../../src/core/shared/ids';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {IngestionRepository} from '../../src/core/features/ingestion/repository';
import {createSignalIngress} from '../../src/core/features/ingestion/routes';
/** A verified booking arrives through Orbit's signed customer-signal HTTP door. */
export async function recordMailBooking(db:D1Database,email:string){
 const key=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join(''),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:key})!,source=createId(),secret='synthetic-orbit-booking-proof';await new IngestionRepository(db).configure({id:source,name:'Verified booking fixture',enabled:true,secret},security);
 const at=new Date().toISOString(),timestamp=String(Math.floor(Date.now()/1000)),body=JSON.stringify({eventId:createId(),type:'meeting.booked',subject:'Production consultation booked',occurredAt:at,email}),signing=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']),signature=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',signing,new TextEncoder().encode(`${timestamp}.${body}`))),byte=>byte.toString(16).padStart(2,'0')).join('');
 const response=await createSignalIngress(db,security).request(`https://orbit.test/${source}`,{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':signature},body});assert.equal(response.status,201,await response.clone().text());
}
