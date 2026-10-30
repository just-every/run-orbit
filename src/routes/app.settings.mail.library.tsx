import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {LibraryPage} from '../core/features/drafts/ui/library-page';
export const Route=createFileRoute('/app/settings/mail/library')({component:editorLeaf(LibraryPage)});
