import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  buildAssetUrl,
  emitFingerprintedAssets,
  __resetFingerprintCachesForTest,
} from '../../lib/assets/fingerprint.js';

// Asset paths in this module are resolved relative to process.cwd().
// We create a fixture file inside the project root so buildAssetUrl finds it.
const fixtureRel = '_fingerprint-fixture';
const fixtureAbs = path.resolve(fixtureRel);

const writeFixture = (relPath, contents) => {
  const full = path.join(fixtureAbs, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
  return full;
};

beforeEach(() => {
  __resetFingerprintCachesForTest();
  fs.rmSync(fixtureAbs, { recursive: true, force: true });
  fs.mkdirSync(fixtureAbs, { recursive: true });
});

afterAll(() => {
  fs.rmSync(fixtureAbs, { recursive: true, force: true });
});

describe('buildAssetUrl', () => {
  it('returns the href unchanged when not an absolute root path', () => {
    expect(buildAssetUrl('https://example.com/x.css')).toBe(
      'https://example.com/x.css',
    );
    expect(buildAssetUrl('./relative.css')).toBe('./relative.css');
    expect(buildAssetUrl(null)).toBe(null);
  });

  it('returns href unchanged when the file does not exist', () => {
    expect(buildAssetUrl('/no-such-file.css')).toBe('/no-such-file.css');
  });

  it('inserts a 10-char hex fingerprint into the path', () => {
    writeFixture('site.css', 'body { color: red; }');
    const url = buildAssetUrl(`/${fixtureRel}/site.css`);
    expect(url).toMatch(
      new RegExp(`^/${fixtureRel}/site\\.[a-f0-9]{10}\\.css$`),
    );
  });

  it('preserves query string and hash fragments', () => {
    writeFixture('site.css', 'body { color: red; }');
    const url = buildAssetUrl(`/${fixtureRel}/site.css?v=1#top`);
    expect(url).toMatch(
      new RegExp(`^/${fixtureRel}/site\\.[a-f0-9]{10}\\.css\\?v=1#top$`),
    );
  });

  it('produces the same hash for unchanged file content (cache hit)', () => {
    writeFixture('site.css', 'same content');
    const first = buildAssetUrl(`/${fixtureRel}/site.css`);
    const second = buildAssetUrl(`/${fixtureRel}/site.css`);
    expect(first).toBe(second);
  });

  it('produces a different hash when content (and mtime) change', () => {
    writeFixture('site.css', 'one');
    const first = buildAssetUrl(`/${fixtureRel}/site.css`);
    // Force mtime change so cache key changes
    const newer = Date.now() / 1000 + 5;
    writeFixture('site.css', 'two');
    fs.utimesSync(path.join(fixtureAbs, 'site.css'), newer, newer);
    const second = buildAssetUrl(`/${fixtureRel}/site.css`);
    expect(second).not.toBe(first);
  });
});

describe('emitFingerprintedAssets', () => {
  it('copies the fingerprinted file into the output directory', () => {
    writeFixture('site.css', 'body { color: red; }');
    const url = buildAssetUrl(`/${fixtureRel}/site.css`);
    const outputDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'fp-out-'),
    );
    try {
      emitFingerprintedAssets(outputDir);
      const expected = path.join(outputDir, url.split('?')[0].slice(1));
      expect(fs.existsSync(expected)).toBe(true);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('cleans up previous fingerprinted versions in the output dir', () => {
    writeFixture('site.css', 'one');
    buildAssetUrl(`/${fixtureRel}/site.css`);

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-out-'));
    try {
      // Plant an older fingerprinted version that should get cleaned up.
      const oldDir = path.join(outputDir, fixtureRel);
      fs.mkdirSync(oldDir, { recursive: true });
      const stale = path.join(oldDir, 'site.deadbeef00.css');
      fs.writeFileSync(stale, 'stale');

      emitFingerprintedAssets(outputDir);
      expect(fs.existsSync(stale)).toBe(false);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
