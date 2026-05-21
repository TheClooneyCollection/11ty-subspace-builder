import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { ensureSiteBuilt, walkSiteHtml } from '../helpers/build-once.js';
import { parseFile, selectAll } from '../helpers/parse.js';

// Walk every built HTML file in _site/ and confirm none contain leftover
// Nunjucks/Liquid template syntax. We use the DOM and ignore `<code>`, `<pre>`,
// `<script>`, and `<style>` content — those legitimately quote template syntax
// (e.g. blog posts about Eleventy shortcodes).

const UNRESOLVED_INTERPOLATION = /\{\{[^}]{1,200}\}\}/;
const UNRESOLVED_TAG = /\{%[^%]{1,200}%\}/;

const SITE_DIR = path.resolve('_site');

const stripIgnoredNodes = (root) => {
  for (const sel of ['code', 'pre', 'script', 'style']) {
    for (const node of Array.from(root.querySelectorAll(sel))) {
      node.remove();
    }
  }
};

describe('contract — no unresolved templates in _site/', () => {
  beforeAll(async () => {
    await ensureSiteBuilt();
  });

  it('no built HTML page contains literal {{ ... }} or {% ... %} outside of code blocks', () => {
    const offenders = [];
    for (const { absolutePath, relativePath } of walkSiteHtml()) {
      const relativeUnderSite = path.relative(SITE_DIR, absolutePath);
      const { document } = parseFile(relativeUnderSite);
      // Clone-by-removal is fine here — we don't persist the document.
      stripIgnoredNodes(document);
      const text = document.body ? document.body.textContent : '';
      // Also check attributes for template leftovers (e.g. unresolved
      // `href="{{ url }}"`). We do this on the live tree before stripping
      // any code content, but on a fresh parse to keep attribute strings
      // intact.
      const { document: attrDoc } = parseFile(relativeUnderSite);
      const attrSamples = [];
      for (const el of selectAll(attrDoc, '*')) {
        for (const attr of Array.from(el.attributes || [])) {
          attrSamples.push(attr.value);
        }
      }

      const candidates = [text, ...attrSamples];
      let match = null;
      let where = '';
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        if (!c) continue;
        const m = c.match(UNRESOLVED_INTERPOLATION) || c.match(UNRESOLVED_TAG);
        if (m) {
          match = m;
          where = i === 0 ? 'text' : 'attribute';
          break;
        }
      }
      if (match) {
        const source = where === 'text' ? text : attrSamples.join(' ');
        const idx = source.indexOf(match[0]);
        const snippet = source.slice(
          Math.max(0, idx - 40),
          Math.min(source.length, idx + 80),
        );
        offenders.push(`${relativePath} (${where}): ...${snippet}...`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
