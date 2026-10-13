import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const coreRoot = path.join(workspaceRoot, "src", "core");
const allowedExtensionMounts = new Set([
  "src/core/app/mounts/assistance.ts",
  "src/core/app/mounts/public-config.ts",
  "src/core/app/mounts/public-config.server.ts",
  // Typed policies documented in RECORD-POLICIES.md.
  "src/core/features/records/identity.ts",
  "src/core/features/records/repository.ts",
  "src/core/features/settings/repository.ts",
  "src/core/features/workbench/repository.ts"
]);

const files = await listSourceFiles(coreRoot);
const violations = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  const relative = path.relative(workspaceRoot, file).replaceAll(path.sep, "/");

  if (/from\s+["'][^"']*\/ext\//.test(content) && !allowedExtensionMounts.has(relative)) {
    violations.push(`${relative} imports buyer extension code outside an approved mount.`);
  }

  if (content.includes('from "drizzle-orm/d1"') && !relative.endsWith("/repository.ts") && !relative.endsWith("-repository.ts")) {
    violations.push(`${relative} imports the D1 client outside a repository.`);
  }
}

// OUT-001: nothing reachable from mail and calendar capture may create a draft, approve or send.
// Follow every relative import from the capture feature and refuse a path to the send modules.
const sendModules = ["src/core/features/outreach/service.ts", "src/core/features/outreach/approval-repository.ts", "src/core/features/workbench/outreach-repository.ts", "src/core/platform/outbound-mail.ts", "src/core/features/drafts/repository.ts", "src/core/features/drafts/service.ts", "src/core/features/assistance/provider.ts"];
const captureRoot = path.join(coreRoot, "features", "capture");
const reached = new Map();
const queue = files.filter(file => file.startsWith(captureRoot + path.sep)).map(file => [file, null]);
while (queue.length) {
  const [file, parent] = queue.shift();
  const relative = path.relative(workspaceRoot, file).replaceAll(path.sep, "/");
  if (reached.has(relative)) continue;
  reached.set(relative, parent);
  for (const match of (await readFile(file, "utf8")).matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)) {
    const base = path.resolve(path.dirname(file), match[1]);
    const target = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find(candidate => files.includes(candidate));
    if (target) queue.push([target, relative]);
  }
}
for (const module of sendModules) if (reached.has(module)) {
  const chain = [module];
  while (reached.get(chain[0])) chain.unshift(reached.get(chain[0]));
  violations.push(`Mail and calendar capture can reach a send path (OUT-001): ${chain.join(" -> ")}`);
}

if (violations.length > 0) {
  throw new Error(`Boundary check failed:\n${violations.join("\n")}`);
}

console.log(`Boundary check passed for ${files.length} core source files.`);

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listSourceFiles(entryPath);
      return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") ? [entryPath] : [];
    })
  );
  return nested.flat();
}
