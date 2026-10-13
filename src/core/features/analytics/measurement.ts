import type {ReportMeasurement} from '../../shared/expansion-contracts';
import type {MetricDefinition} from './metrics';

/** Immutable definition context accompanies the measured period, including empty filters. */
export function reportMeasurement(definition:MetricDefinition,currency:string|null,currentPopulation=false):ReportMeasurement {
 const money=['sum','mean'].includes(definition.aggregation)&&definition.valueField==='value_cents';
 const unit=money?currency!:
  ['sum','mean'].includes(definition.aggregation)?definition.valueField??definition.unit:definition.unit;
 return {
  periodKind:currentPopulation?'current-population':'record-date',
  dateField:currentPopulation?null:definition.dateField??'created_at',
  filters:currentPopulation?{lifecycle:'open'}:definition.filters??{},groupBy:definition.groupBy??null,
  missingPolicy:definition.missingPolicy,
  missingHandling:currentPopulation?'Counts accessible open opportunities; missing numeric values do not affect a count.':
   definition.aggregation==='count'?'Counts accessible records in the period and filters; no numeric value is required. Unavailable dates are excluded and mark the result incomplete. Missing groups are shown as “Not entered”.':
   'Unavailable dates are excluded. Null or nonnumeric values are counted as missing and mark the result incomplete; sums omit them, means divide by nonmissing numeric values, and ratios with a zero denominator have no value. Missing groups are shown as “Not entered”.',
  aggregation:definition.aggregation,valueField:definition.valueField??null,unit,currency:money?currency:null,valueDivisor:money?100:1,
 };
}
