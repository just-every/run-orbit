import { demoSockets } from '@runeditrun/rer/modules/demo/vite';
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { excludeLocalVariables } from "./vite/exclude-local-variables.ts";
import { archiveOutputGuard } from "@runeditrun/rer/archive-output";
import { localBusinessName } from "./scripts/installer/business-carry.mjs";
import { localBusiness } from "./vite/local-business";
import { docsSite } from "./src/core/features/public/docs/build/plugin.ts";

// Preflight runs before Vite can empty generated output, including direct Vite calls.
import { localState } from "./scripts/local-state.mjs";
const statePath = localState(undefined, process.env.RER_STATE_DIR);

export default defineConfig(async ({ command }) => {
  const businessName = command === "serve" ? await localBusinessName(process.cwd()) : undefined;
  return ({
  plugins: [
    localBusiness(process.cwd()),
    demoSockets(),
    cloudflare({ persistState: { path: statePath }, viteEnvironment: { name: "ssr" },
      config: {
        // `vite dev` alone loads the local-only dev identity entry; builds keep the deployed main.
        ...(command === "serve" ? { main: "src/dev/server.ts" } : {}),
        vars: {
          ...(businessName ? { WORKSPACE_NAME: businessName } : {}),
          ...(process.env.RER_DEMO ? { RER_DEMO: process.env.RER_DEMO, RER_DEMO_EXPIRES: process.env.RER_DEMO_EXPIRES } : {}),
          // rer dev serves the requested loopback origin without rewriting private settings.
          ...(process.env.RER_DEV_ORIGIN ? { RER_DEV_ORIGIN: process.env.RER_DEV_ORIGIN } : {}),
          // Only `vite dev` receives the checkout's dev key, which gates dev identity.
          ...(command === "serve" && process.env.RER_DEV_KEY ? { RER_DEV_KEY: process.env.RER_DEV_KEY, RER_DEV_IDENTITY: process.env.RER_DEV_IDENTITY ?? "on" } : {}),
        },
      } }),
    docsSite(), tanstackStart(), react(), tailwindcss(), excludeLocalVariables(),
    // A build refuses output holding an installation archive, even one copied from public/.
    archiveOutputGuard(),
  ],
  server: {
    host: "127.0.0.1",
    port: Number(process.env.PORT ?? 4184),
    strictPort: true,
    fs: {
      strict: true,
      // Base operator-auth runs in the Worker from the exactly pinned rer package.
      allow: ['src', 'public', 'node_modules', 'deploy-site.json', 'node_modules/@runeditrun/rer/modules'],
      deny: ['**/.rer/**', '**/.seed/**', '**/exports/**', '**/*.rer'],
    },
  }
});
});
