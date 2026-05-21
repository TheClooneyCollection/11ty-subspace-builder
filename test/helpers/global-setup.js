import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SITE_DIR = path.resolve('_site');

export default function setup() {
  if (process.env.VITEST_SKIP_BUILD === '1') return;

  fs.rmSync(SITE_DIR, { recursive: true, force: true });

  const result = spawnSync('npx', ['@11ty/eleventy'], {
    env: { ...process.env, ELEVENTY_ENV: 'production' },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Eleventy build failed with exit code ${result.status}`);
  }
}
