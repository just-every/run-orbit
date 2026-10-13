import type {Json,MetricSnapshot} from '../../shared/expansion-contracts';

export function reportValue(report:MetricSnapshot,value:Json|undefined=report.values.value) {
 if(value===null||value===undefined)return 'Not available';
 const currency=report.measurement?.currency;
 if(currency&&typeof value==='number')return new Intl.NumberFormat('en-AU',{style:'currency',currency}).format(value/report.measurement!.valueDivisor);
 return `${value} ${report.measurement?.unit??report.values.unit??''}`.trim();
}
