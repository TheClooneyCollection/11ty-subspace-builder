import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { parsePage } from '../helpers/parse.js';
import { getSiteDir, sitePathExists } from '../helpers/build-once.js';
import { buildI18nFixture } from '../fixtures/i18n/build.js';
import { parseHTML } from 'linkedom';

describe('development sharing-card previews', () => {
  it('lists generated cards and links the draft comparison only in development', () => {
    expect(sitePathExists('og/index.html')).toBe(false);
    expect(sitePathExists('posts/draft-og-card-styles/index.html')).toBe(false);
    expect(sitePathExists('assets/og/showcase')).toBe(false);
    const { document } = parsePage('/og/', { mode: 'dev' });
    expect(document.querySelector('a[href="/posts/draft-og-card-styles/"]')).toBeTruthy();
    expect(document.querySelectorAll('figure img').length).toBeGreaterThan(0);
    for (const image of document.querySelectorAll('figure img')) {
      expect(fs.existsSync(path.join(getSiteDir('dev'), image.getAttribute('src')))).toBe(true);
    }
  });
  it('shows six sample subjects in every style with labelled configuration and a gallery backlink', () => {
    const { document } = parsePage('/posts/draft-og-card-styles/', { mode: 'dev' });
    expect(document.querySelector('a[href="/og/"]')).toBeTruthy();
    const images = [...document.querySelectorAll('img[src^="/assets/og/showcase/"]')];
    expect(images).toHaveLength(48);
    for (const image of images) {
      const png = fs.readFileSync(path.join(getSiteDir('dev'), image.getAttribute('src')));
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    }
    for (const style of ['retro', 'retro-dark', 'swiss', 'swiss-dark', 'glass-dark', 'glass-light-b', 'glass-light-c', 'classic']) {
      expect(document.body.textContent).toContain(`ogImage.style: ${style}`);
    }
  });
  it('keeps the existing Chinese draft own-image asset in a production build', () => {
    expect(sitePathExists('assets/og/posts--samples--draft-chinese-og-check.png')).toBe(true);
    expect(sitePathExists('posts/draft-chinese-og-check/index.html')).toBe(true);
  });
  it('cleans development previews when production reuses an output directory', () => {
    const output = fs.mkdtempSync(path.join(os.tmpdir(), 'og-production-reuse-'));
    const previews = ['og/index.html', 'posts/draft-og-card-styles/index.html',
      'assets/og/showcase/post-retro.png', 'assets/og/posts--samples--draft-og-card-styles.png'];
    try {
      for (const file of previews) {
        const target = path.join(output, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, 'previous development output');
      }
      execFileSync(process.execPath, ['node_modules/@11ty/eleventy/cmd.cjs', '--output', output], {
        env: { ...process.env, ELEVENTY_ENV: 'production' }, stdio: 'pipe', timeout: 60000,
      });
      for (const file of previews) expect(fs.existsSync(path.join(output, file)), file).toBe(false);
      expect(fs.existsSync(path.join(output, 'assets/og/posts--samples--draft-chinese-og-check.png'))).toBe(true);
    } finally { fs.rmSync(output, { recursive: true, force: true }); }
  }, 60000);
  it('translated post and note metadata use their own language-keyed images', () => {
    const pages = buildI18nFixture({ configure(dir) {
      fs.writeFileSync(path.join(dir, '_data/ogImages.json'), JSON.stringify({
        '/posts/nested/paired': '/assets/og/english-post.png',
        'zh:posts/paired': '/assets/og/chinese-post.png',
        'zh:notes/short': '/assets/og/chinese-note.png',
        '/notes/short': '/assets/og/english-note.png',
      }));
    } });
    for (const [url, filename] of [['/posts/paired/', 'english-post'], ['/zh/posts/paired/', 'chinese-post'], ['/zh/notes/short/', 'chinese-note']]) {
      const { document } = parseHTML(pages.get(url));
      expect(document.querySelector('meta[property="og:image"]').getAttribute('content')).toContain(`/assets/og/${filename}.png`);
    }
    expect(pages.has('/og/')).toBe(false);
  });
});
