import { beforeAll, describe, expect, it } from 'vitest';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage } from '../helpers/parse.js';
import { normalizeHtml } from '../helpers/normalize-html.js';

// Representative post: github-code-embeds exercises the broadest
// production-published mix of markdown/shortcode features:
//   - TOC ([[toc]])
//   - {% github %} shortcode output (build-time fetched + highlighted)
//   - Code blocks (both short uncollapsed and long collapsible variants
//     via the gh-embed--collapsible class on long embedded files)
//   - Inline raw code samples and code fences
// Footnotes and `> TODO` blockquotes only live in draft posts, which
// are excluded from this snapshot's scope — they are covered by other
// targeted tests rather than by mixing many drafts into one snapshot.
const POST_SLUG = 'github-code-embeds';

describe(`snapshot — post body /posts/${POST_SLUG}/`, () => {
  let document;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document } = parsePage(`/posts/${POST_SLUG}/`));
  });

  it('renders a stable <main> body for a feature-rich post', () => {
    const main = document.querySelector('main');
    expect(main).toBeTruthy();

    const snapshot = normalizeHtml(main.outerHTML);
    expect(snapshot).toMatchSnapshot();
  });
});
