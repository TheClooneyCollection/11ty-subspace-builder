import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

const loadProjects = () =>
  yaml.load(
    fs.readFileSync(path.resolve('_data/projects.yaml'), 'utf8'),
  );

describe('/projects/', () => {
  let document;
  let projects;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document } = parsePage('/projects/'));
    projects = loadProjects();
  });

  it('renders one card per project across active and archive', () => {
    const cards = selectAll(document, '.project-card');
    const total =
      (projects.active?.length || 0) + (projects.archive?.length || 0);
    expect(total).toBeGreaterThan(0);
    expect(cards.length).toBe(total);
  });

  it('renders a non-empty Link anchor for each project with a url', () => {
    const allProjects = [
      ...(projects.active || []),
      ...(projects.archive || []),
    ];
    const withUrl = allProjects.filter((project) => project?.url);

    const linkAnchors = selectAll(document, 'a.project-card__url');
    expect(linkAnchors.length).toBe(withUrl.length);

    for (const anchor of linkAnchors) {
      expect(textOf(anchor).length).toBeGreaterThan(0);
      expect(anchor.getAttribute('href')).toMatch(/^https?:\/\//);
    }
  });

  it('renders a non-empty GitHub anchor for each project with a repo', () => {
    const allProjects = [
      ...(projects.active || []),
      ...(projects.archive || []),
    ];
    const withRepo = allProjects.filter((project) => project?.repo);

    const repoAnchors = selectAll(document, 'a.project-card__repo');
    expect(repoAnchors.length).toBe(withRepo.length);

    for (const anchor of repoAnchors) {
      expect(textOf(anchor).length).toBeGreaterThan(0);
      expect(anchor.getAttribute('href')).toMatch(/^https?:\/\//);
    }
  });

  it('has no empty anchors on the page', () => {
    const anchors = selectAll(document, 'a[href]');
    for (const anchor of anchors) {
      const hasText = textOf(anchor).length > 0;
      const hasMedia = anchor.querySelector('img, svg, picture');
      const hasAriaLabel = (anchor.getAttribute('aria-label') || '').trim();
      expect(hasText || hasMedia || hasAriaLabel).toBeTruthy();
    }
  });
});
