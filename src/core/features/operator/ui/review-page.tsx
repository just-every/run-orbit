import {useLocation} from '@tanstack/react-router';
import './records.css';
import './capture-setup.css';
import './review-page.css';
import {useCallback} from 'react';
import {CaptureProposals} from './capture-proposals';
import {ScrollToHash} from './hash-target';
import {HeldCalls} from './held-calls';
import {OperatorShell, OperatorState} from './operator-shell';
import {readReviewSummary} from './review-line';
import {UnlinkedReplies} from './unlinked-replies';
import {UnlinkedReview, type Unlinked} from './unlinked-review';
import {useOperatorResource} from './use-operator-resource';

/** Review: what waits for a person, one card per kind that has something waiting, reached from NOW and the Brief. */
export function ReviewPage() {
 const search=useLocation({select:location=>location.searchStr}),source=new URLSearchParams(search).get('source')||undefined;
 const summary = useOperatorResource('review-summary', useCallback(readReviewSummary, []));
 const s = summary.data, nothing = !source && s && !s.proposals && !s.events && !s.replies && !s.calls;
 return <OperatorShell title="Review">
  <div className="review-stack">
   {summary.error ? <OperatorState kind="error">{summary.error.message}</OperatorState> : null}
   {source&&<p>Pending proposals from this capture source. <a href="/app/review">Review all pending work</a></p>}
   {source||s?.proposals ? <div className="operator-surface review-card"><CaptureProposals source={source} onChanged={summary.reload}/></div> : null}
   {!source&&s?.events ? <UnlinkedEvents onChange={summary.reload}/> : null}
   {!source&&s?.replies ? <UnlinkedReplies onResolved={summary.reload}/> : null}
   {!source&&s?.calls ? <HeldCalls onChanged={summary.reload}/> : null}
   {nothing ? <p className="review-empty">Nothing waits for review.</p> : null}
  </div>
  <ScrollToHash ready={Boolean(s)}/>
 </OperatorShell>;
}

function UnlinkedEvents({onChange}: {onChange: () => void}) {
 const load = useCallback(async () => {const response = await fetch('/api/v1/sources/unlinked'); if (!response.ok) throw new Error('Events without a record could not load.'); return (await response.json() as {signals: Unlinked[]}).signals;}, []);
 const events = useOperatorResource('review-events', load);
 return events.error ? <OperatorState kind="error">{events.error.message}</OperatorState> : <UnlinkedReview signals={events.data ?? undefined} onChange={() => {events.reload(); onChange();}}/>;
}
