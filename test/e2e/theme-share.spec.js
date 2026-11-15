import {test,expect} from '@playwright/test';
async function devPage(page, denied=false) {
  // Exercise the development-only attribute with the real built scripts.
  await page.route('http://localhost:5173/**',async route=>{
    if(route.request().resourceType()!=='document')return route.continue();
    const response=await route.fetch();
    const body=(await response.text()).replace(/(<div class="theme-controls" data-theme-selector="")/, '$1 data-theme-share-base="https://example.com/"');
    await route.fulfill({response,body});
  });
  await page.addInitScript(denied=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{if(denied)throw Error('denied');window.copiedThemeURL=text;}}}),denied);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?theme=liquid-glass-dark&mode=dark&palette=indigo&ref=friend#top');
  await page.locator('.theme-picker-open').click();
}
test('production does not expose the developer Copy link control',async({page})=>{
  await page.goto('/');await page.locator('.theme-picker-open').click();
  await expect(page.locator('[data-theme-share-base]')).toHaveCount(0);
  await expect(page.locator('.theme-picker-copy-link')).toHaveCount(0);
});
for(const width of [390,1440])test(`developer copies the exact appearance and public page link at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await devPage(page);
  await page.getByRole('button',{name:'Copy link',exact:true}).click();
  await expect(page.getByRole('button',{name:'Copied!',exact:true})).toBeVisible();
  const url=new URL(await page.evaluate(()=>window.copiedThemeURL));
  expect(url.origin).toBe('https://example.com');expect(url.pathname).toBe('/');expect(url.hash).toBe('#top');
  expect(Object.fromEntries(url.searchParams)).toEqual({ref:'friend',theme:'liquid-glass-dark',mode:'dark',palette:'indigo'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
test('blocked clipboard offers the selected link for manual copying',async({page})=>{
  await devPage(page,true);await page.getByRole('button',{name:'Copy link',exact:true}).click();
  const field=page.getByRole('textbox',{name:'Theme share link'});await expect(field).toBeVisible();await expect(field).toBeFocused();
  expect(await field.inputValue()).toContain('theme=liquid-glass-dark');
  expect(await field.evaluate(el=>el.selectionEnd-el.selectionStart)).toBe((await field.inputValue()).length);
});
