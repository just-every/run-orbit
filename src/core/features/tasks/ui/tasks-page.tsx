import {useEffect, useState} from 'react';
import {Outlet, useNavigate, useParams} from '@tanstack/react-router';
import {FilterButton, FilterChips, FilterPanel, useFilterPanel, type FilterField} from '../../operator/ui/filter-panel';
import {useOperatorDialog} from '../../operator/ui/operator-dialog';
import {OperatorShell, OperatorState} from '../../operator/ui/operator-shell';
import '../../operator/ui/records.css';
import '../../operator/ui/sales-tasks.css';
import type {SalesTask, TaskInput, TaskList, TaskStatus} from '../contracts';
import {listSalesTasks, readSalesTask, saveSalesTask, taskContent} from './api';
import {TaskCalendar} from './calendar';
import {TaskRow} from './task-card';
import {SalesTaskForm} from './task-form';
import {TaskOpen} from './task-open';

type View = 'today' | 'overdue' | 'all' | 'calendar';
const views: [View, string][] = [['today', 'Today'], ['overdue', 'Overdue'], ['all', 'All tasks'], ['calendar', 'Calendar']];
const empty: Record<View, string> = {today: 'Nothing due today.', overdue: 'Nothing overdue.', all: 'No tasks yet.', calendar: 'Nothing due on this date.'};
const validId = (id?: string) => id && /^[0-9A-HJKMNP-TV-Z]{26}$/.test(id) ? id : undefined;

/** Tasks: the operator's sales tasks as rows under the view pills, the owner behind Filter. A chosen task opens in place
 * at /app/tasks/<id>; this page stays mounted while it opens and closes, so the list never reloads from scratch. */
