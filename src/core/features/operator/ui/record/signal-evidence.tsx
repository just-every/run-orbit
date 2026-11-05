import {useState} from 'react';
import type {MouseEvent,ReactNode} from 'react';
import {loadSignalEvidence,type OpportunityDetail,type SignalEvidence,type WorkspacePresentation} from '../operator-api';
import {formatDateTime,label,sourceLabel} from '../formatters';

const evidenceId=(signalId:string)=>`signal-evidence-${signalId}`;

/** Native fragment links also open the enclosing disclosures for keyboard navigation. */
export function SignalEvidenceLink({signalId,children}:{signalId:string;children:ReactNode}){
 function reveal(event:MouseEvent<HTMLAnchorElement>){
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const target=document.getElementById(evidenceId(signalId));
  for(let element:HTMLElement|null=target;element;element=element.parentElement){
   if(element instanceof HTMLDetailsElement)element.open=true;
  }
  target?.focus({preventScroll:true});
 }
 return <a href={`#${evidenceId(signalId)}`} onClick={reveal}>{children}</a>;
}

export function RecordedSignalEvidence({opportunityId,signal,presentation}:{opportunityId:string;signal:OpportunityDetail['signals'][number];presentation:WorkspacePresentation}){
 const [evidence,setEvidence]=useState<SignalEvidence|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 async function load(){
  setLoading(true);setError('');setEvidence(null);
  try{setEvidence(await loadSignalEvidence(opportunityId,signal.id));}
  catch(reason){setError((reason as Error).message);}
  finally{setLoading(false);}
 }
 return <details onToggle={event=>{if(event.currentTarget.open&&!loading)void load();}}>
  <summary id={evidenceId(signal.id)} style={{overflowWrap:'anywhere'}}>{signal.subject??label(signal.type)} · Signal {signal.id}</summary>
  <p>{label(signal.type)} · {sourceLabel(signal.source)} · {label(signal.confidence)} · linked by {label(signal.linkingBasis).toLowerCase()}</p>
  <p>Occurred {formatDateTime(signal.occurredAt,presentation)} · Received {formatDateTime(signal.receivedAt,presentation)}</p>
  {loading&&<p role="status">Loading source evidence…</p>}
  {error&&<p role="alert">{error} <button type="button" onClick={()=>void load()}>Retry evidence</button></p>}
  {evidence&&<section aria-label={`Source evidence for signal ${signal.id}`}>
   <p>Source event {evidence.sourceEventId}</p>
   {evidence.originalHeaders!==null&&<><h3>Original headers</h3><OriginalText>{evidence.originalHeaders}</OriginalText></>}
   {evidence.originalBody!==null&&<><h3>Original content</h3><OriginalText>{evidence.originalBody}</OriginalText></>}
   {evidence.originalPayload!==null&&<><h3>Original source event</h3><OriginalText>{evidence.originalPayload}</OriginalText></>}
   {evidence.originalBody===null&&evidence.originalPayload===null&&<p>No original content was retained for this historical signal.</p>}
  </section>}
 </details>;
}
function OriginalText({children}:{children:string}){
 return <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',font:'inherit'}}>{children}</pre>;
}
