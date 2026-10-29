import './records.css';
import './capture-setup.css';
import {useCallback} from 'react';
import {CaptureProposals} from './capture-proposals';
import {ScrollToHash} from './hash-target';
import {OperatorShell} from './operator-shell';
import {UnlinkedReplies} from './unlinked-replies';
import {UnlinkedReview,type Unlinked} from './unlinked-review';
import {useOperatorResource} from './use-operator-resource';

/** What waits for a person: changes Orbit found in captured mail and meetings, events and replies without a record. */
export function ReviewPage(){
 const load=useCallback(async()=>{const response=await fetch('/api/v1/sources/unlinked');if(!response.ok)throw new Error('Events without a record could not load.');return (await response.json() as {signals:Unlinked[]}).signals;},[]);
 const unlinked=useOperatorResource('review-unlinked',load);
 return <OperatorShell title="Review">
  <CaptureProposals standalone/>
  <UnlinkedReview signals={unlinked.data??undefined} onChange={unlinked.reload}/>
  <UnlinkedReplies/>
  <ScrollToHash ready={Boolean(unlinked.data)}/>
 </OperatorShell>;
}
