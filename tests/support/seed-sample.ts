import { getPlatformProxy } from "wrangler";

import { createTestDependencies } from "./test-dependencies";
import { testState } from "./test-state";

const platform = await getPlatformProxy<{ DB: D1Database }>({
  configPath: "wrangler.jsonc", envFiles:["tests/support/no-local-settings.env"],
  persist: { path: `${testState()}/v3` },
  remoteBindings: false
});

try {
  const result = await createTestDependencies(platform.env.DB).sampleData.seed();
  console.log(`${result.applied ? "Seeded" : "Confirmed"} Orbit sample data ${result.version} through feature services.`);
} finally {
  await platform.dispose();
}
