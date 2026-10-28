import {test} from 'node:test';
import {providerFixture} from '../support/capture-provider-fixture';
import {captureMailRuleJourney} from '../support/capture-mail-rule';
import {oversizedMessageProof,deletedEventProof} from '../support/capture-provider-items';
import {calendarWritebackProof} from '../support/calendar-writeback';
import {sourceConsent} from '../support/customer-sanity-source-consent';
import {sourceRefreshAndDisconnect,sourceNativeRevocation} from '../support/customer-sanity-source-security';
import {sourceLifecycle} from '../support/customer-sanity-source-lifecycle';

test('CAPTURE-005 CAPTURE-006 CAPTURE-010 CAPTURE-011 native Google and Microsoft consent, scoped intake, recovery, corrections and reviewed calendar changes retain evidence without retaining revoked authority',async()=>{
 for(const provider of ['google','microsoft'] as const){
  const f=await providerFixture(provider);
  try {
   if(provider==='google')await sourceConsent(f);
   await sourceLifecycle(f,provider);
   await sourceRefreshAndDisconnect(f);
   Object.assign(f.state,{incremental:false,tombstones:false,recurring:false,incrementalIds:[]});
   await captureMailRuleJourney(Object.assign(Object.create(f),{dispose:async()=>{}}),false);
   await sourceNativeRevocation(f);
  } finally {await f.dispose();}
  await oversizedMessageProof(provider);
  await deletedEventProof(provider);
  await calendarWritebackProof(provider);
 }
});
