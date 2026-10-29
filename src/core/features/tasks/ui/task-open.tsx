import {useEffect, useRef, useState} from 'react';
import {EntryPrivacy} from '../../operator/ui/entry-privacy';
import {label} from '../../operator/ui/formatters';
import type {SalesTask, TaskHistory, TaskInput, TaskList} from '../contracts';
import {readSalesTask} from './api';
import {taskTime} from './task-card';
import {SalesTaskForm} from './task-form';

/** A task opened at /app/tasks/<id>: the task form, how it repeats and reminds, Cancel task and its history. A task
 * that is no longer open reads its outcome and history only. */
export function TaskOpen({task, data, busy, onSave, onCancelTask, onClose}: {task: SalesTask; data: TaskList; busy: boolean; onSave: (input: TaskInput) => Promise<void>; onCancelTask: (task: SalesTask) => void; onClose: () => void}) {
 const region = useRef<HTMLDivElement>(null);
 useEffect(() => {region.current?.scrollIntoView({block: 'nearest'}); region.current?.querySelector<HTMLElement>('input, button')?.focus({preventScroll: true});}, [task.id]);
 return <div ref={region} id={`task-${task.id}`} className="task-open" aria-label={`Task ${task.title}`} role="region">
  {task.status === 'open'
   ? <SalesTaskForm key={task.id + task.revision} task={task} data={data} busy={busy} onSave={onSave} onCancel={onClose}/>
   : <p className="task-open__outcome">{label(task.status)} · <time dateTime={task.updatedAt}>{taskTime(task, task.updatedAt)}</time></p>}
  {task.recurrence !== 'none' && <p>Repeats {task.recurrence}. Occurrence {task.occurrence + 1}{task.seriesCancelledAt ? ' · Series cancelled' : ''}.</p>}
  {task.reminderMinutes !== null && <p>In-app reminder {task.reminderMinutes === 0 ? 'at the due time' : `${task.reminderMinutes} minutes before due`}.</p>}
  <EntryPrivacy source="task" id={task.id}/>
  <p className="task-open__updated">Updated by {task.updatedByName ?? 'Removed operator'} · <time dateTime={task.updatedAt}>{taskTime(task, task.updatedAt)}</time></p>
  <div className="task-open__actions">
   {task.status === 'open' ? <button type="button" disabled={busy} onClick={() => onCancelTask(task)}>{task.recurrence === 'none' ? 'Cancel task' : 'Cancel recurring series'}</button> : null}
   {task.status !== 'open' ? <button type="button" onClick={onClose}>Close</button> : null}
  </div>
  <History task={task}/>
 </div>;
}

function History({task}: {task: SalesTask}) {
 const [history, setHistory] = useState<TaskHistory[] | null>(null), [error, setError] = useState('');
 const details = useRef<HTMLDetailsElement>(null);
 useEffect(() => {setHistory(null); if (details.current?.open) void load();}, [task.revision]);
 async function load() {try {setHistory((await readSalesTask(task.id)).history); setError('');} catch (reason) {setError((reason as Error).message);}}
 return <details ref={details} onToggle={event => {if (event.currentTarget.open && !history) void load();}}><summary>Task history</summary>
  {error && <p role="alert">{error}<button type="button" onClick={() => void load()}>Reload history</button></p>}
  {history ? <ol className="sales-task__history">{history.map(entry => <li key={entry.id}><strong>{label(entry.kind)}</strong> · {entry.actorName}<p>Occurred <time dateTime={entry.occurredAt}>{taskTime(task, entry.occurredAt)}</time></p><p>Recorded <time dateTime={entry.recordedAt}>{taskTime(task, entry.recordedAt)}</time></p><p>Owner: {entry.ownerName ?? 'Unassigned'}{entry.payload.previousOwnerId !== undefined && entry.payload.previousOwnerId !== entry.payload.ownerId ? ` (previously ${entry.previousOwnerName ?? 'Unassigned'})` : ''}</p><p>Due {taskTime(task, entry.payload.dueAt)}{entry.payload.previousDueAt && entry.payload.previousDueAt !== entry.payload.dueAt ? ` (previously ${taskTime(task, entry.payload.previousDueAt)})` : ''}{entry.payload.reason ? ` · ${entry.payload.reason}` : ''}</p></li>)}</ol> : !error && <p role="status">Loading task history…</p>}
 </details>;
}
