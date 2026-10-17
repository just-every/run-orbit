export type TaskRecordType = 'contact' | 'company' | 'opportunity';
export type TaskStatus = 'open' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskType = 'call' | 'email' | 'meeting' | 'follow_up' | 'other';
export type TaskRecurrence = 'none' | 'daily' | 'weekly';
export interface TaskInput {
 title: string;
 recordType: TaskRecordType;
 recordId: string;
 ownerId: string | null;
 dueAt: string;
 priority: TaskPriority;
 type: TaskType;
 notes: string;
 recurrence: TaskRecurrence;
 timezone: string;
 reminderMinutes: number | null;
}
export interface SalesTask extends TaskInput {
 id: string;
 seriesId: string;
 occurrence: number;
 status: TaskStatus;
 revision: string;
 assignmentRevision: string;
 reminderRevision: string;
 recurrenceTime: string;
 recordLabel: string;
 ownerName: string | null;
 createdAt: string;
 updatedAt: string;
 updatedByName: string | null;
 seriesCancelledAt: string | null;
}
export interface TaskHistory {
 id: string;
 kind: string;
 occurredAt: string;
 recordedAt: string;
 actorName: string;
 ownerName: string | null;
 previousOwnerName: string | null;
 payload: { title: string; ownerId: string | null; previousOwnerId?: string | null; dueAt: string; previousDueAt?: string; status: TaskStatus; reason?: string };
}
export interface TaskList {
 tasks: SalesTask[];
 operators: { id: string; displayName: string }[];
 timezone: string;
 today: string;
 actorId: string;
 view: 'today' | 'overdue' | 'all';
 date: string | null;
 offset: number;
 more: boolean;
}
export interface TaskRow {
 id: string; series_id: string; occurrence: number; record_type: TaskRecordType;
 contact_id: string | null; company_id: string | null; opportunity_id: string | null;
 title: string; owner_id: string | null; due_at: string; priority: TaskPriority; task_type: TaskType;
 notes: string; recurrence: TaskRecurrence; timezone: string; recurrence_time: string;
 reminder_minutes: number | null; status: TaskStatus; revision: string;
 assignment_revision: string; reminder_revision: string; created_by: string | null; updated_by: string | null;
 created_at: string; updated_at: string;
}
export class TaskError extends Error {
 constructor(readonly status: 400 | 403 | 404 | 409 | 503, message: string) { super(message); }
}
