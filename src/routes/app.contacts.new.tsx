import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from "@tanstack/react-router";
import { NewContactPage } from "../core/features/operator/ui/record-create";
export const Route = createFileRoute("/app/contacts/new")({ component: editorLeaf(NewContactPage) });
