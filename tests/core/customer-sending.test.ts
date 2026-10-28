import {test} from 'node:test';
import {sendingJourney} from '../support/customer-sanity-sending';
test('OUT-005 OUT-006 OUT-007 OUT-009 OUT-010 OUT-011 OUT-012 OUT-018 BASE-DATA-002 reviewed mail obeys sender capacity, bounds known-unsent retries, reconciles uncertain outcomes and dispatches scheduled work once until a recipient stops it',sendingJourney);
