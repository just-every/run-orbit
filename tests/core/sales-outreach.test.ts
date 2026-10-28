import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {sellWithReviewedMail} from '../support/sales-sanity-outreach';
test('SIGNAL-001 SIGNAL-002 SIGNAL-003 SIGNAL-004 SIGNAL-005 SIGNAL-006 SIGNAL-007 SIGNAL-008 SIGNAL-009 OPP-005 OPP-008 OUT-001 OUT-002 OUT-004 OUT-005 OUT-006 OUT-007 OUT-008 OUT-009 OUT-010 OUT-011 OUT-014 OUT-017 NOTIFY-001 NOTIFY-002 a seller reviews customer evidence and exact mail, gets truthful provider and reply outcomes, and stops follow-up when consent, responsibility or the deal changes', {timeout:240000},async context=>{const f=await isolatedDatabase();try{await sellWithReviewedMail(f.db,context);}finally{await f.dispose();}});
