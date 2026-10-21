import {z} from 'zod';

/** REPORT-001 sales suite: every measure is a fixed, disclosed calculation over native records. */
export const salesMeasures=['pipeline','reasons','revenue','win_rate','conversion','stage_age','sales_cycle','activities','tasks','bookings','follow_up'] as const;
export type SalesMeasure=typeof salesMeasures[number];
const recordId=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const unique=(values:readonly string[])=>new Set(values).size===values.length;
/** `groupBy` is the saved grouping of won, lost, revenue, win rate and sales cycle; open pipeline always shows all three. */
export const salesDefinition=z.object({
 kind:z.literal('sales'),
 name:z.string().trim().min(1).max(120),
 description:z.string().trim().min(1).max(2000),
 measures:z.array(z.enum(salesMeasures)).min(1).max(salesMeasures.length).refine(unique,'Choose each measure once.'),
 pipelineIds:z.array(recordId).max(50).refine(unique,'Choose each pipeline once.'),
 repIds:z.array(recordId).max(200).refine(unique,'Choose each rep once.'),
 groupBy:z.enum(['pipeline','stage','owner']),
 bucket:z.literal('month'),
}).strict();
export type SalesDefinition=z.infer<typeof salesDefinition>;
export const isSalesBody=(value:unknown):boolean=>Boolean(value&&typeof value==='object'&&(value as {kind?:unknown}).kind==='sales');

interface MeasureInfo{title:string;definition:string;sources:string[]}
/** Shown with every preview, saved result and export: what is counted, from which stored fields. */
export const measureCatalog:Record<SalesMeasure,MeasureInfo>={
 pipeline:{title:'Open pipeline value and count',definition:'Deals open when the report is computed, by pipeline, by stage and by owner. Value is the sum of each deal amount in the workspace currency. The period does not filter open pipeline.',sources:['opportunities.lifecycle','opportunities.stage_id','opportunities.owner_id','opportunities.value_cents','pipeline_stage_rules.pipeline_id']},
 reasons:{title:'Won and lost reasons',definition:'Deals won or lost with a close time inside the period, by outcome and recorded close reason. A close without a reason is shown as Not entered.',sources:['opportunities.lifecycle','opportunities.closed_at','opportunities.close_reason','opportunities.value_cents']},
 revenue:{title:'Closed-won revenue',definition:'Sum of the amounts of deals won inside the period, by the local month of the close, in the workspace currency. No exchange rates or attribution are applied.',sources:['opportunities.lifecycle','opportunities.closed_at','opportunities.value_cents']},
 win_rate:{title:'Win rate',definition:'Deals won ÷ (deals won + deals lost) for closes inside the period. With no closes the rate has no value.',sources:['opportunities.lifecycle','opportunities.closed_at']},
 conversion:{title:'Stage-to-stage conversion',definition:'For each stage with a later stage in its pipeline: the deals that entered it inside the period (a recorded move into the stage, or creation in it) and, of those, the deals with a later recorded move to a later stage of the same pipeline before the period ended.',sources:['timeline_entries stage.changed','opportunities.stage_id','opportunities.created_at','pipeline_stages.position']},
 stage_age:{title:'Stage age',definition:'For deals open when the report is computed: days since the deal entered its current stage, from its latest recorded move into that stage, or its creation when it never moved.',sources:['timeline_entries stage.changed','opportunities.stage_id','opportunities.created_at']},
 sales_cycle:{title:'Sales cycle',definition:'For deals won or lost inside the period: days from creation to close. Means are shown for won, lost and all closed deals.',sources:['opportunities.created_at','opportunities.closed_at','opportunities.lifecycle']},
 activities:{title:'Rep activities',definition:'Notes, logged calls and logged meetings by author, dated by when they happened, and reviewed messages accepted for sending by the person who approved them, dated by acceptance.',sources:['timeline_entries manual.note','timeline_entries manual.call','timeline_entries manual.meeting','timeline_entries message.accepted','outbound_messages.operator_id']},
 tasks:{title:'Task completion',definition:'Tasks due inside the period, by assignee: due and completed, with overdue (still open after their due time) shown separately. Cancelled tasks are excluded.',sources:['sales_tasks.owner_id','sales_tasks.due_at','sales_tasks.status','sales_tasks.updated_at']},
 bookings:{title:'Bookings',definition:'Meetings booked through signed booking intake (Calendly, Cal.com or another signed webhook source), by the booking event time. Cancellations are counted separately and never subtracted.',sources:['signals meeting.booked','signals meeting.cancelled','signals.source_event_id','signal_sources.type','signal_links']},
 follow_up:{title:'Follow-up outcomes',definition:'Reviewed scheduled messages accepted for sending inside the period. Delivered, genuine reply, meeting booked, stage advance and deal won (with its amount) are counted separately per message, from evidence after acceptance up to the computation time. Reported opens are inferred and never count as success; automatic replies never count as replies.',sources:['outbound_messages.scheduled_at','timeline_entries message.accepted','timeline_entries provider.delivered','signals email.replied','signals meeting.booked','timeline_entries stage.changed','opportunities.closed_at','timeline_entries provider.open','signals email.opened','signals *:email.auto_replied']},
};

/** Built-in definitions an operator opens, reviews and saves; never per-screen SQL. */
export const salesSuite:{id:string;definition:SalesDefinition}[]=[
 ['sales-pipeline','Pipeline value and count','Open deal value and count by pipeline, stage and owner.',['pipeline'],'pipeline'],
 ['sales-reasons','Won and lost reasons','Won and lost deals by recorded reason.',['reasons'],'pipeline'],
 ['sales-revenue','Closed-won revenue','Closed-won value by local month.',['revenue'],'pipeline'],
 ['sales-conversion','Conversion and win rate','Stage-to-stage conversion from recorded movement, and win rate.',['conversion','win_rate'],'pipeline'],
 ['sales-velocity','Stage age and sales cycle','Time in the current stage and from creation to close.',['stage_age','sales_cycle'],'stage'],
 ['sales-activities','Rep activities','Notes, calls, meetings and reviewed sent messages by author.',['activities'],'owner'],
 ['sales-tasks','Task completion','Completed, due and overdue tasks by assignee.',['tasks'],'owner'],
 ['sales-bookings','Bookings','Meetings booked through signed booking intake.',['bookings'],'pipeline'],
 ['sales-follow-up','Follow-up outcomes','Delivered, reply, meeting, stage and revenue outcomes of reviewed scheduled messages.',['follow_up'],'pipeline'],
 ['sales-monthly','Monthly sales report','Every sales measure for the chosen pipelines, by local calendar month.',[...salesMeasures],'pipeline'],
].map(([id,name,description,measures,groupBy])=>({id:id as string,definition:{kind:'sales',name:name as string,description:description as string,measures:measures as SalesMeasure[],pipelineIds:[],repIds:[],groupBy:groupBy as SalesDefinition['groupBy'],bucket:'month'}}));
