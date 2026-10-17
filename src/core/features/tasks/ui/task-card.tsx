import { useEffect, useRef, useState } from 'react';
import { formatDate, label } from '../../operator/ui/formatters';
import type { SalesTask, TaskHistory, TaskStatus } from '../contracts';
import { readSalesTask } from './api';
export function SalesTaskCard({task, busy, highlighted, onEdit, onStatus}: {
 task: SalesTask; busy: boolean; highlighted?: boolean; onEdit: (task: SalesTask) => void; onStatus: (task: SalesTask, status: TaskStatus) => void;
}) {
 const [history, setHistory] = useState<TaskHistory[] | null>(null), [historyError, setHistoryError] = useState('');
 const details = useRef<HTMLDetailsElement>(null);
 useEffect(() => {setHistory(null); if (details.current?.open) void loadHistory();}, [task.revision]);
 async function loadHistory() {try {setHistory((await readSalesTask(task.id)).history); setHistoryError('');} catch (error) {setHistoryError((error as Error).message);}}
 const href = task.recordType === 'opportunity' ? `/app/opportunities/${task.recordId}` : `/app/records?kind=${task.recordType}&record=${task.recordId}`;
 const overdue = task.status === 'open' && Date.parse(task.dueAt) < Date.now();
 return <article id={`sales-task-${task.id}`} tabIndex={-1} className={`sales-task${highlighted ? ' sales-task--highlighted' : ''}`} aria-labelledby={`sales-task-title-${task.id}`}>
  <header><div><p className="sales-task__tags"><span data-priority={task.priority}>{label(task.priority)} priority</span><span>{label(task.type)}</span><span>{label(task.status)}</span></p><h3 id={`sales-task-title-${task.id}`}>{task.title}</h3></div>
   {task.status === 'open' && <button type="button" className="operator-button" disabled={busy} onClick={() => onStatus(task, 'completed')}>Complete</button>}</header>
  <p><a href={href}>{task.recordLabel}</a> · {task.ownerName ?? 'Unassigned'}</p>
  <p className={overdue ? 'sales-task__overdue' : ''}>{overdue ? 'Overdue · ' : 'Due '}<time dateTime={task.dueAt}>{formatDate(task.dueAt, task.timezone)}</time></p>
  {task.recurrence !== 'none' && <p>Repeats {task.recurrence}. Occurrence {task.occurrence + 1}{task.seriesCancelledAt ? ' · Series cancelled' : ''}.</p>}
  {task.reminderMinutes !== null && <p>In-app reminder {task.reminderMinutes === 0 ? 'at the due time' : `${task.reminderMinutes} minutes before due`}.</p>}
  {task.notes && <p className="sales-task__notes">{task.notes}</p>}
  <p className="sales-tasks__hint">Updated by {task.updatedByName ?? 'Removed operator'} · <time dateTime={task.updatedAt}>{formatDate(task.updatedAt, task.timezone)}</time></p>
  <div className="sales-tasks__actions">{task.status === 'open' && <><button type="button" disabled={busy} onClick={() => onEdit(task)}>Edit, reassign or reschedule</button><button type="button" disabled={busy} onClick={() => onStatus(task, 'cancelled')}>{task.recurrence === 'none' ? 'Cancel task' : 'Cancel recurring series'}</button></>}</div>
  <details ref={details} onToggle={event => {if (event.currentTarget.open && !history) void loadHistory();}}><summary>Task history</summary>{historyError && <p role="alert">{historyError}<button type="button" onClick={() => void loadHistory()}>Reload history</button></p>}{history ? <ol className="sales-task__history">{history.map(entry => <li key={entry.id}><strong>{label(entry.kind)}</strong> · {entry.actorName}<p>Occurred <time dateTime={entry.occurredAt}>{formatDate(entry.occurredAt, task.timezone)}</time></p><p>Recorded <time dateTime={entry.recordedAt}>{formatDate(entry.recordedAt, task.timezone)}</time></p><p>Owner: {entry.ownerName ?? 'Unassigned'}{entry.payload.previousOwnerId !== undefined && entry.payload.previousOwnerId !== entry.payload.ownerId ? ` (previously ${entry.previousOwnerName ?? 'Unassigned'})` : ''}</p><p>Due {formatDate(entry.payload.dueAt, task.timezone)}{entry.payload.previousDueAt && entry.payload.previousDueAt !== entry.payload.dueAt ? ` (previously ${formatDate(entry.payload.previousDueAt, task.timezone)})` : ''}{entry.payload.reason ? ` · ${entry.payload.reason}` : ''}</p></li>)}</ol> : !historyError && <p role="status">Loading task history…</p>}</details>
 </article>;
}
