import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from "@tanstack/react-router";
import { NewCompanyPage } from "../core/features/operator/ui/record-create";
export const Route = createFileRoute("/app/companies/new")({ component: editorLeaf(NewCompanyPage) });
