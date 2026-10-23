import { z } from 'zod';
export const standardTypes = new Set(['form.submitted','email.sent','email.opened','email.replied','email.bounced','email.unsubscribed','meeting.viewed','meeting.booked','meeting.rescheduled','meeting.ended','meeting.completed','meeting.cancelled','page.viewed','chat.started','content.downloaded','firmographic.changed']);
import {eventSchema} from './event-schema';
export {eventSchema};
export type SignalEvent=z.infer<typeof eventSchema>;
export function confidence(type:string){return ['form.submitted','email.replied','meeting.booked','meeting.rescheduled','meeting.ended','meeting.completed','content.downloaded','chat.started'].includes(type)?'observed':'inferred';}
export class IngestionError extends Error {constructor(readonly status:400|401|403|404|409|413|503,message:string){super(message);}}
