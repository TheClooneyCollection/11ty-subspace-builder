import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';
import { normalizeFragment } from '../helpers/normalize-html.js';

const loadTimeline = () =>
  yaml.load(fs.readFileSync(path.resolve('_data/timeline.yaml'), 'utf8'));

describe('tag chip snapshots', () => {
  let tagsDocument;
  let projectsDocument;
  let timelineDocument;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document: tagsDocument } = parsePage('/tags/'));
    ({ document: projectsDocument } = parsePage('/projects/'));
    ({ document: timelineDocument } = parsePage('/timeline/'));
  });

  it('plain tag chip (anchor on /tags/) renders as a pill link', () => {
    const link = selectAll(tagsDocument, 'a[href="/tags/eleventy/"]').find((a) =>
      textOf(a).startsWith('eleventy'),
    );
    expect(link).toBeTruthy();
    // <a> is enclosed in <li class="mr2 mb2">; snapshot the li to lock the chip surface.
    const li = link.closest('li');
    expect(normalizeFragment(li)).toMatchInlineSnapshot(
      `"<li class="mr2 mb2"> <a class="link dim f5 theme-text ba b--black-20 br-pill ph3 pv1 dib fw5" href="/tags/eleventy/"> eleventy </a> </li>"`,
    );
  });

  it('featured tag chip (timeline featuredTags) renders with count appended', () => {
    const featured = loadTimeline().featuredTags || [];
    expect(featured.length).toBeGreaterThan(0);
    const tag = featured[0];

    const nav = timelineDocument.querySelector('nav[aria-label]');
    expect(nav).toBeTruthy();
    const anchors = selectAll(nav, 'a.timeline-relationship');
    const match = anchors.find((a) => textOf(a).startsWith(`#${tag}`));
    expect(match).toBeTruthy();

    const html = normalizeFragment(match);
    expect(html).toContain(`href="/timeline/${tag}/"`);
    expect(html).toMatch(new RegExp(`#${tag} \\(\\d+\\)`));
    expect(html).toMatchInlineSnapshot(
      `"<a class="timeline-relationship mr2 mb2" href="/timeline/timeline-page/">#timeline-page (2)</a>"`,
    );
  });

  it('project tag chip with count renders as a filter button', () => {
    const button = selectAll(
      projectsDocument,
      'button.project-tag[data-project-filter="ansible"]',
    )[0];
    expect(button).toBeTruthy();
    expect(button.querySelector('.project-tag__count')).toBeTruthy();
    expect(normalizeFragment(button)).toMatchInlineSnapshot(
      `"<button type="button" class="project-tag project-tag--filter mr2 mb2" data-project-filter="ansible" data-tag-label="Ansible" aria-pressed="false"> <span class="project-tag__label">#Ansible</span> <span class="project-tag__count">3</span> </button>"`,
    );
  });
});
