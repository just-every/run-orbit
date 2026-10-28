import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from "@tanstack/react-router";
import { DraftPage } from "../core/features/operator/ui/draft-page";
import { operatorDetailErrors, requireDetailId } from './-operator-detail';
export const Route = createFileRoute("/app/drafts/$id")({
  beforeLoad: ({ params }) => requireDetailId(params.id, 'draft'),
  ...operatorDetailErrors('draft'),
  component: editorLeaf(DraftPage),
});
