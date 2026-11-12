import {z} from 'zod';

export const sequenceId=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
export const sequenceVersion=z.number().int().positive().max(Number.MAX_SAFE_INTEGER-1);
const base={condition:z.enum(['always','no_reply','no_meeting','task_completed']),delayBusinessDays:z.number().int().min(0).max(365)};
const library=z.object({id:sequenceId,revision:sequenceVersion}).strict();
export const stepSchema=z.union([
 z.object({...base,kind:z.literal('email'),subject:z.string().trim().min(1).max(998),body:z.string().min(1).max(100000)}).strict(),
 z.object({...base,kind:z.literal('email'),library}).strict(),
 z.object({...base,kind:z.literal('wait')}).strict(),
 z.object({...base,kind:z.enum(['call','meeting','linkedin']),title:z.string().trim().min(1).max(200),instructions:z.string().min(1).max(10000)}).strict(),
]);
export const sequenceContent=z.object({name:z.string().trim().min(1).max(200),steps:z.array(stepSchema).min(1).max(100)}).strict();
export const sequenceEdit=sequenceContent.extend({version:sequenceVersion}).strict();
export const sequenceShare=z.object({version:sequenceVersion,visibility:z.enum(['private','workspace'])}).strict();
export const sequenceCopy=z.object({version:sequenceVersion,name:z.string().trim().min(1).max(200)}).strict();
export const sequencePreview=z.object({startAt:z.iso.datetime({offset:true})}).strict();
export type Step=z.infer<typeof stepSchema>;
export type SequenceContent=z.infer<typeof sequenceContent>;
export interface SequenceCalendar {timezone:string;days:number[]}
export interface SequenceHistory extends SequenceContent {version:number;calendar:SequenceCalendar;createdAt:string;createdBy:string;authorName:string}
export interface Sequence extends SequenceContent {
 id:string;ownerId:string;visibility:'private'|'workspace';version:number;calendar:SequenceCalendar;
 source:{id:string;version:number}|null;history:SequenceHistory[];
}
