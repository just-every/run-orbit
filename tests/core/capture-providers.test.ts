import {test} from 'node:test';
import {captureProviderJourney} from '../support/capture-provider-journey';
test('CAPTURE-005 CAPTURE-006 CAPTURE-010 native source authority, selected incremental intake, recovery and disconnect form one durable connection lifecycle',async()=>{
 await captureProviderJourney('google');
});
