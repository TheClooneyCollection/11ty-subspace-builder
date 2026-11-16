export const STYLES = Object.freeze([
  'retro', 'retro-dark', 'swiss', 'swiss-dark',
  'glass-dark', 'glass-light-b', 'glass-light-c', 'classic',
]);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const STATUS_LABELS = {
  shipped: 'Shipped', thinking: 'Thinking', wip: 'WIP',
  idea: 'Idea', published: 'Published',
};
const text = (value) => String(value ?? '').normalize('NFC').replace(/\r\n?/g, '\n');
const originalUrl = (value) => text(value).replace(/^\/zh\//, '/');

function formatDate(value, style, zh) {
  if (!value) return '';
  const [year, month, day] = value instanceof Date
    ? [value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()]
    : String(value).slice(0, 10).split('-').map(Number);
  if (zh) return style.startsWith('retro')
    ? `${year}.${month}.${day}` : `${year}年${month}月${day}日`;
  if (style.startsWith('swiss')) {
    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
  }
  if (style.startsWith('retro')) return `${day} ${MONTHS[month - 1].slice(0, 3).toUpperCase()} ${year}`;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function resolveSeries(entry, definitions, locale, zh) {
  if (entry.ogSeries === false) return null;
  const matches = definitions.flatMap((definition) => {
    const refs = Array.isArray(definition.entries) ? definition.entries : definition.posts || [];
    const position = refs.findIndex((url) => originalUrl(url) === originalUrl(entry.url));
    return position < 0 ? [] : [{ definition, part: position + 1, total: refs.length }];
  });
  const override = entry.ogSeries;
  const match = override === undefined || override === null
    ? matches[0] : matches.find(({ definition }) => definition.id === override);
  if (override !== undefined && override !== null && !match) {
    const valid = matches.map(({ definition }) => definition.id).join(', ') || '(none)';
    throw new Error(`Invalid ogSeries "${override}" for ${entry.filePath || entry.url || '(unknown entry)'}. Valid series ids: ${valid}`);
  }
  if (!match) return null;
  const { definition, part, total } = match;
  return {
    id: text(definition.id),
    title: text((zh && locale?.series?.[definition.id]?.title) || definition.title || definition.id),
    part,
    total,
    progress: zh ? `第 ${part} 篇，共 ${total} 篇` : `Part ${part} of ${total}`,
  };
}

// The runner resolves parentTitle before passing this normalized entry.
export function cardData(entry, site = {}, series = [], locale = {}) {
  const style = entry.ogStyle ?? site.ogImage?.style ?? 'retro';
  if (!STYLES.includes(style)) {
    throw new Error(`Unknown OG style "${style}". Allowed styles: ${STYLES.join(', ')}`);
  }
  const lang = entry.lang || 'en';
  const zh = lang === 'zh';
  const page = entry.collection === 'page';
  const timeline = entry.collection === 'timeline';
  const status = timeline && (entry.tags || []).find((tag) => Object.hasOwn(STATUS_LABELS, tag));
  const kind = timeline ? (status ? STATUS_LABELS[status] : zh ? '时间线' : 'Timeline')
    : page ? (zh ? '页面' : 'Page')
      : entry.collection === 'notes' ? (zh ? '笔记' : 'Note') : (zh ? '文章' : 'Post');
  const title = text(entry.title);
  return {
    style,
    variant: style === 'classic' ? 'classic' : style.endsWith('-dark') ? 'dark'
      : style === 'glass-light-b' ? 'b' : style === 'glass-light-c' ? 'c' : 'light',
    lang,
    zh,
    kind,
    title: status ? title.replace(/^\w+(\([^)]*\))?:\s*/, '') : title,
    excerpt: text(entry.excerpt),
    date: formatDate(entry.date, style, zh),
    parent: entry.parentTitle ? text(entry.parentTitle) : null,
    series: resolveSeries(entry, series, locale, zh),
    siteName: text(site.ogImage?.siteName ?? (site.url ? new URL(site.url).host : '')),
    width: 1200,
    height: 630,
    page,
    timeline,
  };
}

export default cardData;
