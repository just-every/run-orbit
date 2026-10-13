import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readManifest } from '../../src/core/features/public/docs/build/manifest.ts';
import { absolutePath, buildSite } from '../../src/core/features/public/docs/build/site.ts';

// DOCS-001. /docs is built from the repository's Markdown through docs/site.json (src/core/features/public/docs/build).
// These run the same modules the Vite plugin runs, so a page that would fail the build fails here first.
const root = fileURLToPath(new URL('../..', import.meta.url));

test('DOCS-001 every Markdown file at the root or under docs/ is published or kept on GitHub with a reason', () => {
  const manifest = readManifest(root);
  assert.equal(manifest.pages[0]?.slug, '', 'the docs home leads');
  for (const entry of manifest.githubOnly) assert.ok(entry.reason.length > 10, `${entry.source} says why it stays on GitHub`);
  const listed = new Set([...manifest.pages, ...manifest.githubOnly].map((entry) => entry.source));
  const inScope = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.md'], { cwd: root, encoding: 'utf8' })
    .split('\n').filter((file) => /^([^/]+\.md|docs\/.+\.md)$/.test(file));
  assert.deepEqual(inScope.filter((file) => !listed.has(file)), [], 'add each new Markdown file to docs/site.json');
});

test('DOCS-001 every published page builds with one title, unique ids and only resolvable links', () => {
  const site = buildSite(root);
  assert.deepEqual(site.problems, []);
  const published = new Map(site.pages.map((page) => [page.href, new Set(page.ids)]));
  for (const page of site.pages) {
    const markdown = readFileSync(join(root, page.source), 'utf8');
    assert.equal(page.title, /^# (.+)$/m.exec(markdown)?.[1]?.replace(/`/g, ''), `${page.source} title`);
    assert.doesNotMatch(page.html, /<h1\b/, `${page.source} leaves its one h1 to the page component`);
    assert.equal(new Set(page.ids).size, page.ids.length, `${page.source} heading ids are unique`);
    assert.doesNotMatch(page.html, /\s(style|on[a-z]+)=|<script/i, `${page.source} has no inline style, handler or script`);
    assert.doesNotMatch(page.html, new RegExp(absolutePath.source), `${page.source} names no machine path`);
    for (const [, href] of page.html.matchAll(/<a href="(\/docs[^"]*)"/g)) {
      const [path, hash] = href!.replaceAll('&amp;', '&').split('#');
      assert.ok(published.has(path!), `${page.source}: ${href} is a published page`);
      if (hash) assert.ok(published.get(path!)!.has(decodeURIComponent(hash)), `${page.source}: ${href} names a heading`);
    }
  }
});
