import {DataValue} from './data-value';

/** The useful entry text stays readable; identifiers remain available for diagnosis. */
export function RecordEntryDetails({payload}:{payload:Record<string,unknown>}){
 return <>{'ownerId' in payload&&'previousOwnerId' in payload&&<p>Owner: {String(payload.previousOwnerName??'Unassigned')} → {String(payload.ownerName??'Unassigned')}</p>}{['text','subject','note','outcome'].map(key=>typeof payload[key]==='string'&&payload[key]?<p key={key} style={{whiteSpace:'pre-wrap'}}>{String(payload[key])}</p>:null)}<details><summary>Recorded details</summary><DataValue value={payload}/></details></>;
}
