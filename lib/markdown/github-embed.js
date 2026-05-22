import path from 'node:path';

export const parseBlobUrl = (githubBlobUrl) => {
  const url = new URL(githubBlobUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[2] !== 'blob') throw new Error('URL must be a GitHub blob URL');
  const [user, repo, , branch, ...fileParts] = parts;
  const filePath = fileParts.join('/');
  const rangeHash = (url.hash || '').replace(/^#/, '');
  let start = null;
  let end = null;
  if (rangeHash.startsWith('L')) {
    const [first, last] = rangeHash
      .split('-')
      .map((part) => part.replace(/^L/, ''));
    start = parseInt(first, 10);
    end = last ? parseInt(last, 10) : start;
  }
  const raw = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
  return {
    user,
    repo,
    branch,
    filePath,
    raw,
    web: githubBlobUrl,
    start,
    end,
  };
};

export const trimSharedIndent = (value) => {
  if (typeof value !== 'string' || value.length === 0) return value;
  const lines = value.split('\n');
  let minIndent = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^[\t ]*/);
    const indentLength = match ? match[0].length : 0;
    if (indentLength === 0) {
      minIndent = 0;
      break;
    }
    minIndent =
      minIndent === null ? indentLength : Math.min(minIndent, indentLength);
  }

  if (!minIndent) return value;

  return lines
    .map((line) => {
      if (!line.trim()) return '';
      const match = line.match(/^[\t ]*/);
      const indentLength = match ? match[0].length : 0;
      if (indentLength === 0) return line;
      const remove = Math.min(indentLength, minIndent);
      return line.slice(remove);
    })
    .join('\n');
};

export const guessLanguageByExt = (filePath) => {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const map = {
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'tsx',
    jsx: 'jsx',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'bash',
    zsh: 'bash',
    bash: 'bash',
    swift: 'swift',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    php: 'php',
    java: 'java',
    kt: 'kotlin',
    css: 'css',
    scss: 'scss',
    html: 'xml',
    xml: 'xml',
    md: 'markdown',
    txt: 'plaintext',
  };
  return map[ext] || 'plaintext';
};
