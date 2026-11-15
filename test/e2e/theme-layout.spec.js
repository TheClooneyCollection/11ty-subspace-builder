import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import yaml from 'js-yaml';
const themes=yaml.load(fs.readFileSync('_data/themes.yaml','utf8')).filter(t=>!t.hidden&&!t.retired);
for(const width of [390,1440]) test(`home introduction precedes Latest Posts in every theme at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const t of themes)for(const mode of t.scheme==='both'?['light','dark']:[t.scheme]){
    await page.goto(`/?theme=${t.id}&mode=${mode}`);
    await page.waitForFunction(()=>document.getElementById('theme-css').sheet!==null);
    const intro=await page.locator('.home-intro').boundingBox();
    const heading=await page.locator('.home-posts > h1').boundingBox();
    expect(heading.y,`${t.id}/${mode}`).toBeGreaterThanOrEqual(intro.y+intro.height-1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth),`${t.id}/${mode} overflow`).toBeLessThanOrEqual(width);
  }
});
for(const mode of ['light','dark'])test(`Zine navigation keeps dark ink on yellow buttons in ${mode}`,async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(`/?theme=zine&mode=${mode}`);
  const links=page.locator('[data-region=sidebar] a');
  for(const link of await links.all()){
    await expect(link).toHaveCSS('color','rgb(22, 20, 65)');
    await link.hover();await expect(link).toHaveCSS('color','rgb(22, 20, 65)');
    await link.focus();await expect(link).toHaveCSS('color','rgb(22, 20, 65)');
  }
});
