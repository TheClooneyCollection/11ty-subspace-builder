import { beforeAll, describe, expect, it } from 'vitest';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';
import { normalizeFragment } from '../helpers/normalize-html.js';

// Stabilize eleventy-img generated filenames (hash + width).
const stripImgFingerprints = (html) =>
  html.replace(/\/img\/[A-Za-z0-9_-]+-\d+\.(avif|webp|jpeg|jpg|png)/g, '/img/[IMG].$1');

const findCard = (document, projectName) => {
  const cards = selectAll(document, 'article.project-card');
  const match = cards.find((card) => {
    const title = card.querySelector('.project-card__title');
    return title && textOf(title) === projectName;
  });
  if (!match) {
    throw new Error(`project card not found: ${projectName}`);
  }
  return match;
};

const snapshotLinks = (card) => {
  const links = card.querySelector('.project-card__links');
  return links ? stripImgFingerprints(normalizeFragment(links)) : null;
};

describe('project card snapshots', () => {
  let document;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document } = parsePage('/projects/'));
  });

  it('renders link block for a project with both url and repo', () => {
    const card = findCard(document, '11ty Subspace Builder');
    expect(snapshotLinks(card)).toMatchInlineSnapshot(
      `"<div class="project-card__links mt0 mb3"> <div class="project-card__link-item"> <a class="project-card__url link dim" href="https://subspace-builder.nicholas.clooney.io/">Link</a> </div> <div class="project-card__link-item"> <a class="project-card__repo link dim" href="https://github.com/TheClooneyCollection/11ty-subspace-builder">GitHub</a> </div> </div>"`,
    );
  });

  it('renders link block for a project with only repo (no url)', () => {
    const card = findCard(document, 'ansible-macOS-playbook');
    expect(snapshotLinks(card)).toMatchInlineSnapshot(
      `"<div class="project-card__links mt0 mb3"> <div class="project-card__link-item"> <a class="project-card__repo link dim" href="https://github.com/TheClooneyCollection/ansible-macOS-playbook">GitHub</a> </div> </div>"`,
    );

    // Sanity: explicit absence of url anchor for this variant.
    expect(card.querySelector('a.project-card__url')).toBeNull();
    expect(card.querySelector('a.project-card__repo')).toBeTruthy();
  });

  // Real _data/projects.yaml does not currently contain a project with `url`
  // only, nor one with neither `url` nor `repo`. The card template branches on
  // these fields independently, so the variants tested above plus the contract
  // assertions in test/contract/projects.test.js cover the rendering logic.
  it('asserts the unsupported variants are absent from real data', () => {
    const cards = selectAll(document, 'article.project-card');
    const variants = cards.map((card) => ({
      hasUrl: !!card.querySelector('a.project-card__url'),
      hasRepo: !!card.querySelector('a.project-card__repo'),
    }));
    expect(variants.length).toBeGreaterThan(0);
    // Every card today has at least one of url/repo, and most have both.
    for (const v of variants) {
      expect(v.hasUrl || v.hasRepo).toBe(true);
    }
  });
});
