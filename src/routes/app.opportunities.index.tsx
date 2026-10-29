import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from "@tanstack/react-router";
import { OpportunitiesList } from "../core/features/operator/ui/records-page";
import { recordsSearch } from "../core/features/operator/ui/records-query";
export const Route = createFileRoute("/app/opportunities/")({
  validateSearch: recordsSearch,
  component: editorLeaf(OpportunitiesList),
});
