import hljs from 'highlight.js';

export const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const normalizeLanguage = (value) => {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .split(/\s+/, 1)[0]
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '');
};

export const highlightCode = (code, language) => {
  if (language && hljs.getLanguage(language)) {
    try {
      return hljs.highlight(code, { language }).value;
    } catch {
      return escapeHtml(code);
    }
  }

  try {
    return hljs.highlightAuto(code).value;
  } catch {
    return escapeHtml(code);
  }
};

export const countCodeLines = (value) => {
  if (typeof value !== 'string' || value.length === 0) return 0;
  const normalized = value.endsWith('\n') ? value.slice(0, -1) : value;
  return normalized.length === 0 ? 0 : normalized.split('\n').length;
};

export const getNumericSetting = (value, fallback) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const renderMarkdownCodeBlock = (
  code,
  language = '',
  { copyLineThreshold = 10, collapseLineThreshold = 0 } = {},
) => {
  const normalizedLanguage = normalizeLanguage(language);
  const highlighted = highlightCode(code, normalizedLanguage);
  const lineCount = countCodeLines(code);
  const shouldShowCopy = lineCount > copyLineThreshold;
  const shouldCollapse =
    Number.isFinite(collapseLineThreshold) &&
    collapseLineThreshold > 0 &&
    lineCount > collapseLineThreshold;
  const languageClass = normalizedLanguage
    ? ` language-${normalizedLanguage}`
    : '';
  const codeClass = `hljs${languageClass}`;
  const collapseClasses = shouldCollapse
    ? ' code-block--collapsible code-block--collapsed'
    : '';
  const wrapClass = ' code-block--wrap';
  const collapseAttributes = shouldCollapse
    ? ` data-collapse-threshold="${collapseLineThreshold}" data-line-count="${lineCount}"`
    : '';
  const toggleButton = shouldCollapse
    ? `
\t<button class="code-block__toggle gh-embed__toggle" type="button" data-collapse-toggle aria-expanded="false" data-expand-label="Expand" data-collapse-label="Collapse">
\t\tExpand
\t</button>`
    : '';
  const pre = `<pre class="code-block__pre"><code class="${codeClass.trim()}">${highlighted}</code></pre>`;
  const copyButton = shouldShowCopy
    ? `
\t\t<button class="code-block__copy gh-embed__copy" type="button" data-clipboard>Copy</button>`
    : '';
  const actions = `
\t<div class="code-block__actions">
\t\t<button class="code-block__wrap gh-embed__copy" type="button" data-wrap-toggle aria-pressed="true" data-wrap-label="Wrap" data-wrapped-label="Wrapped">Wrapped</button>${copyButton}
\t</div>`;

  return `<div class="code-block${wrapClass}${collapseClasses}"${collapseAttributes}>
\t${actions}
\t${pre}
\t${toggleButton}
</div>`;
};
