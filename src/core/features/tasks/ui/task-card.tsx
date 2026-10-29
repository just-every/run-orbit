import {useId} from 'react';
import {Link} from '@tanstack/react-router';
import {ActionTooltip} from '../../operator/ui/action-tooltip';
import {formatDate, formatTime, label, workspaceTimeZone, zoneLabel} from '../../operator/ui/formatters';
import type {SalesTask} from '../contracts';

export const recordHref = (task: SalesTask) => task.recordType === 'opportunity' ? `/app/opportunities/${task.recordId}` : `/app/records?kind=${task.recordType}&record=${task.recordId}`;
/** A task's time in its own zone, named only when that zone is not the workspace's. */
export const taskTime = (task: SalesTask, value: string, timeOnly = false) => `${timeOnly ? formatTime(value, task.timezone) : formatDate(value, task.timezone)}${task.timezone !== workspaceTimeZone() ? ` (${zoneLabel(task.timezone)})` : ''}`;

/** One task in the list: Complete, the title (which opens the task in place), one quiet line and the due time. Priority
 * shows only when it is high or urgent, and Overdue only when it is. */
export function TaskRow({task, busy, opened, timeOnly, onComplete, children}: {task: SalesTask; busy: boolean; opened: boolean; timeOnly: boolean; onComplete: (task: SalesTask) => void; children?: React.ReactNode}) {
 const titleId = useId();
 const overdue = task.status === 'open' && Date.parse(task.dueAt) < Date.now();
 return <li className={`task-row-item${opened ? ' task-row-item--opened' : ''}`}><div className="task-row" role="group" aria-labelledby={titleId}>
  {task.status === 'open' ? <ActionTooltip label="Complete task"><button type="button" className="task-row__complete" disabled={busy} onClick={() => onComplete(task)}><span aria-hidden="true"/></button></ActionTooltip> : <span className={`task-row__state task-row__state--${task.status}`} aria-hidden="true"/>}
  <div className="task-row__main">
   <h3 id={titleId}><Link to="/app/tasks/$id" params={{id: task.id}} aria-current={opened ? 'page' : undefined}>{task.title}</Link></h3>
   <p><a href={recordHref(task)}>{task.recordLabel}</a> · {label(task.type)}{task.status !== 'open' ? ` · ${label(task.status)}` : ''}</p>
  </div>
  <div className="task-row__when">
   {task.priority === 'high' || task.priority === 'urgent' ? <span className="task-row__priority">{label(task.priority)}</span> : null}
   {overdue ? <span className="task-row__overdue">Overdue</span> : null}
   <time dateTime={task.dueAt}>{taskTime(task, task.dueAt, timeOnly && !overdue)}</time>
  </div>
 </div>{children}</li>;
}
