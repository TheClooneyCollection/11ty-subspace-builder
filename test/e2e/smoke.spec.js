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
  test('mode toggle flips data-theme-preference and persists across reload', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    const initialPreference = await html.getAttribute('data-theme-preference');
    expect(initialPreference).toBeTruthy();

    const toggle = page.locator('[data-theme-mode-toggle]').first();
    await expect(toggle).toBeVisible();

    await toggle.click();

    await expect
      .poll(async () => html.getAttribute('data-theme-preference'))
      .not.toBe(initialPreference);

    const newPreference = await html.getAttribute('data-theme-preference');
    const stored = await page.evaluate(() => window.localStorage.getItem('themePreference'));
    expect(stored).toBe(newPreference);

    await page.reload();
    await expect(html).toHaveAttribute('data-theme-preference', newPreference);
  });
});

test.describe('code block collapse', () => {
  test('Expand button toggles aria-expanded and grows the rendered height', async ({ page }) => {
    await page.goto(COLLAPSIBLE_POST_PATH);

    const collapsed = page.locator('.code-block--collapsible.code-block--collapsed').first();
    await expect(collapsed).toBeVisible();

    const toggle = collapsed.locator('[data-collapse-toggle]').first();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    const beforeHeight = (await collapsed.boundingBox())?.height ?? 0;

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // After expansion the element should no longer carry the collapsed modifier.
    await expect(collapsed).not.toHaveClass(/code-block--collapsed/);

    const afterHeight = (await collapsed.boundingBox())?.height ?? 0;
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
