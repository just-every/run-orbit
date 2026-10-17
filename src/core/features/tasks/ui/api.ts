import type { SalesTask, TaskHistory, TaskInput, TaskList, TaskStatus } from '../contracts';
export async function taskRequest<T>(path = '', init?: RequestInit): Promise<T> {
 const response = await fetch(`/api/v1/tasks${path}`, {...init, credentials: 'same-origin', headers: {'content-type': 'application/json', ...init?.headers}});
 const data = await response.json() as T & {error?: string};
 if (!response.ok) throw new Error(data.error ?? 'Tasks could not be loaded.');
 return data;
}
export function taskContent(task: SalesTask): TaskInput {
 return {title: task.title, recordType: task.recordType, recordId: task.recordId, ownerId: task.ownerId,
 dueAt: task.dueAt, priority: task.priority, type: task.type, notes: task.notes,
 recurrence: task.recurrence, timezone: task.timezone, reminderMinutes: task.reminderMinutes};
}
export const listSalesTasks = (query: URLSearchParams, signal?: AbortSignal) => taskRequest<TaskList>(`?${query}`, {signal});
export const readSalesTask = (id: string) => taskRequest<{task: SalesTask; history: TaskHistory[]}>(`/${id}`);
export const saveSalesTask = (content: TaskInput, task?: SalesTask, status: TaskStatus = 'open') => taskRequest<{id: string; revision: string}>(task ? `/${task.id}` : '', {
 method: task ? 'PUT' : 'POST', body: JSON.stringify({...content, ...(task ? {revision: task.revision, status} : {})})
});
