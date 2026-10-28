import {test} from 'node:test';
import {captureFixture} from '../support/capture-fixture';
import {captureAuthority,captureReviewedStop} from '../support/customer-sanity-capture-authority';
import {captureIntake} from '../support/customer-sanity-capture-intake';
import {captureReview} from '../support/customer-sanity-capture-review';
import {captureAddress} from '../support/customer-sanity-capture-address';

test('CAPTURE-001 CAPTURE-002 CAPTURE-003 CAPTURE-004 CAPTURE-005 CAPTURE-008 CAPTURE-009 SIGNAL-003 SIGNAL-009 OUT-004 ACTION-005 RECORD-012 imported and forwarded customer evidence stops follow-up, survives replay and becomes a record change only after native review',async()=>{
 const f=await captureFixture();
 try {
  await captureAuthority(f);
  await captureIntake(f);
  await captureReview(f);
  await captureAddress(f);
  await captureReviewedStop(f);
 } finally {await f.dispose();}
});
