import {createFileRoute} from '@tanstack/react-router';
import {TasksPage} from '../core/features/tasks/ui/tasks-page';
/** The task list stays mounted while a task opens in place at /app/tasks/<id> and closes again. */
export const Route=createFileRoute('/app/tasks')({component:TasksPage});
