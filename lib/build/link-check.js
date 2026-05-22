export const shouldSkipHref = (href) => {
  if (!href) return true;
  const value = href.trim();
  if (!value) return true;
  if (value.startsWith('#')) return true;
  if (value.startsWith('mailto:')) return true;
  if (value.startsWith('tel:')) return true;
  if (value.startsWith('javascript:')) return true;
  if (value.startsWith('data:')) return true;
  if (value.startsWith('//')) return true;
  if (value.startsWith('http://')) return true;
  if (value.startsWith('https://')) return true;
  return false;
};

export const hasFileExtension = (path) => {
  if (!path) return false;
  const segment = path.split('/').pop();
  if (!segment) return false;
  return segment.includes('.');
};

export const normalizePath = (path) => {
  if (!path) return path;
  if (path !== '/' && path.endsWith('/')) return path.slice(0, -1);
  return path;
};

export const findBrokenInternalLinks = (results = []) => {
  if (!Array.isArray(results) || results.length === 0) {
    return [];
  }

  const knownPaths = new Set();
  for (const entry of results) {
    const url = entry?.url;
    if (!url || typeof url !== 'string') continue;
    const normalized = normalizePath(url);
    knownPaths.add(normalized);
    if (normalized !== '/') {
      knownPaths.add(`${normalized}/`);
    }
  }

  const brokenLinks = [];
  for (const entry of results) {
    const { outputPath, content, url: pageUrl } = entry || {};
    if (!outputPath || !content) continue;
    if (!outputPath.endsWith('.html')) continue;

    const baseUrl = new URL(pageUrl || '/', 'http://localhost');
    const linkPattern = /href=(?:"([^"]+)"|'([^']+)')/gi;
    let match;
    while ((match = linkPattern.exec(content)) !== null) {
      const href = match[1] ?? match[2];
      if (shouldSkipHref(href)) continue;
      if (
        !(
          href.startsWith('/') ||
          href.startsWith('./') ||
          href.startsWith('../')
        )
      )
        continue;

      const [hrefWithoutHash] = href.split('#');
      const [hrefWithoutQuery] = hrefWithoutHash.split('?');
      if (hasFileExtension(hrefWithoutQuery)) continue;

      let resolvedPath;
      try {
        const resolved = new URL(href, baseUrl);
        resolvedPath = normalizePath(resolved.pathname);
      } catch (error) {
        brokenLinks.push({
          source: pageUrl || outputPath,
          href,
          error: error.message,
        });
        continue;
      }

      if (!knownPaths.has(resolvedPath)) {
        brokenLinks.push({
          source: pageUrl || outputPath,
          href,
          resolvedPath,
        });
      }
    }
  }

  return brokenLinks;
};

export const assertNoBrokenInternalLinks = (results = []) => {
  const brokenLinks = findBrokenInternalLinks(results);
  if (brokenLinks.length === 0) return;

  const details = brokenLinks
    .map((link) => {
      const parts = [`source: ${link.source}`, `href: ${link.href}`];
      if (link.resolvedPath) {
        parts.push(`resolved: ${link.resolvedPath}`);
      }
      if (link.error) {
        parts.push(`error: ${link.error}`);
      }
      return `  • ${parts.join(', ')}`;
    })
    .join('\n');
  throw new Error(`Broken internal links detected:\n${details}`);
};
