import {z} from 'zod';
export const pipelineId=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
export const requiredDealFields=['title','value_cents','owner_id','company_id','expected_close_at','contact_ids','primary_contact_id'] as const;
const requiredField=z.union([z.enum(requiredDealFields),z.string().regex(/^custom:[^\u0000-\u001f]{1,100}$/).refine(field=>!!field.slice(7).trim(),'Name the required custom field.')]);
export const pipelineStageInput=z.object({
 id:pipelineId.optional(),name:z.string().trim().min(1).max(100),
 probability:z.number().min(0).max(100),
 requiredFields:z.array(requiredField).max(100).refine(fields=>new Set(fields).size===fields.length,'Choose each required field once.'),
 staleIntervalDays:z.number().int().min(1).max(365).nullable()
}).strict();
export const pipelineInput=z.object({name:z.string().trim().min(1).max(100),stages:z.array(pipelineStageInput).min(1).max(100),revision:z.number().int().positive().optional()}).strict();
export type PipelineStageInput=z.infer<typeof pipelineStageInput>;
export type PipelineInput=z.infer<typeof pipelineInput>;
