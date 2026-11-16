import retro from './templates/retro.js';
import swiss from './templates/swiss.js';
import glass from './templates/glass.js';
import classic from './templates/classic.js';

export function templateName(style) {
  return style.startsWith('glass-') ? 'glass' : style.split('-')[0];
}
export function template(data) {
  return { retro, swiss, glass, classic }[templateName(data.style)](data, data.variant);
}
