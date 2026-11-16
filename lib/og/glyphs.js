import opentype from '@shuding/opentype.js';

const cmaps = new WeakMap();

function cmap(data) {
  if (!cmaps.has(data)) {
    // Buffers may be views into a larger pool; parse only this font's bytes.
    const buffer = data instanceof ArrayBuffer ? data
      : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    cmaps.set(data, opentype.parse(buffer).tables.cmap.glyphIndexMap);
  }
  return cmaps.get(data);
}

function transform(text, mode) {
  if (mode === 'uppercase') return text.toUpperCase();
  if (mode === 'lowercase') return text.toLowerCase();
  if (mode === 'capitalize') return text.replace(/(^|\s)(\S)/gu, (_, space, char) => space + char.toUpperCase());
  return text;
}

// Inspect only text emitted by the template, including inherited textTransform.
// This checks the loaded font set, not glyph shaping or font-family selection.
export function missingGlyphs(tree, fonts) {
  const maps = fonts.map(({ data }) => cmap(data));
  const missing = new Map();
  function visit(node, textTransform) {
    if (typeof node === 'string' || typeof node === 'number') {
      for (const character of transform(String(node), textTransform)) {
        if (/\s/u.test(character)) continue;
        const point = character.codePointAt(0);
        if (!maps.some((map) => map[point] > 0)) {
          missing.set(character, {
            character,
            codePoint: `U+${point.toString(16).toUpperCase().padStart(4, '0')}`,
          });
        }
      }
    } else if (Array.isArray(node)) {
      node.forEach((child) => visit(child, textTransform));
    } else if (node && typeof node === 'object') {
      const style = node.props?.style;
      if (style?.display === 'none') return;
      visit(node.props?.children, style?.textTransform ?? textTransform);
    }
  }
  visit(tree);
  return [...missing.values()];
}

export default missingGlyphs;
