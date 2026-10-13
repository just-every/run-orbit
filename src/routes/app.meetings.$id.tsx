import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from "@tanstack/react-router";
import { MeetingPlanPage } from "../core/features/operator/ui/meeting-plan-page";
export const Route = createFileRoute("/app/meetings/$id")({ component: editorLeaf(MeetingPlanPage) });
