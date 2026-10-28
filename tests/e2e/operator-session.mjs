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

const issued = new WeakMap();

export async function authenticateOperator(context) {
  if (issued.has(context)) return issued.get(context);
  const session = issueSession();
  await context.setExtraHTTPHeaders({ Cookie: `${session.cookieName}=${session.token}` });
  // Browser navigations after a native form redirect use the cookie jar, not
  // Playwright's injected request header. Match the native session attributes.
  await context.addCookies([{ name: session.cookieName, value: session.token,
    url: `https://127.0.0.1:${process.env.ORBIT_BROWSER_PORT ?? 8722}`,
    secure: true, httpOnly: true, sameSite: 'Lax', expires: Date.parse(session.expiresAt) / 1000 }]);
  issued.set(context, session);
  return session;
}
