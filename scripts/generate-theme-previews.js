/** Capture the built public home page. Run npm run build first, then this script,
 * then build again to publish updated fingerprinted shots. No production server is used. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import yaml from 'js-yaml';
import { chromium } from '@playwright/test';
import Image from '@11ty/eleventy-img';
const root = path.resolve('_site');
const destination = 'assets/images/theme-previews';
const themes = yaml.load(fs.readFileSync('_data/themes.yaml', 'utf8')).filter(t => !t.hidden && !t.retired);
const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server = http.createServer((req, res) => {
  let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');res.end(fs.readFileSync(file));
  } catch {res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch();
  for (const theme of themes) {
    const shots = Object.entries(theme.shots).map(([scheme,url]) => ({scheme,url,palette:''}));
    for (const [palette,url] of Object.entries(theme.paletteShots || {})) if (!shots.some(shot => shot.url === url)) shots.push({scheme:theme.scheme,url,palette});
    for (const {scheme,url,palette} of shots) {
      const page = await browser.newPage({viewport:{width:1440,height:900},colorScheme:scheme,reducedMotion:'reduce'});
      // Preserve the site's layout stylesheet; silence unrelated analytics/comments.
      await page.route(/giscus|umami/, route => route.fulfill({body:''}));
      const query = new URLSearchParams({theme:theme.id,mode:scheme,...(palette?{palette}:{})});
      await page.goto(`http://127.0.0.1:${server.address().port}/?${query}`,{waitUntil:'load'});
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(id => document.documentElement.dataset.theme === id, theme.id);
      const css = await page.locator('#theme-css').getAttribute('href');
      if (!css || !await page.evaluate(() => document.getElementById('theme-css').sheet !== null)) throw new Error(`Theme CSS missing: ${theme.id}`);
      const buffer = await page.screenshot();
      // The image pipeline skips an existing custom filename; remove only this
      // declared output so a changed capture really replaces its prior bytes.
      fs.rmSync(path.join(destination,path.basename(url)), {force:true});
      await Image(buffer,{widths:[600],formats:['webp'],outputDir:destination,filenameFormat:()=>path.basename(url),sharpWebpOptions:{quality:65}});
      console.log(url);await page.close();
    }
  }
} finally {await browser?.close();await new Promise(resolve => server.close(resolve));}
