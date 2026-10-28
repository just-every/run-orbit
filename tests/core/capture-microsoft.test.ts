import {test} from 'node:test';
import {captureProviderJourney} from '../support/capture-provider-journey';

test('CAPTURE-005 CAPTURE-006 CAPTURE-010 Microsoft source authority, selected incremental intake, corrected deal associations, recovery and disconnect form one durable connection lifecycle',async()=>{
 await captureProviderJourney('microsoft');
});
