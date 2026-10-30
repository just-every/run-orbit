import {useState,type ReactNode} from 'react';
import {ScrollToHash} from '../hash-target';
import {formatDateTime} from '../formatters';

/** One line of a record's activity: its kind in a word, what happened, one quiet line, and when. */
export interface ActivityEntry{
 key:string;
 /** The cited-line anchor (entry-<id>, handoff-<id>) that ScrollToHash focuses. */
 anchor?:string;
 kind:string;
 draft?:boolean;
 title:ReactNode;
 line?:ReactNode;
 /** When it happened; a hand-off task without a due time has none and sorts last. */
 at:string|null;
 /** Recorded details: the entry's sources, times and actor in words. */
 details?:ReactNode;
 /** The entry's own actions (Edit entry, Delete, Cancel a scheduled message). */
 tools?:ReactNode;
}
export interface ActivityAction{label:string;panel:ReactNode}

/** A fold that renders what it holds only while open, so a closed row loads nothing and a field inside can take focus. */
export function Opens({summary,initiallyOpen=false,children}:{summary:string;initiallyOpen?:boolean;children:()=>ReactNode}){
 const [open,setOpen]=useState(initiallyOpen);
 return <details open={open} onToggle={event=>setOpen(event.currentTarget.open)}><summary>{summary}</summary>{open?children():null}</details>;
}

/** Activity: three quiet actions at the heading's right, each opening its form in place under it, then one list,
 * newest first, with a hairline between entries. */
/** note: one line the list needs said first (a scheduled send's timer). */
export function Activity({entries,actions,note,empty='No activity recorded yet.'}:{entries:ActivityEntry[];actions:ActivityAction[];note?:ReactNode;empty?:string}){
 const [open,setOpen]=useState<string|null>(null),sorted=[...entries].sort((a,b)=>(b.at??'').localeCompare(a.at??''));
 const panel=actions.find(action=>action.label===open);
 return <section className="r-activity" aria-labelledby="record-activity" data-testid="record-activity">
  <div className="r-head"><h2 id="record-activity">Activity</h2><div className="r-head-actions">{actions.map(action=><button key={action.label} type="button" className="operator-text-button" aria-expanded={open===action.label} onClick={()=>setOpen(open===action.label?null:action.label)}>{action.label}</button>)}</div></div>
  {panel?<div className="r-panel">{panel.panel}</div>:null}
  {note}
  {sorted.length?<ol className="r-feed">{sorted.map(entry=><li key={entry.key} id={entry.anchor}>
   <span className={`r-kind ${entry.draft?'r-kind--draft':''}`}>{entry.kind}</span>
   <div className="r-entry"><p className="r-entry-title">{entry.title}</p>{entry.line?<p className="r-entry-line">{entry.line}</p>:null}
    {entry.details?<details><summary>Recorded details</summary>{entry.details}</details>:null}
    {entry.tools?<div className="r-entry-actions">{entry.tools}</div>:null}
   </div>
   <span className="r-when">{entry.at?formatDateTime(entry.at):''}</span>
  </li>)}</ol>:<p className="r-empty">{empty}</p>}
  <ScrollToHash ready={sorted.length>0}/>
 </section>;
}
