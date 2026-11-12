import {z} from 'zod';
export const acceptObligationInput=z.object({
 meetingId:z.string().min(1).max(100),opportunityId:z.string().min(1).max(100),contactId:z.string().min(1).max(100),
 ownerId:z.string().min(1).max(100),dueAt:z.iso.datetime(),goalStageId:z.string().min(1).max(100),
 title:z.string().trim().min(1).max(300),stopCondition:z.string().trim().min(1).max(1000),
}).strict();
export type AcceptObligationInput=z.infer<typeof acceptObligationInput>;
