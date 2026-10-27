import {useEffect,useRef} from 'react';
import {plainFailure} from '../../dashboards/save-failure';

export type Outcome={at:'editor'|'review'|'saved';text:string;failed:boolean;retry?:()=>void};

/** What refused a press, with Retry only where pressing again can help: the same request after a lost connection or a server fault, a fresh preview after a 409. */
export function refusal(at:Outcome['at'],error:unknown,again:()=>void,refresh:()=>void):Outcome{
 const status=(error as {status?:number}).status;
 return {at,text:plainFailure(error),failed:true,retry:status===409?refresh:status===undefined||status>=500?again:undefined};
}

/** One line under the control that was pressed; it takes focus so the outcome is read and seen where the press was. */
export function FieldOutcome({outcome}:{outcome:Outcome}){
 const line=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{line.current?.focus();},[outcome]);
 return <p ref={line} tabIndex={-1} role={outcome.failed?'alert':'status'} className={outcome.failed?'operator-state operator-state--error typed-field-outcome':'typed-field-outcome typed-field-outcome--saved'}>
  {outcome.text}{outcome.retry&&<> <button type="button" onClick={outcome.retry}>Retry</button></>}
 </p>;
}
