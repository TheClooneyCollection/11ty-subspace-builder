import { expect, it } from 'vitest';
import { articleLayout } from '../../lib/article-layout.js';
it('moves the TOC without duplicating the article or changing anchors', () => {
  const toc = '<nav class="toc"><ul><li><a href="#one">One</a></li></ul></nav>';
  expect(articleLayout(`<p>Intro</p>${toc}<h2 id="one">One</h2>`)).toEqual({toc, body:'<p>Intro</p><h2 id="one">One</h2>'});
});
it('leaves articles without a TOC intact', () => {
  expect(articleLayout('<p>Short note</p>')).toEqual({toc:'', body:'<p>Short note</p>'});
});
