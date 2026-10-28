import {readdirSync} from 'node:fs';

export function discoverTests(directory) {
  return readdirSync(directory, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? discoverTests(file) : /\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name) ? [file] : [];
  });
}
