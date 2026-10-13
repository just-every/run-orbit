import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { excludeLocalVariables } from "./vite/exclude-local-variables.ts";
import { archiveOutputGuard } from "./scripts/base-onboarding/archive-output.mjs";
import { docsSite } from "./src/core/features/public/docs/build/plugin.ts";

// Preflight runs before Vite can empty generated output, including direct Vite calls.
import { localState } from "./scripts/local-state.mjs";
const statePath = localState();

export default defineConfig(({ command }) => ({
  plugins: [
    cloudflare({ persistState: { path: statePath }, viteEnvironment: { name: "ssr" },
      config: {
        // `vite dev` alone loads the local-only dev identity entry; builds keep the deployed main.
        ...(command === "serve" ? { main: "src/dev/server.ts" } : {}),
        vars: {
          // rer dev serves the requested loopback origin without rewriting private settings.
          ...(process.env.RER_DEV_ORIGIN ? { RER_DEV_ORIGIN: process.env.RER_DEV_ORIGIN } : {}),
          // Only `vite dev` receives the checkout's dev key, which gates dev identity and the outbox.
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
      // Base operator-auth runs in the Worker from its byte-exact copy under scripts/base-cli/modules.
      allow: ['src', 'public', 'node_modules', 'scripts/base-cli/modules'],
      deny: ['**/.rer/**', '**/.seed/**', '**/exports/**', '**/*.rer'],
    },
  }
}));
