import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from "@tanstack/react-router";
import { ContactsList } from "../core/features/operator/ui/records-page";
import { recordsSearch } from "../core/features/operator/ui/records-query";
export const Route = createFileRoute("/app/contacts/")({
  validateSearch: recordsSearch,
  component: editorLeaf(ContactsList),
});
