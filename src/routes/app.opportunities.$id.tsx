import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from "@tanstack/react-router";
import { OpportunityPage } from "../core/features/operator/ui/opportunity-page";
import { operatorDetailErrors, requireDetailId } from './-operator-detail';
export const Route = createFileRoute("/app/opportunities/$id")({
  beforeLoad: ({ params }) => requireDetailId(params.id, 'opportunity'),
  ...operatorDetailErrors('opportunity'),
  component: editorLeaf(OpportunityPage),
});
