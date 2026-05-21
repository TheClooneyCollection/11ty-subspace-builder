import fs from 'node:fs';
import path from 'node:path';

const SITE_DIR = path.resolve('_site');

// _site is built once by test/helpers/global-setup.js before any worker
// starts. This function exists for backward compatibility with test files
// that call it inside beforeAll; it is a no-op.
export const ensureSiteBuilt = async () => {};

export const getSiteDir = () => SITE_DIR;

export const readSiteFile = (relativePath) => {
  const full = path.join(SITE_DIR, relativePath.replace(/^\/+/, ''));
  return fs.readFileSync(full, 'utf8');
};

export const sitePathExists = (relativePath) => {
  const full = path.join(SITE_DIR, relativePath.replace(/^\/+/, ''));
  return fs.existsSync(full);
};

export const readSitePage = (urlPath) => {
  const trimmed = urlPath.replace(/^\/+/, '').replace(/\/+$/, '');
  const candidate = trimmed === '' ? 'index.html' : `${trimmed}/index.html`;
  return readSiteFile(candidate);
};

export const walkSiteHtml = function* (subdir = '') {
  const start = path.join(SITE_DIR, subdir);
  if (!fs.existsSync(start)) return;
  const stack = [start];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        yield {
          absolutePath: full,
          relativePath: path.relative(SITE_DIR, full),
        };
      }
    }
  }
};
