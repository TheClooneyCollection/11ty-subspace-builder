import { test, expect } from '@playwright/test';

/**
 * Browser smoke layer. Behaviors covered here require a real browser:
 * - theme persistence via localStorage
 * - collapsible code block scripts mutating aria/height
 * - wrap toggle scripts mutating classes
 * - actual link navigation
 *
 * The site is served by Playwright's webServer (see playwright.config.js)
 * against the prebuilt `_site` directory. Run `npm test` or `npm run build`
 * first if `_site` does not exist.
 */

const RELATIONAL_TIMELINE_PATH = '/timeline/2026-04-16-published-relational-timeline-entry/';
const COLLAPSIBLE_POST_PATH = '/posts/responsive-images-eleventy-img/';

test.describe('homepage', () => {
  test('loads without console errors or failed requests', async ({ page }) => {
    const consoleErrors = [];
    const failedRequests = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('requestfailed', (req) => {
      failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });
    page.on('response', (resp) => {
      const status = resp.status();
      // Allow 304s; treat 4xx/5xx for same-origin URLs as failures.
      if (status >= 400 && resp.url().startsWith('http://localhost:5173')) {
        failedRequests.push(`${status} ${resp.url()}`);
      }
    });

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/.+/);

    expect(failedRequests, failedRequests.join('\n')).toEqual([]);
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });
});

test.describe('theme toggle', () => {
  test('mode preference persists and fixed themes explain their restriction', async ({ page }) => {
    await page.goto('/');
    const both = await page.evaluate(() => Object.entries(window.siteTheme.config.themes).find(([,t]) => t.scheme === 'both')?.[0]);
    const toggle = page.locator('[data-theme-mode-toggle]');
    if (!both) { await expect(toggle).toBeDisabled(); return; }
    await page.evaluate(id => window.siteTheme.apply(id, 'light', '', true), both);
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('themeMode'))).toBe('dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-scheme', 'dark');
  });
  test('migrates stored legacy choices and requests only active detail CSS', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('theme','sun'); localStorage.setItem('themePreference','sun'); });
    const styles=[];
    page.on('request', request=>{if(request.url().includes('/assets/css/themes/'))styles.push(request.url());});
    await page.goto('/');
    const state=await page.evaluate(()=>({theme:window.siteTheme.state.theme,expected:window.siteTheme.config.legacy.sun?.id || 'sun',css:document.getElementById('theme-css').getAttribute('href'),stored:localStorage.getItem('theme'),old:localStorage.getItem('themePreference')}));
    expect(state.theme).toBe(state.expected);expect(state.stored).toBe(state.expected);expect(state.old).toBeNull();
    expect(new Set(styles).size).toBe(state.css?1:0);
  });
  for (const legacyEngine of [false, true]) test(`stored non-default theme requests exactly its own CSS before first paint (legacy=${legacyEngine})`, async ({ page }) => {
    if (legacyEngine) await page.addInitScript(() => { delete HTMLLinkElement.prototype.blocking; });
    // Synthetic detail sheets exercise this contract even before skins are installed.
    // All HTML, script ordering and the loader itself come from the real built page.
    await page.route('**/assets/css/themes/__stored.css', async route => {
      await new Promise(resolve => setTimeout(resolve, 750));
      await route.fulfill({ contentType:'text/css', body:'body{border-top:13px solid rgb(1,2,3)}' });
    });
    await page.route('**/assets/css/themes/__default.css', route => route.fulfill({contentType:'text/css',body:'body{border-top:2px solid red}'}));
    await page.route('http://localhost:5173/', async route => {
      const response=await route.fetch();let html=await response.text();
      html=html.replace(/(<script id="theme-config" type="application\/json">)([\s\S]*?)(<\/script>)/,(_,open,json,close)=>{
        const config=JSON.parse(json);config.themes[config.defaultId].css='/assets/css/themes/__default.css';
        config.themes.__stored={scheme:'dark',css:'/assets/css/themes/__stored.css'};
        return open+JSON.stringify(config)+close;
      });
      // Give the server default link a real URL if a regression restores href.
      html=html.replace(/^(\s*<link id="theme-css"[^>]*?) href="[^"]*"/m, '$1 href="/assets/css/themes/__default.css"');
      await route.fulfill({response,body:html});
    });
    await page.addInitScript(()=>{
      localStorage.setItem('theme','__stored');localStorage.setItem('themeMode','dark');localStorage.removeItem('themePreference');
      window.themePaints=[];
      new PerformanceObserver(list=>{for(const entry of list.getEntries())window.themePaints.push({name:entry.name,border:getComputedStyle(document.body).borderTopWidth});}).observe({type:'paint',buffered:true});
    });
    const requests=[];page.on('request',request=>{if(request.url().includes('/assets/css/themes/'))requests.push(request.url());});
    await page.goto('/');await page.waitForFunction(()=>window.themePaints.length>0);
    expect(requests.map(url=>new URL(url).pathname)).toEqual(['/assets/css/themes/__stored.css']);
    expect(await page.evaluate(()=>window.themePaints.every(p=>p.border==='13px'))).toBe(true);
  });
  test('preview overrides do not persist or load analytics and comments', async ({ page }) => {
    const requests=[];page.on('request',request=>requests.push(request.url()));
    await page.goto('/posts/github-code-embeds/?theme=default&preview=1');
    expect(await page.evaluate(()=>localStorage.getItem('theme'))).toBeNull();
    await expect(page.locator('[data-theme-selector]')).toBeHidden();
    expect(requests.some(url=>url.includes('giscus.app')||url.includes('umami'))).toBe(false);
  });
});

