import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const families = {
  inter: ['Inter', 'latin'],
  lexend: ['Lexend', 'latin'],
  'noto-sans-sc': ['Noto Sans SC', 'chinese-simplified'],
  'noto-sans-tc': ['Noto Sans TC', 'chinese-traditional'],
  newsreader: ['Newsreader', 'latin'],
};

function specifications(style) {
  if (style === 'classic') {
    return [
      ['lexend', 700],
      ['inter', 500],
      ['inter', 400],
      ...['noto-sans-sc', 'noto-sans-tc'].flatMap((family) =>
        [700, 500, 400].map((weight) => [family, weight]),
      ),
    ];
  }
  if (style === 'swiss' || style === 'swiss-dark') {
    return [
      ['inter', 400],
      ['inter', 500],
      ['inter', 700],
      ['inter', 800],
      ['noto-sans-sc', 400],
      ['noto-sans-sc', 700],
      ['noto-sans-sc', 900],
    ];
  }
  if (style === 'retro' || style === 'retro-dark') {
    return [
      ['lexend', 500],
      ['lexend', 800],
      ['noto-sans-sc', 400],
      ['noto-sans-sc', 700],
      ['noto-sans-sc', 900],
    ];
  }
  if (
    ['glass', 'glass-dark', 'glass-light-b', 'glass-light-c'].includes(style)
  ) {
    return [
      ['inter', 400],
      ['inter', 500],
      ['inter', 700],
      ['newsreader', 400],
      ['newsreader', 700],
      ['noto-sans-sc', 400],
      ['noto-sans-sc', 700],
      ['noto-sans-sc', 400, 'Noto Sans SC Title'],
    ];
  }
  throw new Error(`Unknown OG font style: ${style}`);
}

function resolveFont(family, weight) {
  return require.resolve(
    `@fontsource/${family}/files/${family}-${families[family][1]}-${weight}-normal.woff`,
  );
}

export function fontFiles(style) {
  return [
    ...new Set(
      specifications(style).map(([family, weight]) =>
        resolveFont(family, weight),
      ),
    ),
  ];
}

export async function loadFonts(style) {
  return Promise.all(
    specifications(style).map(async ([family, weight, name]) => ({
      name: name ?? families[family][0],
      data: await readFile(resolveFont(family, weight)),
      weight: weight === 900 ? 800 : weight,
      style: 'normal',
    })),
  );
}

export default loadFonts;
