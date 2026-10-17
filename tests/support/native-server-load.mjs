import {loadavg} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';

/** Respect this Mac's server admission limit before invoking the real CLI. */
export async function waitForNativeServerCapacity(){
 if(process.platform!=='darwin')return;
 const deadline=Date.now()+20*60_000;
 for(;;){
  const load=loadavg()[0];
  if(load<=36)return;
  if(Date.now()>=deadline)throw Error('Native server was not started: this Mac remained above the load limit for twenty minutes.');
  console.log(`Waiting for native server capacity: 1-minute load ${load.toFixed(1)}; limit 36.`);
  await delay(60_000);
 }
}
