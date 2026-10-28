import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {eraseCustomerHistory,eraseMailboxAliases} from '../support/sanity-records-contact-erasure';
import {eraseDepartingOperators} from '../support/sanity-records-operator-erasure';

test('DATA-002 RECORD-013 OUT-017 BASE-DATA-003 API-001 privacy erasure removes a customer and departing operators without changing another person or losing anonymous accounting',async()=>{
 const fixture=await launchFixture();
 try{
  await fixture.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(fixture.actor).run();
  // The same administrator deletes a deal before one customer, and retains the other customer's deal.
  await eraseCustomerHistory(fixture,true);
  await eraseCustomerHistory(fixture,false);
  await eraseMailboxAliases(fixture);
  await eraseDepartingOperators(fixture);
 }finally{await fixture.dispose();}
});
