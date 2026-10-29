import { useEffect, useState } from 'react';
import type { SalesTask, TaskInput, TaskList, TaskStatus } from '../../tasks/contracts';
import { listSalesTasks, readSalesTask, saveSalesTask, taskContent } from '../../tasks/ui/api';
import { TaskCalendar } from '../../tasks/ui/calendar';
import { SalesTaskCard } from '../../tasks/ui/task-card';
import { SalesTaskForm } from '../../tasks/ui/task-form';
import { useOperatorDialog } from './operator-dialog';
import './sales-tasks.css';
/** Native sales tasks; deliberately independent of delegated onboarding handoffs. */
export function SalesTasks({openId}: {openId?: string}) {
 const [data, setData] = useState<TaskList | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
 const [view, setView] = useState<'today' | 'overdue' | 'all' | 'calendar'>('today'), [owner, setOwner] = useState('mine');
 const [date, setDate] = useState(''), [offset, setOffset] = useState(0), [refresh, setRefresh] = useState(0);
 const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [editor, setEditor] = useState<SalesTask | 'new' | null>(null);
 const [focused, setFocused] = useState<SalesTask | null>(null), [targetId, setTargetId] = useState<string | null>(null);
 const dialog = useOperatorDialog();
 useEffect(() => {
  const controller = new AbortController(), query = new URLSearchParams({view: view === 'calendar' ? 'all' : view, offset: String(offset)});
  if (owner !== 'mine') query.set('owner', owner);
  if (view === 'calendar' && date) query.set('date', date);
  setLoading(true); setError('');
  void listSalesTasks(query, controller.signal).then(next => {setData(next); setDate(old => old || next.today); setLoading(false);}).catch(reason => {if (!controller.signal.aborted) {setError((reason as Error).message); setLoading(false);}});
  return () => controller.abort();
 }, [view, owner, date, offset, refresh]);
 useEffect(() => {
  let active = true;
  const id = openId && /^[0-9A-HJKMNP-TV-Z]{26}$/.test(openId) ? openId : undefined;
  setTargetId(id ?? null);
  if (!id) setFocused(null);
  else void readSalesTask(id).then(result => {if (active) setFocused(result.task);}).catch(reason => {if (active) setError((reason as Error).message);});
  return () => {active = false;};
 }, [openId, refresh]);
 useEffect(() => {
  if (!focused || loading) return;
  const element = document.getElementById(`sales-task-${focused.id}`);
  element?.scrollIntoView({block: 'center'}); element?.focus({preventScroll: true});
 }, [focused, loading]);
 async function save(input: TaskInput) {
  setBusy(true); setNotice('');
  try {await saveSalesTask(input, editor && editor !== 'new' ? editor : undefined); setEditor(null); setNotice('Task saved.'); setRefresh(value => value + 1);}
  finally {setBusy(false);}
 }
 async function status(task: SalesTask, next: TaskStatus) {
  if (next === 'cancelled' && await dialog.ask({title: task.recurrence === 'none' ? 'Cancel task?' : 'Cancel recurring series?', description: task.recurrence === 'none' ? `Cancel “${task.title}”? Its history remains on the linked record.` : `Cancel “${task.title}” and every open occurrence in its series? Its completed history remains.`, confirmLabel: task.recurrence === 'none' ? 'Cancel task' : 'Cancel series'}) === null) return;
  setBusy(true); setError(''); setNotice('');
  try {await saveSalesTask(taskContent(task), task, next); setNotice(next === 'completed' ? task.recurrence === 'none' ? 'Task completed.' : 'Task completed. The next recurring occurrence is scheduled.' : 'Task cancelled. Future occurrences in this series are stopped.'); setRefresh(value => value + 1);}
  catch (reason) {setError((reason as Error).message);}
  finally {setBusy(false);}
 }
 const unavailable = busy || loading;
 function changeView(next: typeof view) {setView(next); setOffset(0); setEditor(null);}
 const card = (task: SalesTask) => <SalesTaskCard key={task.id} task={task} highlighted={task.id === targetId} busy={unavailable} onEdit={setEditor} onStatus={(value, next) => void status(value, next)}/>;
 return <section id="sales-tasks" className="operator-surface sales-tasks" aria-labelledby="sales-tasks-title" data-testid="sales-tasks">
  <header className="sales-tasks__header"><div><p className="operator-eyebrow">Follow-through</p><h2 id="sales-tasks-title">Sales tasks</h2><p>Plan the next call, meeting or follow-up.</p></div><button type="button" className="operator-button" disabled={!data || unavailable} onClick={() => setEditor('new')}>New task</button></header>
  <div className="sales-tasks__toolbar"><div className="sales-tasks__views" aria-label="Task view">{(['today','overdue','all','calendar'] as const).map(value => <button type="button" key={value} aria-pressed={view === value} onClick={() => changeView(value)}>{value === 'today' ? 'Today' : value === 'overdue' ? 'Overdue' : value === 'all' ? 'All tasks' : 'Calendar'}</button>)}</div>
   <label>Task owner<select value={owner} onChange={event => {setOwner(event.target.value); setOffset(0);}}><option value="mine">My tasks</option><option value="all">Everyone</option><option value="unassigned">Unassigned</option>{data?.operators.map(operator => <option key={operator.id} value={operator.id}>{operator.displayName}</option>)}</select></label>
   <button type="button" disabled={unavailable} onClick={() => setRefresh(value => value + 1)}>Reload tasks</button>
  </div>
  {data && <p className="sales-tasks__hint">Daily views and the activity calendar use the workspace time zone set in Settings. Individual due times show their task time zone.</p>}
  {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  {editor && data && <SalesTaskForm key={editor === 'new' ? 'new' : editor.id + editor.revision} task={editor === 'new' ? undefined : editor} data={data} busy={unavailable} onSave={save} onCancel={() => setEditor(null)}/>}
  {focused && !loading && !data?.tasks.some(task => task.id === focused.id) && <div className="sales-tasks__linked"><p>Task opened from a link</p>{card(focused)}</div>}
  <div className={`sales-tasks__body${view === 'calendar' ? ' sales-tasks__body--calendar' : ''}`}>
   {view === 'calendar' && data && <TaskCalendar date={date || data.today} onDate={value => {setDate(value); setOffset(0);}}/>}
   <div className="sales-tasks__list" aria-busy={loading}>{loading ? <p role="status">Loading sales tasks…</p> : data && !error && (data.tasks.length ? data.tasks.map(card) : <p>No {view === 'overdue' ? 'overdue ' : ''}tasks {view === 'calendar' ? 'on this date' : 'in this view'}.</p>)}
    {data && !loading && (data.more || offset > 0) && <nav className="sales-tasks__actions" aria-label="Task pages"><button type="button" disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - 100))}>Previous tasks</button><span>Page {Math.floor(offset / 100) + 1}</span><button type="button" disabled={!data.more} onClick={() => setOffset(value => value + 100)}>Next tasks</button></nav>}
   </div>
  </div>{dialog.dialog}
 </section>;
}
