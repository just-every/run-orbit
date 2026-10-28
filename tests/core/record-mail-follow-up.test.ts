import {test} from 'node:test';
import {recordMailHeldReplies} from '../support/record-mail-held-replies';

test('OUT-017 held customer replies and sender removal preserve accountable follow-up through custody and erasure',async context=>{
 await recordMailHeldReplies(context);
});
