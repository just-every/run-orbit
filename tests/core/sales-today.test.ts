import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {sellFromToday} from '../support/sales-sanity-today';
import {exerciseTwilio} from '../support/twilio-calls';
test('BRIEF-001 BRIEF-002 BRIEF-003 BRIEF-004 AI-001 AI-002 AI-003 AI-004 ACTION-003 AGENT-002 TASK-001 TEAM-004 RECORD-010 RECORD-017 a seller turns the daily evidence brief into cited drafts, reviewed next actions, meeting plans and private colleague handoffs',async()=>{const f=await isolatedDatabase();try{await sellFromToday(f.db);}finally{await f.dispose();}});
test('CALL-001 a seller reviews exact phone numbers, calls once, receives ordered signed receipts and erases the customer call history',async()=>{const f=await isolatedDatabase();try{await exerciseTwilio(f.db);}finally{await f.dispose();}});
