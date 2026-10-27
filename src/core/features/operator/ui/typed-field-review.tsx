import {useEffect,useRef} from 'react';
import {FieldOutcome,type Outcome} from './typed-field-outcome';

export type Definition={fieldKey:string;label:string;valueType:string;required:boolean;unique:boolean;options:string[];archived:boolean};
/** A preview to apply, shown where it was asked for: under the editor, or under the archived row being restored. */
export type Review={input:Definition&{kind:string};reviewHash:string;affected:{id:string;name:string;reason:string}[];duplicateCount:number;recordCount:number;place:string;stale?:boolean;refreshed?:boolean};

export function TypedFieldReview({review,busy,outcome,onApply,onCancel}:{review:Review;busy:boolean;outcome?:Outcome;onApply:()=>void;onCancel:()=>void}){
 const element=useRef<HTMLElement>(null);
 // A preview fetched again after a refused Apply takes focus, so the fresh review is read before Apply is pressed again.
 useEffect(()=>{if(review.refreshed)element.current?.focus();},[review]);
 return <section ref={element} tabIndex={-1} className="typed-field-review" aria-label="Affected field records"><h3>Review affected records</h3>
  <p>{review.input.archived?'Its values stay on records, read-only, until you restore it.':`${review.affected.length} affected of ${review.recordCount} records. Existing values stay unchanged.`}</p>
  {review.affected.length>0&&<ul>{review.affected.map((r,index)=><li key={r.id+index}>{r.name}: {r.reason}</li>)}</ul>}
  <div className="typed-field-actions"><button className="operator-button" type="button" disabled={review.stale||review.duplicateCount>0} aria-disabled={busy||undefined} onClick={()=>{if(!busy)onApply();}}>Apply reviewed definition</button><button type="button" onClick={onCancel}>Cancel field change</button></div>
  {outcome&&<FieldOutcome outcome={outcome}/>}
 </section>;
}
