import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { buildI18nFixture } from '../fixtures/i18n/build.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const write = (dir, name, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
  fs.writeFileSync(path.join(dir, name), text);
};
const entry = (title, extra = '') => `---
title: "${title}"
date: "2026-04-14"
time: "12:00"
tags: [sample-topic]
${extra}---
Sample body.
`;

it('switches samples off across real builds without deleting sources or changing public URLs', () => {
  let dir;
  buildI18nFixture({ enabled: false, translations: false,
    configure(target) {
      dir = target;
      fs.copyFileSync(path.join(root, 'package.json'), path.join(dir, 'package.json'));
      fs.copyFileSync(path.join(root, 'scripts/generate-og-images.js'), path.join(dir, 'scripts/generate-og-images.js'));
      for (const name of ['posts/samples/samples.json', 'notes/samples/samples.json', 'notes/samples/hidden/hidden.json', 'timeline/samples/samples.json', 'posts/samples/draft-og-card-styles.md', 'posts/samples/draft-og-card-styles.11tydata.js']) {
        write(dir, name, fs.readFileSync(path.join(root, name), 'utf8'));
      }
      write(dir, 'posts/samples/future/example.md', entry('Sample post'));
      write(dir, 'notes/samples/example-note.md', entry('Sample note'));
      write(dir, 'notes/samples/hidden/example-secret.md', entry('Sample hidden'));
      write(dir, 'timeline/samples/2026-04-14-sample-root.md', entry('Sample event'));
      write(dir, 'timeline/samples/2026-04-15-sample-child.md', entry('Sample child', 'parent: "/timeline/2026-04-14-sample-root/"\n'));
      write(dir, 'src/sitemap.njk', '---\npermalink: /sitemap.xml\n---\n{% for item in collections.all %}{{ item.url }}\n{% endfor %}');
      const series = yaml.load(fs.readFileSync(path.join(dir, '_data/series.yaml'), 'utf8'));
      series.push({ id: 'samples-only', title: 'Sample series', entries: ['/posts/example/', '/timeline/2026-04-14-sample-root/'] });
      series[0].entries.unshift('/posts/example/');
      write(dir, '_data/series.yaml', yaml.dump(series));
      const site = yaml.load(fs.readFileSync(path.join(dir, '_data/site.yaml'), 'utf8'));
      delete site.sampleContent;
      site.ogImage.staticEntries = [];
      write(dir, '_data/site.yaml', yaml.dump(site));
    },
    onBuild(result) {
      expect(result.status, result.stderr).toBe(0);
      const output = path.join(dir, '_site');
      const samples = ['posts/example', 'notes/example-note', 'notes/hidden/example-secret', 'timeline/2026-04-14-sample-root', 'timeline/2026-04-15-sample-child', 'series/samples-only'];
      for (const url of samples) expect(fs.existsSync(path.join(output, url, 'index.html')), url).toBe(true);
      expect(fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8')).toContain('/posts/example/');
      const before = JSON.parse(fs.readFileSync(path.join(dir, '_data/ogImages.json'), 'utf8'));
      const sampleImages = Object.entries(before).filter(([key]) => key.includes('/samples/')).map(([, url]) => url);
      expect(sampleImages.length).toBe(5);
      const site = yaml.load(fs.readFileSync(path.join(dir, '_data/site.yaml'), 'utf8'));
      site.sampleContent = false;
      write(dir, '_data/site.yaml', yaml.dump(site));
      write(dir, '_site/custom.html', 'Keep unrelated output');
      for (const environment of ['production', 'development']) {
        const build = spawnSync(process.execPath, [path.join(dir, 'node_modules/@11ty/eleventy/cmd.cjs'), '--quiet'], {
          cwd: dir, encoding: 'utf8', timeout: 60000, env: { ...process.env, ELEVENTY_ENV: environment },
        });
        expect(build.status, build.stdout + build.stderr).toBe(0);
        for (const url of samples) expect(fs.existsSync(path.join(output, url, 'index.html')), url).toBe(false);
        expect(fs.existsSync(path.join(output, 'posts/paired/index.html'))).toBe(true);
        expect(fs.existsSync(path.join(output, 'series/reading-path/index.html'))).toBe(true);
        for (const name of ['sitemap.xml', 'feed.xml', 'timeline/index.html', 'series/reading-path/index.html']) {
          expect(fs.readFileSync(path.join(output, name), 'utf8'), name).not.toContain('/posts/example/');
        }
        const images = JSON.parse(fs.readFileSync(path.join(dir, '_data/ogImages.json'), 'utf8'));
        expect(Object.keys(images).some(key => key.includes('/samples/'))).toBe(false);
        for (const url of sampleImages) {
          expect(fs.existsSync(path.join(dir, url.slice(1)))).toBe(false);
          expect(fs.existsSync(path.join(output, url.slice(1)))).toBe(false);
        }
        expect(fs.existsSync(path.join(output, 'assets/og/showcase'))).toBe(false);
        expect(fs.existsSync(path.join(output, 'posts/draft-og-card-styles/index.html'))).toBe(false);
        if (environment === 'development') expect(fs.readFileSync(path.join(output, 'og/index.html'), 'utf8')).not.toContain('posts--samples--');
        expect(fs.readFileSync(path.join(output, 'custom.html'), 'utf8')).toBe('Keep unrelated output');
        expect(fs.existsSync(path.join(dir, 'posts/samples/future/example.md'))).toBe(true);
      }
    },
  });
}, 120000);
