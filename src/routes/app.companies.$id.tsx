import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from "@tanstack/react-router";
import { CompanyRecordPage } from "../core/features/operator/ui/record/customer-record";
import { operatorDetailErrors, requireDetailId } from './-operator-detail';
export const Route = createFileRoute("/app/companies/$id")({
  beforeLoad: ({ params }) => requireDetailId(params.id, 'company'),
  ...operatorDetailErrors('company'),
  component: editorLeaf(CompanyRecordPage),
});
