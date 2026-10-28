import {test} from 'node:test';
import {identityJourney} from '../support/customer-sanity-identity';
import {nativeOwnerJourney} from '../support/customer-sanity-owner';
import {managedOwnerJourney} from '../support/customer-sanity-managed-owner';

test('PUBLIC-004 OPS-001 native sign-in proves the asking session, fences local personas and respects domain admission and revocation',identityJourney);
test('PUBLIC-002 TEAM-002 PUBLIC-004 native and managed installations claim one owner, preserve mailbox authority and hand administration over explicitly',async()=>{await nativeOwnerJourney();await managedOwnerJourney();});
