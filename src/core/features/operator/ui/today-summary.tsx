import {useEffect,useRef,useState} from 'react';
import {DataValue} from './data-value';
import {OperatorState} from './operator-shell';
import {todayRequest,type BriefLine} from './today-api';

type Preview={configured:boolean;provider:string|null;model:string|null;request:unknown;requestHash:string};
type Result={status:'succeeded';summary:string;evidenceIds:string[]};

/** An optional AI paragraph for one account: shown only after the operator has seen the exact request. */
export function TodaySummary({account,name,lines}:{account:string;name:string;lines:BriefLine[]}){
 const [preview,setPreview]=useState<Preview|null>(null),[result,setResult]=useState<Result|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 // Keyboard focus follows the swap: to the request preview when it opens, to the summary when it arrives, back to the button on cancel.
 const button=useRef<HTMLButtonElement>(null),heading=useRef<HTMLHeadingElement>(null),summary=useRef<HTMLElement>(null),returning=useRef(false);
 useEffect(()=>{if(preview)heading.current?.focus();else if(returning.current){returning.current=false;button.current?.focus();}},[preview]);
 useEffect(()=>{if(result)summary.current?.focus();},[result]);
 const cancel=()=>{returning.current=true;setPreview(null);};
 async function open(){setBusy(true);setError('');setResult(null);try{setPreview(await todayRequest<Preview>('/summary/preview',{body:{account}}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function send(){if(!preview)return;setBusy(true);setError('');try{setResult(await todayRequest<Result>('/summary',{body:{account,requestHash:preview.requestHash}}));setPreview(null);}catch(e){setError(`Summary failed: ${(e as Error).message} Nothing was shown in its place.`);}finally{setBusy(false);}}
 const cited=(id:string)=>lines.find(line=>line.evidence.id===id);
 return <div className="today-summary">
  {!preview&&<button ref={button} type="button" className="operator-text-button" disabled={busy} onClick={()=>void open()} aria-label={`Summarise ${name} with AI`}>Summarise with AI</button>}
  {preview&&<section className="today-summary__preview" aria-label={`AI request for ${name}`}>
   <h4 ref={heading} tabIndex={-1}>Request preview</h4>
   <p>{preview.configured?`Orbit will send exactly this to ${preview.provider} (${preview.model}), and nothing else.`:'AI is not configured. The brief above is complete without a summary.'}</p>
   <details><summary>View complete request</summary><DataValue value={preview.request}/></details>
   <div className="today-summary__actions"><button type="button" className="operator-button" disabled={!preview.configured||busy} onClick={()=>void send()}>Send this request</button><button type="button" className="operator-text-button" onClick={cancel}>Cancel</button></div>
  </section>}
  {result&&<section ref={summary} tabIndex={-1} className="today-summary__result" aria-label={`AI summary for ${name}`}><p>{result.summary}</p><p className="today-summary__cites">Cites: {result.evidenceIds.map((id,index)=>{const line=cited(id);return <span key={id}>{index?', ':''}{line?<a href={line.href}>{line.title}</a>:id}</span>;})}</p></section>}
  {error&&<OperatorState kind="error">{error}</OperatorState>}
 </div>;
}
