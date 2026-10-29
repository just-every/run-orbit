import { useId, useState } from 'react';
import { RecordSelection } from '../../operator/ui/record-selection';
import { taskInstant, taskLocalInput } from '../time';
import type { SalesTask, TaskInput, TaskList, TaskRecordType } from '../contracts';
export function SalesTaskForm({task, data, busy, onSave, onCancel}: {
 task?: SalesTask; data: TaskList; busy: boolean; onSave: (input: TaskInput) => Promise<void>; onCancel: () => void;
}) {
 const [kind, setKind] = useState<TaskRecordType>(task?.recordType ?? 'opportunity');
 const [timezone, setTimezone] = useState(task?.timezone ?? data.timezone);
 const [due, setDue] = useState(task ? taskLocalInput(task.dueAt, task.timezone).slice(0, 16) : '');
 const [reminder, setReminder] = useState(task?.reminderMinutes != null);
 const [error, setError] = useState(''), zoneId = useId();
 async function submit(form: HTMLFormElement) {
  setError('');
  try {
   const values = new FormData(form);
   const dueAt = task && timezone === task.timezone && due === taskLocalInput(task.dueAt, timezone).slice(0, 16) ? task.dueAt : taskInstant(due, timezone);
   if (taskLocalInput(dueAt, timezone).slice(0, 16) !== due) throw new Error('That local time falls in a daylight-saving gap. Choose an existing time.');
   await onSave({title: String(values.get('title')), recordType: kind, recordId: task?.recordId ?? String(values.get('recordId')),
    ownerId: String(values.get('ownerId')) || null, dueAt, timezone,
    priority: values.get('priority') as TaskInput['priority'], type: values.get('type') as TaskInput['type'], notes: String(values.get('notes')),
    recurrence: values.get('recurrence') as TaskInput['recurrence'], reminderMinutes: reminder ? Number(values.get('reminderMinutes')) : null});
  } catch (reason) {setError(reason instanceof Error ? reason.message : 'The task could not be saved.');}
 }
 return <form className="sales-task-form" aria-label={task ? `Edit task ${task.title}` : 'New task'} onSubmit={event => {event.preventDefault(); void submit(event.currentTarget);}}>
  <h3>{task ? 'Edit task' : 'New task'}</h3>
  {error && <p role="alert">{error}</p>}
  <fieldset disabled={busy}>
   <label>Title<input name="title" required maxLength={300} defaultValue={task?.title ?? ''}/></label>
   {task ? <p>Linked {task.recordType}: <strong>{task.recordLabel}</strong></p> : <><label>Link to<select value={kind} onChange={event => setKind(event.target.value as TaskRecordType)}><option value="opportunity">Opportunity</option><option value="contact">Contact</option><option value="company">Company</option></select></label><RecordSelection key={kind} kind={kind} name="recordId"/></>}
   <div className="sales-tasks__fields"><label>Owner<select name="ownerId" defaultValue={task ? task.ownerId ?? '' : data.actorId}><option value="">Unassigned</option>{data.operators.map(operator => <option key={operator.id} value={operator.id}>{operator.displayName}</option>)}</select></label>
    <label>Priority<select name="priority" defaultValue={task?.priority ?? 'normal'}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
    <label>Type<select name="type" defaultValue={task?.type ?? 'follow_up'}><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="follow_up">Follow-up</option><option value="other">Other</option></select></label>
    <label>Due date and time<input name="dueAt" type="datetime-local" required value={due} onChange={event => setDue(event.target.value)}/></label>
    <label>Timezone<input name="timezone" required list={zoneId} value={timezone} onChange={event => setTimezone(event.target.value)}/><datalist id={zoneId}>{[...new Set([data.timezone, 'America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix','America/Anchorage','Pacific/Honolulu','UTC'])].map(zone => <option key={zone} value={zone}/>)}</datalist></label>
    <label>Repeat<select name="recurrence" defaultValue={task?.recurrence ?? 'none'}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
   </div>
   <p className="sales-tasks__hint">Times use the selected timezone. Repeats keep the local clock time across daylight saving. A missing clock time shifts forward for that occurrence; a repeated clock time uses its earlier occurrence.</p>
   <label>Notes<textarea name="notes" maxLength={20000} rows={4} defaultValue={task?.notes ?? ''}/></label>
   <label className="sales-tasks__check"><input type="checkbox" checked={reminder} onChange={event => setReminder(event.target.checked)}/>In-app reminder</label>
   {reminder && <label>Minutes before due time<input name="reminderMinutes" type="number" min={0} max={10080} step={1} required defaultValue={task?.reminderMinutes ?? 15}/></label>}
   <p className="sales-tasks__hint">Reminders appear in Notifications. Email, push and Slack reminders are not configured here.</p>
  </fieldset>
  <div className="sales-tasks__actions"><button type="submit" className="operator-button" disabled={busy}>{busy ? 'Saving…' : 'Save task'}</button><button type="button" disabled={busy} onClick={onCancel}>Cancel editing</button></div>
 </form>;
}
