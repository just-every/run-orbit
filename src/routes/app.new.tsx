import { editorLeaf } from "../editor/leaf";
import {createFileRoute} from "@tanstack/react-router";
import {CreateOpportunityPage} from "../core/features/operator/ui/create-opportunity-page";
export const Route=createFileRoute("/app/new")({component: editorLeaf(CreateOpportunityPage)});
