import {test} from 'node:test';
import {calendarWritebackProof} from '../support/calendar-writeback';
import {oversizedMessageProof,deletedEventProof} from '../support/capture-provider-items';

test('CAPTURE-006 CAPTURE-011 reviewed calendar writes and provider occurrence changes preserve consent, replay, conflict and erasure boundaries',async()=>{
 for(const provider of ['google','microsoft'] as const){await calendarWritebackProof(provider);await oversizedMessageProof(provider);await deletedEventProof(provider);}
});
