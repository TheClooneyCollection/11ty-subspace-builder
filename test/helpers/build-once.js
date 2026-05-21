import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SITE_DIR = path.resolve('_site');

let buildPromise = null;

const runBuild = () =>
  new Promise((resolve, reject) => {
    const child = spawn('npx', ['@11ty/eleventy'], {
      env: { ...process.env, ELEVENTY_ENV: 'production' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Eleventy build failed (exit ${code}):\n${stderr}`));
    });
  });

export const ensureSiteBuilt = () => {
  if (!buildPromise) {
    buildPromise = runBuild();
  }
  return buildPromise;
};

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
