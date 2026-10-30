import { join } from 'node:path';
import type { Plugin } from 'vite';
import { localBusinessName } from '../scripts/installer/business-carry.mjs';

/** Only the dev Worker receives the validated name, never the carry document. */
export function localBusiness(root: string): Plugin {
  const id = '\0virtual:orbit-local-business';
  const path = join(root, '.rer/local/business.json');
  return {
    name: 'orbit:local-business',
    apply: 'serve',
    resolveId(source) { if (source === 'virtual:orbit-local-business') return id; },
    async load(source) {
      if (source !== id) return;
      this.addWatchFile(path);
      return `export default ${JSON.stringify(await localBusinessName(root)) ?? 'undefined'};`;
    },
    configureServer(server) { server.watcher.add(path); },
    hotUpdate({ file, modules }) {
      if (file !== path) return;
      const module = this.environment.moduleGraph.getModuleById(id);
      return module ? [...modules, module] : modules;
    },
  };
}
