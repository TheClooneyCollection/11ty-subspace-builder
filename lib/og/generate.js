import { cardData } from './card-data.js';
import { cacheKey, TEMPLATE_VERSION } from './cache-key.js';

export function outputFilename(key) {
  return key.replace(/^\/+/, '').replace(/[\\/]+/g, '--').replace(/[^a-zA-Z0-9._-]+/g, '-') + '.png';
}

// Capabilities keep file I/O and raster rendering outside the generation policy.
export async function generateCards({ entries, site, series, locales = {}, manifest = {}, force = false },
  { sourcesFor, renderCard, exists, save }) {
  const images = {}, cards = [], next = { version: TEMPLATE_VERSION, entries: {} };
  let rendered = 0;
  // Validate all inputs before writing images, including a configured style on an empty site.
  cardData({ collection: 'page', title: '', excerpt: '' }, site);
  const jobs = entries.map((entry) => ({ entry,
    data: cardData(entry, site, series, locales[entry.lang] || {}),
  }));
  for (const { entry, data } of jobs) {
    const filename = outputFilename(entry.key);
    const hash = cacheKey(data, await sourcesFor(data.style));
    if (force || manifest.entries?.[entry.key]?.hash !== hash || !await exists(filename)) {
      await save(filename, await renderCard(data));
      rendered++;
    }
    const image = `/assets/og/${filename}`;
    images[entry.key] = image;
    cards.push({ key: entry.key, title: entry.title, url: entry.url, lang: entry.lang, image });
    next.entries[entry.key] = { hash };
  }
  return { images, cards, manifest: next, rendered };
}
