import {providerFixture} from './capture-provider-fixture';
import {captureMailRuleJourney} from './capture-mail-rule';
import {oversizedMessageProof,deletedEventProof} from './capture-provider-items';
import {calendarWritebackProof} from './calendar-writeback';
import {sourceConsent} from './customer-sanity-source-consent';
import {sourceRefreshAndDisconnect,sourceNativeRevocation} from './customer-sanity-source-security';
import {sourceLifecycle} from './customer-sanity-source-lifecycle';

export async function sourceJourney(provider:'google'|'microsoft') {
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
