// The markdown TOC renderer emits one flat <nav class="toc"> wrapper.
// Move that existing navigation, rather than duplicating heading IDs or links.
export function articleLayout(html = '') {
  const source = String(html);
  const match = source.match(/<nav class="toc">[\s\S]*?<\/nav>/);
  return { toc: match?.[0] || '', body: match ? source.replace(match[0], '') : source };
}
