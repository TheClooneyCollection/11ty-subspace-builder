import { describe, it, expect, beforeAll } from 'vitest';
import { ensureSiteBuilt, sitePathExists } from './helpers/build-once.js';

describe('test tooling', () => {
  beforeAll(async () => {
    await ensureSiteBuilt();
  });

  it('builds _site and produces an index.html', () => {
    expect(sitePathExists('index.html')).toBe(true);
  });
});
