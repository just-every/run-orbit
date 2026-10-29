import type {Json} from '../../shared/expansion-contracts';

/** One native record behind a sales figure. Facts are the measured values; refs are the graph records it names. */
export type RowKind='deal'|'movement'|'activity'|'message'|'task'|'booking';
export type GraphKind='opportunity'|'contact'|'company';
export interface GraphRef{type:GraphKind;id:string}
export interface SalesRow{
 key:string;kind:RowKind;id:string;
 /** Every graph record the row names: each must be readable now, and erasing one withdraws a saved result. */
 refs:GraphRef[];
 /** RECORD-023: a collaborator reads notes, calls, meetings and tasks only through a grant on this record that includes them. */
 entries?:GraphRef;
 /** Messages and bookings are customer evidence that only full operators read. */
 full?:true;
 /** The deal whose fields govern this row: `needs` must all be readable, and each `governed` fact is kept only while its deal fields are. */
 dealId?:string;needs?:string[];governed?:Record<string,string[]>;
 /** `at` dates the row into a month; `recordedAt` is when its evidence was recorded, which finds late-arriving evidence. */
 at:string|null;recordedAt:string|null;
 facts:Record<string,Json>;
}
/** Deal fields a report may measure, and the derived deal facts with the fields that govern them. */
export const dealFields=['lifecycle','stage_id','owner_id','value_cents','close_reason','closed_at','created_at'] as const;
export const dealGoverned:Record<string,string[]>={...Object.fromEntries(dealFields.map(field=>[field,[field]])),pipeline_id:['stage_id'],creation_stage:['stage_id','created_at'],stage_entered_at:['stage_id','created_at']};
export interface StageConfig{id:string;name:string;position:number;pipelineId:string;pipelineName:string}
