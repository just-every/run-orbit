import type {Json,MetricSnapshot} from '../../shared/expansion-contracts';

export function reportValue(report:MetricSnapshot,value:Json|undefined=report.values.value) {
 if(value===null||value===undefined)return 'Not available';
 const currency=report.measurement?.currency;
 if(currency&&typeof value==='number')return new Intl.NumberFormat('en-AU',{style:'currency',currency}).format(value/report.measurement!.valueDivisor);
 return `${value} ${countUnit(value,String(report.measurement?.unit??report.values.unit??''))}`.trim();
}

/** "1 open opportunities" reads as "1 open opportunity": a count of one takes the singular of a plural unit. */
function countUnit(value:Json,unit:string){
 if(value!==1)return unit;
 return unit.replace(/(\w+)$/,word=>/ies$/.test(word)?word.slice(0,-3)+'y':/[^s]s$/.test(word)?word.slice(0,-1):word);
}
