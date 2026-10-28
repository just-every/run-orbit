import {test} from 'node:test';
import {captureFixture} from '../support/capture-fixture';
import {captureErasure} from '../support/customer-sanity-capture-erasure';
import {contactErasure} from '../support/customer-sanity-contact-erasure';
import {operatorErasure} from '../support/customer-sanity-operator-erasure';
import {providerErasure} from '../support/customer-sanity-provider-erasure';
test('DATA-002 RECORD-013 CAPTURE-007 OUT-017 BASE-DATA-003 erasing an identity withdraws copied evidence and credentials, preserves distinct people and accounting, and fences later replay and capture',async()=>{
 const f=await captureFixture();
 try {await contactErasure(f.db);await operatorErasure(f.db);await captureErasure(f);}finally{await f.dispose();}
 await providerErasure();
});
