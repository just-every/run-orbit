import {test} from 'node:test';
import {exerciseRecordMail} from '../support/record-mail';

test('OUT-017 record mail preserves exact approval through sending, customer outcomes, custody and erasure',async context=>{
 await exerciseRecordMail(context);
});
