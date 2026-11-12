import type {ForecastResult} from './types';
/** Every quota view keeps monthly and quarterly targets separate, including zero-valued reviewed quotas. */
export function forecastQuotaPeriods(result:ForecastResult){
 return (['monthly','quarterly'] as const).map(period=>({period,rows:result.quotaAttainment.filter(row=>row.quota.period===period),totals:result.quotaTotals[period]})).filter(item=>item.rows.length);
}
