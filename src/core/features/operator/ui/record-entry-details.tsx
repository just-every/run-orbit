import {DataValue} from './data-value';
import {recordFieldValue,recordWords} from './record-presentation';

/** Read the customer's words once, with named details and no internal identifiers. */
export function RecordEntryDetails({payload}:{payload:Record<string,unknown>}){
 const featured=['text','subject','note','outcome'];
 const details=recordWords(Object.fromEntries(Object.entries(payload).filter(([key])=>!featured.includes(key))));
 return <>{featured.map(key=>{const value=recordWords(recordFieldValue(key,payload[key]));return typeof value==='string'&&value?<p key={key} style={{whiteSpace:'pre-wrap'}}>{value}</p>:null;})}{details!==undefined?<details><summary>Recorded details</summary><DataValue value={details}/></details>:null}</>;
}
