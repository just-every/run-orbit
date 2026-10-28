import {test} from 'node:test';
import {sourceJourney} from '../support/customer-sanity-source-journey';

test('CAPTURE-005 CAPTURE-006 CAPTURE-010 CAPTURE-011 native Google consent, scoped intake, recovery, corrections and reviewed calendar changes retain evidence without retaining revoked authority',async()=>{
 await sourceJourney('google');
});
