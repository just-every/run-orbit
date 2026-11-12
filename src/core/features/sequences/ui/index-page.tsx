import {useCallback} from 'react';
import {OperatorShell,OperatorState} from '../../operator/ui/operator-shell';
import {useOperatorResource} from '../../operator/ui/use-operator-resource';
import {sequenceRequest,type SequenceList,stepLabels} from './api';
import './sequences.css';
export function SequencesPage(){const load=useCallback(()=>sequenceRequest<SequenceList>(),[]),resource=useOperatorResource('sequences',load);return <OperatorShell title="Sequences" action={<a className="operator-primary-button" href="/app/sequences/new">New sequence</a>}>
 <p>Define ordered outreach and human tasks. Saved sequences are definitions; enrollment and sending are not available here.</p>
 {resource.loading&&<OperatorState>Loading sequences…</OperatorState>}{resource.error&&<OperatorState kind="error">{resource.error.message}</OperatorState>}
 {resource.data&&<section className="sequence-list" aria-label="Saved sequences">{resource.data.sequences.length?resource.data.sequences.map(sequence=><article className="operator-surface sequence-panel" key={sequence.id}><h2><a href={`/app/sequences/${sequence.id}`}>{sequence.name}</a></h2><p>Version {sequence.version} · {sequence.visibility==='workspace'?'Workspace shared':'Private'}{sequence.ownerId===resource.data!.actorId?' · Yours':''}</p><p>{sequence.steps.map(step=>stepLabels[step.kind]).join(' → ')}</p>{sequence.source&&<p>Copied from version {sequence.source.version} of sequence {sequence.source.id}</p>}</article>):<p>No sequences yet. Create a private sequence to begin.</p>}</section>}
 </OperatorShell>;}
