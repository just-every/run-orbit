import {WorkflowAction,WorkflowMetadata,WorkflowPreview,WorkflowPreviewRecord,WorkflowHistoryCoverage,workflowLabel,workflowTime,workflowValue} from './workflows-types';

function EffectPreview({value,metadata}:{value:unknown;metadata:WorkflowMetadata}) {
 if(!value||typeof value!=='object'||!('kind' in value))return <pre>{workflowValue(value)}</pre>;
 const action=value as WorkflowAction;
 const recipients=(action.operatorIds??[]).map(id=>metadata.operators.find(person=>person.id===id)?.display_name??id);
 return <div className="workflows-stack"><strong>{workflowLabel(action.kind)}</strong>{action.title&&<p>{action.title}</p>}{recipients.length>0&&<p className="workflows-meta">For: {recipients.join(', ')}</p>}{action.kind==='webhook'&&<><p className="workflows-meta">POST {action.url}</p><pre>{action.body??'{}'}</pre></>}{['create_task','remind_task'].includes(action.kind)&&<p className="workflows-meta">Due after {action.offsetDays??0} days</p>}{action.kind==='assign_owner'&&<p className="workflows-meta">{action.mode==='account_owner'?'Use the company owner':action.mode==='round_robin'?'Rotate between the chosen operators':'Use the chosen operator'}</p>}</div>;
}

function PreviewCounts({counts}:{counts:Record<string,unknown>}) {
 return <dl className="workflows-counts">{Object.entries(counts).map(([key,value])=><div key={key}><dt>{workflowLabel(key)}</dt><dd>{workflowValue(value)}</dd></div>)}</dl>;
}

function RecordPreviewBody({record,metadata,historical=false}:{record:WorkflowPreviewRecord;metadata:WorkflowMetadata;historical?:boolean}) {
 return <>{record.errors?.map((message,index)=><p className="operator-state operator-state--error" role="alert" key={index}>{message}</p>)}{record.changes.map((item,index)=><div className="workflows-change" key={index}><strong>{item.field}{item.needsApproval?' · Needs approval':''}</strong>{item.recordId&&item.recordId!==record.recordId&&<p className="workflows-meta">Target record: {item.recordId}</p>}<div><span>{historical?'Previous value':'Current'}</span><pre>{workflowValue(item.before)}</pre></div><div><span>{historical?'Dry-run result':'Proposed'}</span><pre>{workflowValue(item.after)}</pre></div></div>)}{record.effects.length>0&&<><h4>External effects</h4>{record.effects.map((effect,index)=><EffectPreview key={index} value={effect} metadata={metadata}/>)}</>}</>;
}

function HistoryCoverage({coverage}:{coverage?:WorkflowHistoryCoverage}) {
 if(!coverage)return <p className="workflows-note">Event history coverage was not provided. This preview cannot establish a complete 30-day history.</p>;
 return <div className="workflows-stack"><dl className="workflows-counts"><div><dt>Requested from</dt><dd>{workflowTime(coverage.from)}</dd></div><div><dt>Requested through</dt><dd>{workflowTime(coverage.through)}</dd></div><div><dt>Journal recorded from</dt><dd>{coverage.recordedFrom?workflowTime(coverage.recordedFrom):'No retained event start reported'}</dd></div></dl><p className="workflows-note">{coverage.complete?'The journal covers the requested event window.':'History is incomplete for this window. Only retained journaled events are included; earlier events cannot be verified.'}</p></div>;
}

export function WorkflowsPreview({preview,version,metadata,disabled,onActivate}:{preview:WorkflowPreview;version?:number;metadata:WorkflowMetadata;disabled:boolean;onActivate:()=>void}) {
 const historical=preview.historical??[];
 const hasErrors=[...preview.records,...historical].some(record=>!!record.errors?.length);
 return <section className="workflows-stack" aria-label="Workflow activation preview">
  <h3>Review version {version}</h3><p className="workflows-note">Activation authorizes this version’s internal changes. Changes marked “Needs approval” wait for a decision on each record.</p>
  {preview.asOf&&<p className="workflows-meta">Previewed {workflowTime(preview.asOf)}</p>}
  <PreviewCounts counts={preview.counts}/>
  {!preview.records.length&&<p>No records currently match this preview.</p>}
  {preview.records.map(record=><article className="workflows-card" key={record.recordId}><h4>{record.label||record.recordId}</h4><RecordPreviewBody record={record} metadata={metadata}/></article>)}
  <details><summary>Matching events in the past 30 days ({historical.length})</summary><div className="workflows-stack">
   <p className="workflows-note">This workflow version is evaluated against journaled events in the past 30 days. Each entry shows the source event time, previous and resulting values, approval requirements, and external content.</p>
   <HistoryCoverage coverage={preview.historyCoverage}/>
   {!historical.length&&<p>No matching events were found in the retained journal for this window.</p>}
   {historical.map(event=><details className="workflows-card" key={event.eventId}><summary><strong>{event.label||event.recordId}</strong><span className="workflows-meta">Source event time: <time dateTime={event.occurredAt}>{workflowTime(event.occurredAt)}</time></span></summary><div className="workflows-stack"><p className="workflows-meta">Record: {event.recordId} · Event: {event.eventId}</p>{event.counts&&<PreviewCounts counts={event.counts}/>}<RecordPreviewBody record={event} metadata={metadata} historical/></div></details>)}
  </div></details>
  {hasErrors&&<p className="workflows-note">Resolve the errors and preview again before activating.</p>}
  <button type="button" className="operator-button" disabled={disabled||hasErrors} onClick={onActivate}>Activate reviewed version</button>
 </section>;
}