export function TasksPage() {
 const params = useParams({strict: false}) as {id?: string}, openId = validId(params.id), navigate = useNavigate();
 const [data, setData] = useState<TaskList | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
 const [view, setView] = useState<View>('today'), [owner, setOwner] = useState(''), [date, setDate] = useState(''), [offset, setOffset] = useState(0), [refresh, setRefresh] = useState(0);
 const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [creating, setCreating] = useState(false);
 const [linked, setLinked] = useState<SalesTask | null>(null), [missing, setMissing] = useState(false);
 const dialog = useOperatorDialog(), panel = useFilterPanel();
 useEffect(() => {
  const controller = new AbortController(), query = new URLSearchParams({view: view === 'calendar' ? 'all' : view, offset: String(offset)});
  if (owner) query.set('owner', owner);
  if (view === 'calendar' && date) query.set('date', date);
  setLoading(true); setError('');
  void listSalesTasks(query, controller.signal).then(next => {setData(next); setDate(old => old || next.today); setLoading(false);}).catch(reason => {if (!controller.signal.aborted) {setError((reason as Error).message); setLoading(false);}});
  return () => controller.abort();
 }, [view, owner, date, offset, refresh]);
 // With no task at all, the New task form opens rather than an empty list (U5).
 useEffect(() => {
  if (!data || data.tasks.length || offset || view !== 'today' || owner || openId) return;
  const controller = new AbortController();
  void listSalesTasks(new URLSearchParams({view: 'all', owner: 'all', offset: '0'}), controller.signal).then(all => {if (!all.tasks.length) setCreating(true);}).catch(() => {});
  return () => controller.abort();
 }, [data === null]);
 // A task opened from a link that is not in the current view still opens, above the list.
 const listed = data?.tasks.find(task => task.id === openId);
 useEffect(() => {
  setMissing(false);
  if (!openId || listed) {setLinked(null); return;}
  let active = true;
  void readSalesTask(openId).then(result => {if (active) setLinked(result.task);}).catch(() => {if (active) setMissing(true);});
  return () => {active = false;};
 }, [openId, Boolean(listed), refresh]);
 const close = () => void navigate({to: '/app/tasks'});
 async function save(input: TaskInput, task?: SalesTask) {
  setBusy(true); setNotice('');
  try {await saveSalesTask(input, task); setCreating(false); setNotice('Task saved.'); setRefresh(value => value + 1); if (task) close();}
  finally {setBusy(false);}
 }
 async function status(task: SalesTask, next: TaskStatus) {
  if (next === 'cancelled' && await dialog.ask({title: task.recurrence === 'none' ? 'Cancel task?' : 'Cancel recurring series?', description: task.recurrence === 'none' ? `Cancel “${task.title}”? Its history remains on the linked record.` : `Cancel “${task.title}” and every open occurrence in its series? Its completed history remains.`, confirmLabel: task.recurrence === 'none' ? 'Cancel task' : 'Cancel series'}) === null) return;
  setBusy(true); setError(''); setNotice('');
  try {await saveSalesTask(taskContent(task), task, next); setNotice(next === 'completed' ? task.recurrence === 'none' ? 'Task completed.' : 'Task completed. The next recurring occurrence is scheduled.' : 'Task cancelled. Future occurrences in this series are stopped.'); setRefresh(value => value + 1); if (task.id === openId) close();}
  catch (reason) {setError((reason as Error).message);}
  finally {setBusy(false);}
 }
 const ownerField: FilterField = {field: 'owner', name: 'Task owner', all: 'My tasks', options: [{id: 'all', name: 'Everyone'}, {id: 'unassigned', name: 'Unassigned'}, ...(data?.operators ?? []).map(operator => ({id: operator.id, name: operator.displayName}))]};
 const changeOwner = (_: string, value: string) => {setOwner(value); setOffset(0);};
 const opened = (task: SalesTask) => data ? <TaskOpen task={task} data={data} busy={busy || loading} onSave={input => save(input, task)} onCancelTask={task => void status(task, 'cancelled')} onClose={close}/> : null;
 const row = (task: SalesTask) => <TaskRow key={task.id} task={task} busy={busy || loading} opened={task.id === openId} timeOnly={view === 'today' || view === 'calendar'} onComplete={task => void status(task, 'completed')}>{task.id === openId ? opened(task) : null}</TaskRow>;
 return <OperatorShell title="Tasks" action={<button type="button" className="operator-button" disabled={!data} onClick={() => setCreating(true)}>New task</button>}>
  <section className="tasks-page" aria-label="Tasks" data-testid="sales-tasks">
   <div className="tasks-page__bar">
    <div className="records-tabs tasks-page__views" role="group" aria-label="Task view">{views.map(([value, name]) => <button type="button" key={value} aria-pressed={view === value} onClick={() => {setView(value); setOffset(0);}}>{name}</button>)}</div>
    <FilterButton panel={panel} applied={owner ? 1 : 0}/>
   </div>
   <FilterPanel panel={panel} fields={[ownerField]} values={{owner}} onChange={changeOwner}/>
   <FilterChips fields={[ownerField]} values={{owner}} onChange={changeOwner}/>
   {error && <OperatorState kind="error">{error}</OperatorState>}{notice && <p className="tasks-page__notice" role="status">{notice}</p>}
   {creating && data && <SalesTaskForm key="new" data={data} busy={busy} onSave={input => save(input)} onCancel={() => setCreating(false)}/>}
   {missing && <OperatorState kind="error">Not found: that task does not exist or was deleted.</OperatorState>}
   {linked && <ul className="tasks-page__rows tasks-page__linked" aria-label="Opened task">{row(linked)}</ul>}
   <div className={`tasks-page__body${view === 'calendar' ? ' tasks-page__body--calendar' : ''}`}>
    {view === 'calendar' && data && <TaskCalendar date={date || data.today} onDate={value => {setDate(value); setOffset(0);}}/>}
    <div className="operator-surface tasks-page__list" aria-busy={loading}>
     {data && !error && (data.tasks.length ? <ul className="tasks-page__rows">{data.tasks.map(row)}</ul> : !loading && <div className="tasks-page__empty"><p>{empty[view]}</p>{!creating && <button type="button" onClick={() => setCreating(true)}>New task</button>}</div>)}
     {!data && loading && <p role="status">Loading tasks…</p>}
    </div>
   </div>
   {data && (data.more || offset > 0) && <nav className="tasks-page__pages" aria-label="Task pages"><button type="button" disabled={offset === 0 || loading} onClick={() => setOffset(value => Math.max(0, value - 100))}>Previous tasks</button><span>Page {Math.floor(offset / 100) + 1}</span><button type="button" disabled={!data.more || loading} onClick={() => setOffset(value => value + 100)}>Next tasks</button></nav>}
   <Outlet/>
  </section>
  {dialog.dialog}
 </OperatorShell>;
}
