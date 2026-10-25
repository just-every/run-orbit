import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from "@tanstack/react-router";
import { MeetingPlanPage } from "../core/features/operator/ui/meeting-plan-page";
import { operatorDetailErrors, requireDetailId } from './-operator-detail';
export const Route = createFileRoute("/app/meetings/$id")({
  beforeLoad: ({ params }) => requireDetailId(params.id, 'meeting'),
  ...operatorDetailErrors('meeting'),
  component: editorLeaf(MeetingPlanPage),
});