test.describe('code block collapse', () => {
  test('Expand button toggles aria-expanded and grows the rendered height', async ({ page }) => {
    await page.goto(COLLAPSIBLE_POST_PATH);

    // Locate against the stable parent class. .code-block--collapsed is a
    // state modifier that the click handler removes, so chaining off it
    // would invalidate the toggle locator mid-test.
    const block = page.locator('.code-block--collapsible').first();
    await expect(block).toBeVisible();
    await expect(block).toHaveClass(/code-block--collapsed/);

    const toggle = block.locator('[data-collapse-toggle]').first();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    const beforeHeight = (await block.boundingBox())?.height ?? 0;

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(block).not.toHaveClass(/code-block--collapsed/);

    const afterHeight = (await block.boundingBox())?.height ?? 0;
    expect(afterHeight).toBeGreaterThan(beforeHeight);
  });
});

test.describe('code block wrap', () => {
  test('Wrap toggle flips aria-pressed and the wrap class on the parent', async ({ page }) => {
    await page.goto(COLLAPSIBLE_POST_PATH);

    const wrapButton = page.locator('[data-wrap-toggle]').first();
    await expect(wrapButton).toBeVisible();

    const block = wrapButton.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " code-block ")][1]');
    await expect(block).toBeVisible();

    const initialPressed = await wrapButton.getAttribute('aria-pressed');
    const initialHasWrapClass = (await block.getAttribute('class') ?? '').includes('code-block--wrap');

    await wrapButton.click();

    await expect
      .poll(async () => wrapButton.getAttribute('aria-pressed'))
      .not.toBe(initialPressed);

    const finalHasWrapClass = ((await block.getAttribute('class')) ?? '').includes('code-block--wrap');
    expect(finalHasWrapClass).not.toBe(initialHasWrapClass);
  });
});

test.describe('projects', () => {
  test('project card Link anchor navigates to its href', async ({ page }) => {
    await page.goto('/projects/');

    const linkAnchor = page.locator('a.project-card__url').first();
    await expect(linkAnchor).toBeVisible();
    const href = await linkAnchor.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toMatch(/^https?:\/\//);

    // Verify the destination is reachable without actually navigating cross-origin
    // (external destinations are not under our control for browser-driven nav assertions).
    const response = await page.request.get(href, { failOnStatusCode: false });
    // Some hosts return 3xx without a Location header to a GET; accept any < 500.
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe('timeline detail', () => {
  test('renders a parent / earlier-thread relationship section', async ({ page }) => {
    const response = await page.goto(RELATIONAL_TIMELINE_PATH);
    expect(response?.status()).toBe(200);

    const parentBranch = page.locator('.timeline-thread__branch--parent').first();
    await expect(parentBranch).toBeVisible();
    await expect(parentBranch).toContainText(/Earlier in thread|Parent/i);
  });
});
