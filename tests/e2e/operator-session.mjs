import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const issuerPath = path.join(workspaceRoot, "tests/support/issue-operator-session.ts");
const tsxCliPath = path.join(workspaceRoot, "node_modules/tsx/dist/cli.mjs");

function issueSession() {
  const output = execFileSync(process.execPath, [tsxCliPath, issuerPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

export async function authenticateOperator(context) {
  const session = issueSession();
  await context.setExtraHTTPHeaders({ Cookie: `${session.cookieName}=${session.token}` });
  return session;
}
