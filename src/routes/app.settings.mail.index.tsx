import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {MailArea} from '../core/features/operator/ui/settings/mail';
export const Route=createFileRoute('/app/settings/mail/')({component:editorLeaf(MailArea)});
