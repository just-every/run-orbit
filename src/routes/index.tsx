import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from "@tanstack/react-router";
import { publicProductConfig } from "../core/app/mounts/public-config";
import { alternativeLine } from "../core/features/public/ui/alternative-line";
import { HomePage } from "../core/features/public/ui/home-page";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: `${publicProductConfig.name} — Your next deal finds you.` }, { name: "description", content: `${publicProductConfig.description} ${alternativeLine}.` }] }),
  component: editorLeaf(HomePage)
});
