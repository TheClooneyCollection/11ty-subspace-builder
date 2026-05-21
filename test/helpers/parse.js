import { parseHTML } from 'linkedom';
import { readSitePage, readSiteFile } from './build-once.js';

export const parseHtml = (html) => parseHTML(html);

export const parsePage = (urlPath) => parseHtml(readSitePage(urlPath));

export const parseFile = (relativePath) => parseHtml(readSiteFile(relativePath));

export const textOf = (node) => (node?.textContent || '').trim();

export const selectAll = (root, selector) =>
  Array.from(root.querySelectorAll(selector));
