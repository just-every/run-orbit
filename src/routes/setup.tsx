import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from '@tanstack/react-router';
import { loadSetup } from '../core/features/setup/loader';
import { SetupPage } from '../core/features/setup/ui/setup-page';

export const Route = createFileRoute('/setup')({
  validateSearch: (search: Record<string, unknown>): { error?: string } => ({ error: typeof search.error === 'string' ? search.error.slice(0, 300) : undefined }),
  loader: () => loadSetup(),
  component: editorLeaf(SetupRoute),
});

function SetupRoute() {
  const view = Route.useLoaderData();
  const { error } = Route.useSearch();
  return <SetupPage view={{ ...view, error }} />;
}
