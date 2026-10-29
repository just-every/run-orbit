import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from "@tanstack/react-router";
import { ContactRecordPage } from "../core/features/operator/ui/record-detail-page";
import { operatorDetailErrors, requireDetailId } from './-operator-detail';
export const Route = createFileRoute("/app/contacts/$id")({
  beforeLoad: ({ params }) => requireDetailId(params.id, 'contact'),
  ...operatorDetailErrors('contact'),
  component: editorLeaf(ContactRecordPage),
});
