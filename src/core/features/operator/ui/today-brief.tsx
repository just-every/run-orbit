import {useCallback,useState} from 'react';
import './today.css';
import {formatDateTime,formatDay} from './formatters';
import {operatorApi,type WorkspacePresentation} from './operator-api';
import {OperatorState} from './operator-shell';
import {useOperatorResource} from './use-operator-resource';
import {TodaySummary} from './today-summary';
import {linePrefix,todayRequest,type Brief,type BriefLine} from './today-api';

const sections:{title:string;test:(line:BriefLine)=>boolean}[]=[
 {title:'Replies and meetings',test:line=>line.kind==='reply'||line.kind==='meeting'},
 {title:'Customer actions (observed)',test:line=>line.kind==='signal'&&line.confidence==='observed'},
 {title:'Tool-reported activity (inferred)',test:line=>line.kind==='signal'&&line.confidence==='inferred'},
 {title:'Overdue promises',test:line=>line.group==='promise'},
 {title:'Handoffs to review',test:line=>line.group==='proposal'},
];

function Line({line,presentation}:{line:BriefLine;presentation:WorkspacePresentation}){
 return <li className="today-line" data-line={line.id}>
  <div className="today-line__what"><a href={line.href}><span className="today-line__prefix">{linePrefix(line)}:</span> {line.title}</a>{line.detail&&<span className="today-line__detail">{line.detail}</span>}</div>
  <div className="today-line__when"><time dateTime={line.occurredAt}>{formatDateTime(line.occurredAt,presentation)}</time>{line.dueAt&&line.group!=='proposal'&&<span>Due {formatDateTime(line.dueAt,presentation)}</span>}{line.planHref&&<a href={line.planHref}>Plan this meeting</a>}</div>
 </li>;
}

/** The top of the operator home: what changed since the operator last looked and what is owed, each line cited. */
export function TodayBrief(){
 const load=useCallback(async()=>{const [{brief,aiConfigured},{presentation}]=await Promise.all([todayRequest<{brief:Brief;aiConfigured:boolean}>(''),operatorApi.readWorkspacePresentation()]);return {brief,aiConfigured,presentation};},[]);
 const resource=useOperatorResource('today',load),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 if(resource.error)return <section className="today" aria-label="Today"><OperatorState kind="error">{resource.error.message}</OperatorState></section>;
 if(!resource.data)return <section className="today" aria-label="Today"><OperatorState>Loading today's brief…</OperatorState></section>;
 const {brief,presentation,aiConfigured}=resource.data,c=brief.counts,empty=!brief.accounts.length&&!brief.unresolved.length&&!brief.held.length;
 async function seen(){setBusy(true);setError('');try{await todayRequest('/seen',{body:{through:brief.generatedAt}});resource.reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="today" aria-label="Today's brief" data-testid="today-brief">
  <div className="today__since">{brief.sinceBasis==='seen'?<p>Since you last looked: <strong><time dateTime={brief.since}>{formatDateTime(brief.since,presentation)}</time> – <time dateTime={brief.generatedAt}>{formatDateTime(brief.generatedAt,presentation)}</time></strong></p>:<p>Customer activity from the last {Math.round((Date.parse(brief.generatedAt)-Date.parse(brief.since))/86400000)} days, including older mail and meetings you bring in: <strong>since <time dateTime={brief.since}>{formatDay(brief.since,presentation.timezone)}</time></strong>. After you choose Mark all as seen, this shows only what is new since then.</p>}<button type="button" className="operator-button" disabled={busy} onClick={()=>void seen()}>Mark all as seen</button></div>
  {error&&<OperatorState kind="error">{error}</OperatorState>}
  <dl className="today__counts" aria-label="Today at a glance">
   <div><dt>replies</dt><dd>{c.replies}</dd></div><div><dt>meetings</dt><dd>{c.meetings}</dd></div><div><dt>overdue promises</dt><dd>{c.promises}</dd></div><div><dt>unresolved identities</dt><dd>{c.unresolved}</dd></div>
  </dl>
  {empty?<div className="operator-surface today__empty" role="status"><h3>Nothing to do from your records today</h3><p>Nothing new since you last looked, no promise is overdue and every signal is matched to a record.</p></div>:
  <div className="today__accounts">
   {brief.accounts.map(account=><article key={account.key} className="operator-surface today-account" aria-labelledby={`account-${account.key}`}>
    <header><h3 id={`account-${account.key}`}><a href={account.href}>{account.name}</a></h3><p>{account.type==='company'?'Account':account.type==='opportunity'?'Opportunity without a company':'Contact without a company'}</p></header>
    {sections.map(section=>{const lines=account.lines.filter(section.test);return lines.length?<section key={section.title} className="today-account__section"><h4>{section.title}</h4><ul>{lines.map(line=><Line key={line.id} line={line} presentation={presentation}/>)}</ul></section>:null;})}
    {aiConfigured&&<TodaySummary account={account.key} name={account.name} lines={account.lines}/>}
   </article>)}
   {brief.unresolved.length>0&&<article className="operator-surface today-account" aria-labelledby="today-unresolved"><header><h3 id="today-unresolved">Unresolved identity</h3><p>Evidence that matches no record. Orbit never guesses who it belongs to.</p></header><section className="today-account__section"><ul>{brief.unresolved.map(line=><Line key={line.id} line={line} presentation={presentation}/>)}</ul></section></article>}
   {brief.held.length>0&&<article className="operator-surface today-account" aria-labelledby="today-held"><header><h3 id="today-held">Held for capture review</h3><p>Captured replies and meetings that wait for a person to accept or decline the link Capture proposed.</p></header><section className="today-account__section"><ul>{brief.held.map(line=><Line key={line.id} line={line} presentation={presentation}/>)}</ul></section></article>}
  </div>}
  {brief.truncated&&<p className="today__note">Showing the 200 most recent signals; open Records for the rest.</p>}
 </section>;
}
