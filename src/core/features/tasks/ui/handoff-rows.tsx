import type {ListedHandoff} from '../contracts';
import {formatDate, formatTime, label} from '../../operator/ui/formatters';

/** Hand-off tasks (a meeting plan's next actions) assigned to the chosen owner. Each opens on its deal, where it is completed. */
export function HandoffRows({handoffs, timeOnly}: {handoffs: ListedHandoff[]; timeOnly: boolean}) {
 return <section aria-label="Hand-off tasks"><h3>Hand-off tasks</h3>
  <ul className="tasks-page__rows">{handoffs.map(task => <li className="task-row-item" key={task.id}><div className="task-row">
   <div className="task-row__main">
    <h3><a href={`/app/opportunities/${task.opportunityId}#handoff-${task.id}`}>{task.title}</a></h3>
    <p><a href={`/app/opportunities/${task.opportunityId}`}>{task.opportunityTitle}</a> · Next action{task.status !== 'open' ? ` · ${label(task.status)}` : ''}</p>
   </div>
   {task.dueAt && <div className="task-row__when"><time dateTime={task.dueAt}>{timeOnly ? formatTime(task.dueAt) : formatDate(task.dueAt)}</time></div>}
  </div></li>)}</ul>
 </section>;
}
