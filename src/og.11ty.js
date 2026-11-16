const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

export default class {
  data() {
    return { title: 'Open Graph cards', layout: 'layouts/home.njk',
      permalink: process.env.ELEVENTY_ENV === 'production' ? false : '/og/',
      eleventyExcludeFromCollections: true };
  }
  render({ ogGallery = {}, collections = {} }) {
    const urls = new Set((collections.all || []).map((page) => page.url));
    const cards = (ogGallery.cards || []).filter((card) => urls.has(card.url));
    const showcase = urls.has(ogGallery.showcaseUrl)
      ? `<p><a href="${escape(ogGallery.showcaseUrl)}">Compare all card styles</a></p>` : '';
    return `<h1>Open Graph cards</h1><p>Development only. These are the generated sharing images for this build.</p>${showcase}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:24px">${cards.map((card) => `
        <figure style="margin:0;min-width:0"><a href="${escape(card.url)}"><img eleventy:ignore src="${escape(card.image)}" width="1200" height="630" alt="${escape(card.title)} sharing card" style="display:block;width:100%;height:auto" loading="lazy"></a>
        <figcaption><a href="${escape(card.url)}">${escape(card.title)}</a> (${escape(card.lang)})<br><a href="${escape(card.image)}"><code style="overflow-wrap:anywhere">${escape(card.image)}</code></a></figcaption></figure>`).join('')}</div>`;
  }
}
