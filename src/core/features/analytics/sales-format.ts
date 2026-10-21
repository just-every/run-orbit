import type {Cell} from './sales-measures';

/** One formatter for every sales figure, so the UI and its drill-through show the same value. */
export function cellValue(cell:Pick<Cell,'format'|'value'>,currency:string){
 if(cell.value===null)return 'Not available';
 if(cell.format==='money')return new Intl.NumberFormat('en-US',{style:'currency',currency}).format(cell.value/100);
 if(cell.format==='percent')return new Intl.NumberFormat('en-US',{style:'percent',maximumFractionDigits:1}).format(cell.value);
 if(cell.format==='days')return `${cell.value.toFixed(1)} days`;
 return String(cell.value);
}
export const recordNoun=(count:number)=>count===1?'record':'records';
