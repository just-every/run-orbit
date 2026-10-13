import { lstatSync, realpathSync, statSync } from "node:fs";
import { resolve, relative, dirname, basename, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contains = (parent, child) => { const part = relative(parent, child); return part === "" || (part !== ".." && !part.startsWith("../") && !isAbsolute(part)); };
function physical(path) {
  let ancestor = resolve(path); const tail = [];
  for (;;) {
    try { const actual = realpathSync(ancestor); if (tail.length && !statSync(actual).isDirectory()) throw Error("State ancestor must be a directory"); return resolve(actual, ...tail); }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      try { lstatSync(ancestor); throw Error("Unresolved state symlink; files left untouched"); } catch (entryError) { if (entryError.code !== "ENOENT") throw entryError; }
      tail.unshift(basename(ancestor)); const parent = dirname(ancestor); if (parent === ancestor) throw error; ancestor = parent;
    }
  }
}
export function localState(root = projectRoot, requested) {
  if (requested !== undefined && (typeof requested !== "string" || !requested.trim())) throw Error("State path must be nonempty");
  const state = resolve(root, requested ?? ".wrangler/state"), output = resolve(root, "dist");
  for (const [a, b] of [[state, output], [physical(state), physical(output)]]) {
    if (contains(a, b) || contains(b, a)) throw Error("Local state and disposable dist output overlap; files left untouched");
  }
  const legacy = resolve(root, "dist/server/.wrangler/state");
  try { lstatSync(legacy); } catch (error) { if (error.code === "ENOENT") return state; throw error; }
  throw Error("Legacy preview state exists in dist/server/.wrangler/state. Refusing before build or opening another store. Explicitly recover it outside dist; no automatic migration performed.");
}
