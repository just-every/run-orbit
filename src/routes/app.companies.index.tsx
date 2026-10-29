import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from "@tanstack/react-router";
import { CompaniesList } from "../core/features/operator/ui/records-page";
import { recordsSearch } from "../core/features/operator/ui/records-query";
export const Route = createFileRoute("/app/companies/")({
  validateSearch: recordsSearch,
  component: editorLeaf(CompaniesList),
});
