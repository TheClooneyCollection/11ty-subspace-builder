import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

const me = yaml.load(
  fs.readFileSync(path.resolve('_data/me.yaml'), 'utf8'),
);

describe('contract — /about/', () => {
  beforeAll(async () => {
    await ensureSiteBuilt();
  });

  it('page renders with no unresolved template syntax', () => {
    const { document } = parsePage('/about/');
    const body = document.body;
    expect(body).toBeTruthy();
    const html = body.innerHTML;
    expect(html).not.toMatch(/\{\{[^}]*\}\}/);
    expect(html).not.toMatch(/\{%[^%]*%\}/);
  });

  it('renders profile name from me.yaml', () => {
    if (!me.profile?.name) return;
    const { document } = parsePage('/about/');
    expect(document.body.textContent).toContain(me.profile.name);
  });

  it('renders intro paragraphs from me.yaml', () => {
    const paragraphs = me.intro?.paragraphs || [];
    if (!paragraphs.length) return;
    const { document } = parsePage('/about/');
    const text = document.body.textContent;
    // Use first ~40 chars of the first paragraph as a fingerprint to avoid
    // relying on exact whitespace from YAML folded scalars.
    const fingerprint = paragraphs[0].replace(/\s+/g, ' ').trim().slice(0, 40);
    expect(text.replace(/\s+/g, ' ')).toContain(fingerprint);
  });

  it('renders contact links from me.yaml', () => {
    const contacts = me.contacts || [];
    if (!contacts.length) return;
    const { document } = parsePage('/about/');
    const hrefs = selectAll(document, 'a[href]').map((a) =>
      a.getAttribute('href'),
    );
    for (const link of contacts) {
      expect(hrefs, `contact link ${link.label}`).toContain(link.url);
    }
  });

  it('renders the aboutSite heading from me.yaml', () => {
    const heading = me.aboutSite?.heading;
    if (!heading) return;
    const { document } = parsePage('/about/');
    const headings = selectAll(document, 'h1, h2, h3').map((h) => textOf(h));
    expect(headings).toContain(heading);
  });
});
