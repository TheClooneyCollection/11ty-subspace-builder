import { createHash } from 'node:crypto';

export const TEMPLATE_VERSION = '1';
const normalizeText = (value) => value.normalize('NFC').replace(/\r\n?/g, '\n');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function stableValue(value) {
  if (typeof value === 'string') return normalizeText(value);
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function sourceHashes(sources, hash) {
  const entries = Object.entries(sources).map(([key, value]) => {
    const logicalKey = normalizeText(key).replace(/\\/g, '/');
    if (logicalKey.startsWith('/') || /^[a-z]:\//i.test(logicalKey)) {
      throw new Error(`OG cache sources require logical relative filenames: ${key}`);
    }
    return [logicalKey, hash(value)];
  });
  return Object.fromEntries(entries);
}

// sources: { templates: { logicalFilename: text }, fonts: { logicalFilename: Buffer },
// versions: { satori, resvg }, templateVersion?: string }. Supply all loaded sources.
export function cacheKey(data, sources) {
  return sha256(JSON.stringify(stableValue({
    data,
    templates: sourceHashes(sources.templates, (value) => sha256(normalizeText(value))),
    fonts: sourceHashes(sources.fonts, sha256),
    versions: sources.versions,
    templateVersion: sources.templateVersion ?? TEMPLATE_VERSION,
  })));
}

export default cacheKey;
