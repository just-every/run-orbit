import { editorLeaf } from "../editor/leaf";
import {createFileRoute} from '@tanstack/react-router';
import {NotificationsPage} from '../core/features/operator/ui/notifications-page';
export const Route=createFileRoute('/app/notifications')({component: editorLeaf(NotificationsPage)});
