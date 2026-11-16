import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import yaml from 'js-yaml';

const script = path.resolve('scripts/starter-reset.js');
function runWizard(root, answers) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { cwd: root });
    let output = '';
    let pending = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
      pending += chunk;
      if (pending.includes('Select ') || pending.includes('Apply these changes?')) {
        pending = '';
        child.stdin.write(`${answers.shift()}\n`);
      }
    });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(output) : reject(new Error(output)));
  });
}

describe('fresh-fork sample reset', () => {
  it('removes namespaced samples and keeps personal content while adding visible starters', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'starter-reset-samples-'));
    const put = (name, content = 'unchanged') => {
      const file = path.join(root, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
    };
    const samples = ['posts/samples/demo.md', 'posts/samples/demo.11tydata.js',
      'posts/samples/nested/future.md', 'notes/samples/example.md',
      'notes/samples/hidden/example.md', 'timeline/samples/event.md'];
    const own = ['posts/mine.md', 'posts/subspace/mine.md', 'notes/mine.md',
      'notes/hidden/mine.md', 'timeline/mine.md'];
    const defaults = ['posts/posts.json', 'posts/samples/samples.json',
      'notes/hidden/hidden.json', 'notes/samples/hidden/hidden.json',
      'timeline/timeline.json', 'timeline/samples/samples.json'];
    try {
      for (const file of [...samples, ...own, ...defaults]) put(file);
      put('_data/site.yaml', 'sampleContent: false\n');
      put('_data/series.yaml', '- id: samples\n');
      const output = await runWizard(root, ['1 2 3', '1 2 3', 'yes']);
      expect(output).toContain('Reset complete.');
      for (const file of samples) expect(fs.existsSync(path.join(root, file)), file).toBe(false);
      for (const file of [...own, ...defaults]) {
        expect(fs.readFileSync(path.join(root, file), 'utf8'), file).toBe('unchanged');
      }
      for (const file of ['posts/start-here.md', 'notes/quick-note-example.md', 'timeline/start-customizing-the-site.md']) {
        expect(fs.existsSync(path.join(root, file)), file).toBe(true);
      }
      const post = fs.readFileSync(path.join(root, 'posts/start-here.md'), 'utf8');
      expect(yaml.load(post.split('---')[1]).permalink).toBe('/posts/start-here/');
      expect(yaml.load(fs.readFileSync(path.join(root, '_data/site.yaml'), 'utf8')).sampleContent).toBe(false);
      expect(yaml.load(fs.readFileSync(path.join(root, '_data/series.yaml'), 'utf8'))).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
  it('keeps existing starter content when placeholders are requested again', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'starter-reset-samples-'));
    const starters = ['posts/start-here.md', 'notes/quick-note-example.md', 'timeline/start-customizing-the-site.md'];
    try {
      fs.mkdirSync(path.join(root, '_data'));
      fs.writeFileSync(path.join(root, '_data/site.yaml'), 'sampleContent: false\n');
      for (const file of starters) {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        fs.writeFileSync(path.join(root, file), 'My edited starting content');
      }
      await runWizard(root, ['skip', '1 2 3', 'yes']);
      for (const file of starters) {
        expect(fs.readFileSync(path.join(root, file), 'utf8')).toBe('My edited starting content');
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

});
