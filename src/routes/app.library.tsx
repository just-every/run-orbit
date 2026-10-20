import {createFileRoute} from '@tanstack/react-router';
import {editorLeaf} from '../editor/leaf';
import {LibraryPage} from '../core/features/drafts/ui/library-page';
export const Route=createFileRoute('/app/library')({component:editorLeaf(LibraryPage)});
