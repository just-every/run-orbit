export type ForecastCategory = 'pipeline' | 'best_case' | 'committed' | 'omitted';
export type ScheduleKind = 'one_time' | 'monthly' | 'quarterly' | 'annual';
export interface RevenueSchedule {label:string;kind:ScheduleKind;amountCents:number;startDate:string;endDate:string|null}
export interface ForecastPeriod {from:string;through:string}
export interface StageRuleInput {stageId:string;probability:number;category:ForecastCategory;reason:string}
/** null probability/category inherit the stage. null closeDate inherits the native expected_close_at. */
export interface DealForecastInput {probability:number|null;category:ForecastCategory|null;closeDate:string|null;schedules:RevenueSchedule[];reason:string}
export interface QuotaInput {operatorId:string;teamId?:string;period:'monthly'|'quarterly';startDate:string;amountCents:number;reason:string}
export interface ReviewAttribution {id:string;actorId:string;reason:string;reviewedAt:string;revision:number}
export type StageRule = StageRuleInput & ReviewAttribution;
export type DealInput = DealForecastInput & ReviewAttribution & {dealId:string};
export type ForecastQuota = QuotaInput & ReviewAttribution;
export interface NativeForecastDeal {id:string;title:string;lifecycle:'open'|'won'|'lost';stage_id:string;owner_id:string|null;company_id:string|null;value_cents:number;expected_close_at:string|null;closed_at:string|null;created_at:string;updated_at:string;[key:string]:unknown}
export interface ForecastReview extends ReviewAttribution {kind:'stage'|'deal'|'quota';targetKey:string;subjectId:string;actorName:string;body:StageRuleInput|DealForecastInput|QuotaInput}
export interface ForecastState {canManage:boolean;canOverride?:boolean;limited?:boolean;teams?:{id:string;name:string;operatorIds:string[]}[];stages:{id:string;name:string}[];operators:{id:string;name:string}[];stageRules:StageRule[];dealInputs:DealInput[];quotas:ForecastQuota[];deals:NativeForecastDeal[];reviewHistory:ForecastReview[]}
export type ForecastWarning = 'missing_close_date'|'stale_close_date'|'missing_probability'|'stale_review'|'unassigned_owner';
export interface ForecastDeal {deal:NativeForecastDeal;probability:number|null;category:ForecastCategory|null;closeDate:string|null;probabilitySource:'deal'|'stage'|'missing';reviewedAt:string|null;inPeriod:boolean;weightedCents:number|null;warnings:ForecastWarning[]}
export interface ForecastValues {openUnweightedCents:number;weightedExpectedCents:number;committedCents:number;bestCaseCents:number;pipelineCents:number;omittedCents:number;wonBookingsCents:number;oneTimeScheduledCents:number;recurringScheduledCents:number;mrrCents:number;arrCents:number;unweightedMissingProbabilityCents:number}
export interface ForecastRep {operatorId:string|null;name:string;totals:ForecastValues}
export interface QuotaAttainment {quota:ForecastQuota;through:string;wonBookingsCents:number;attainmentPercent:number|null}
export interface ForecastResult extends ForecastPeriod {asOf:string;currency:'USD';basis:string;totals:ForecastValues;reps:ForecastRep[];quotaAttainment:QuotaAttainment[];quotaTotals:{monthly:{amountCents:number;wonBookingsCents:number;attainmentPercent:number|null};quarterly:{amountCents:number;wonBookingsCents:number;attainmentPercent:number|null}};deals:ForecastDeal[];inputs:ForecastState}
export interface ForecastPreview {reviewHash:string;result:ForecastResult;filterNotes?:string[]}
export interface ForecastSnapshotMetadata extends ForecastPeriod {id:string;asOf:string;actorId:string;reviewHash:string}
export interface ForecastSnapshot extends ForecastSnapshotMetadata {result:ForecastResult}
