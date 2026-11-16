import { html } from 'satori-html';

const TITLE_FONT_STACK = "'Lexend', 'Noto Sans SC', 'Noto Sans TC', 'Inter'";
const BODY_FONT_STACK = "'Inter', 'Noto Sans SC', 'Noto Sans TC'";

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  const shortened = text.slice(0, maxLength);
  const lastSpace = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, lastSpace > 80 ? lastSpace : maxLength)}…`;
}

const TITLE_STYLES = [
  { maxChars: 42, fontSize: 72, letterSpacing: -1.2, lineHeight: 1.05 },
  { maxChars: 60, fontSize: 64, letterSpacing: -1.1, lineHeight: 1.07 },
  { maxChars: 78, fontSize: 58, letterSpacing: -1.0, lineHeight: 1.1 },
  { maxChars: 96, fontSize: 52, letterSpacing: -0.9, lineHeight: 1.12 },
  {
    maxChars: Infinity,
    fontSize: 46,
    letterSpacing: -0.8,
    lineHeight: 1.15,
    truncateChars: 112,
  },
];

const EXCERPT_STYLES = [
  { maxChars: 160, fontSize: 32, lineHeight: 1.42 },
  { maxChars: 220, fontSize: 28, lineHeight: 1.46 },
  { maxChars: Infinity, fontSize: 26, lineHeight: 1.5, truncateChars: 260 },
];

export function fitTitle(text) {
  const cleaned = text.trim();
  for (const style of TITLE_STYLES) {
    if (cleaned.length <= style.maxChars) {
      const finalText = style.truncateChars
        ? truncate(cleaned, style.truncateChars)
        : cleaned;
      return { ...style, text: finalText };
    }
  }
  return {
    ...TITLE_STYLES[TITLE_STYLES.length - 1],
    text: truncate(cleaned, 112),
  };
}

export function fitExcerpt(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  for (const style of EXCERPT_STYLES) {
    if (normalized.length <= style.maxChars) {
      const finalText = style.truncateChars
        ? truncate(normalized, style.truncateChars)
        : normalized;
      return { ...style, text: finalText };
    }
  }
  return {
    ...EXCERPT_STYLES[EXCERPT_STYLES.length - 1],
    text: truncate(normalized, 260),
  };
}

export function classic(
  { title, excerpt: excerptText, width, height },
  variant = 'classic',
) {
  const fittedTitle = fitTitle(title);
  const fittedExcerpt = fitExcerpt(excerptText);

  return sanitizeNode(html`
    <div
      style="
        width: ${width}px;
        height: ${height}px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 72px 80px;
        background: linear-gradient(135deg, #fff9c4, #ffd166);
        color: #111111;
        font-family: ${TITLE_FONT_STACK};
      "
    >
      <div
        style="display:flex; flex-direction:column; gap:24px; max-width: 920px;"
      >
        <div
          style="font-size: ${fittedTitle.fontSize}px; font-weight: 700; line-height: ${fittedTitle.lineHeight}; letter-spacing: ${fittedTitle.letterSpacing}px;"
        >
          ${fittedTitle.text}
        </div>
        <div
          style="
            font-size: ${fittedExcerpt.fontSize}px;
            font-family: ${BODY_FONT_STACK};
            font-weight: 400;
            line-height: ${fittedExcerpt.lineHeight};
            color: rgba(17, 17, 17, 0.78);
            max-width: 820px;
          "
        >
          ${fittedExcerpt.text}
        </div>
      </div>
      <div
        style="display:flex; justify-content: space-between; align-items: center;"
      >
        <div
          style="height: 6px; width: 160px; background: #ffb700; border-radius: 999px;"
        ></div>
        <div
          style="
            font-family: ${BODY_FONT_STACK};
            font-weight: 500;
            font-size: 28px;
            color: #d97706;
            letter-spacing: 7px;
            text-transform: uppercase;
          "
        >
          Subspace
        </div>
      </div>
    </div>
  `);
}

// Remove whitespace-only text nodes so Satori doesn't count them as extra children.
function sanitizeNode(node) {
  if (node == null) return node;
  if (typeof node === 'string') {
    const trimmed = node.trim();
    return trimmed.length ? decodeHtmlEntities(trimmed) : null;
  }
  if (Array.isArray(node)) {
    const cleaned = node
      .map((child) => sanitizeNode(child))
      .filter((child) => child !== null && child !== undefined);
    return cleaned;
  }
  if (typeof node === 'object') {
    const props = node.props ?? {};
    if (props.children !== undefined) {
      const normalized = Array.isArray(props.children)
        ? props.children
        : [props.children];
      const cleanedChildren = normalized
        .map((child) => sanitizeNode(child))
        .filter((child) => child !== null && child !== undefined);
      if (cleanedChildren.length === 0) {
        delete props.children;
      } else if (cleanedChildren.length === 1) {
        props.children = cleanedChildren[0];
      } else {
        props.children = cleanedChildren;
      }
      node.props = props;
    }
  }
  return node;
}

export default classic;
