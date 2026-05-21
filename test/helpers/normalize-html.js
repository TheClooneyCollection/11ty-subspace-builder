const FINGERPRINT_RE = /\.([a-f0-9]{10})\.(css|js|svg|png|jpg|jpeg|webp|avif|ico|woff2?)/g;
const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/g;
const ISO_DATETIME_RE = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/g;
const OG_IMAGE_RE = /\/assets\/og\/[A-Za-z0-9_-]+\.png/g;

export const normalizeHtml = (html) =>
  html
    .replace(FINGERPRINT_RE, '.[hash].$2')
    .replace(ISO_DATETIME_RE, '[DATETIME]')
    .replace(ISO_DATE_RE, '[DATE]')
    .replace(OG_IMAGE_RE, '/assets/og/[OG_IMAGE].png')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeFragment = (node) => normalizeHtml(node.outerHTML || '');
