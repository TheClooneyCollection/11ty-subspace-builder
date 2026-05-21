import { beforeAll, describe, expect, it } from 'vitest';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage } from '../helpers/parse.js';
import { normalizeHtml } from '../helpers/normalize-html.js';

// Representative entry: this one has a parent (which makes the
// "Earlier in thread" section render) and renders the full timeline
// entry body. The children of this entry are gated to non-production
// (testing-tagged), so the follow-ups section is intentionally absent
// in the production build that vitest's globalSetup produces.
const ENTRY_SLUG = '2026-04-16-published-relational-timeline-entry';

describe(`snapshot — timeline entry body /timeline/${ENTRY_SLUG}/`, () => {
  let document;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document } = parsePage(`/timeline/${ENTRY_SLUG}/`));
  });

  it('renders a stable <main> body for the timeline entry detail page', () => {
    const main = document.querySelector('main');
    expect(main).toBeTruthy();

    const snapshot = normalizeHtml(main.outerHTML);
    expect(snapshot).toMatchSnapshot();
  });
});
