import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const card = (page, id, palette = '') => page.locator(`.theme-picker-card[data-id="${id}"][data-palette="${palette}"]`);
const mode = (page, value) => page.locator(`[data-theme-mode-toggle="${value}"]`);
const position = (page, id) => page.evaluate(id => {
  const body = document.querySelector('.theme-picker-body');
  const node = document.querySelector(`.theme-picker-card[data-id="${id}"]:not([hidden])`);
  return { scroll: body.scrollTop, window: scrollY, offset: node?.getBoundingClientRect().top - body.getBoundingClientRect().top };
}, id);

for (const width of [390, 1440]) test.describe(`theme picker at ${width}px`, () => {
  test.use({ viewport: { width, height: 900 } });

  test('browses real scheme-specific home shots and keeps the dropdown open through mode changes', async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?theme=swiss&mode=dark');
    await page.locator('.theme-picker-open').click();
    const panel = page.getByRole('dialog');
    await expect(panel.getByRole('radio')).toHaveCount(10);
    for (const scheme of ['dark', 'light']) {
      await mode(page, scheme).click();
      await expect(panel).toBeVisible();
      await expect(panel.getByRole('radio')).toHaveCount(scheme === 'dark' ? 10 : 8);
      const shots = panel.locator('.theme-picker-card:not([hidden]) img');
      for (const shot of await shots.all()) {
        await shot.scrollIntoViewIfNeeded();
        await expect.poll(() => shot.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
        expect(await shot.getAttribute('src')).toContain(scheme);
      }
    }
    await page.locator('.theme-picker-body').evaluate(body => { body.scrollTop = 0; });
    await expect(page.locator('.theme-picker-name')).toBeVisible();
    await fs.mkdir('.temp/picker-review', { recursive: true });
    await page.screenshot({ path: `.temp/picker-review/picker-light-${width}.png` });
    await mode(page, 'dark').click();
    await expect.poll(() => panel.locator('.theme-picker-card:not([hidden]) img').first().evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: `.temp/picker-review/picker-dark-${width}.png` });
    expect(errors).toEqual([]);
  });

  test('dropdown chrome follows the page scheme, not the theme', async ({ page }) => {
    const luminance = locator => locator.evaluate(node => {
      const [r, g, b] = getComputedStyle(node).backgroundColor.match(/\d+/g).map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    });
    await page.goto('/?theme=brutalist&mode=dark');
    await page.locator('.theme-picker-open').click();
    const panel = page.getByRole('dialog');
    for (const scheme of ['dark', 'light', 'dark']) {
      await mode(page, scheme).click();
      await expect(page.locator('html')).toHaveAttribute('data-scheme', scheme);
      for (const part of [panel, panel.locator('.theme-picker-footer'), panel.locator('.theme-picker-card:not([hidden])').first()]) {
        const value = await luminance(part);
        if (scheme === 'dark') expect(value).toBeLessThan(0.25); else expect(value).toBeGreaterThan(0.75);
      }
      await expect(panel.locator('.theme-picker-status')).toHaveText('Current Brutalist · light / dark');
    }
  });

  test('lower card preview, scheme flip, and Use preserve panel and page scroll', async ({ page }) => {
    await page.goto('/?theme=swiss&mode=dark');
    await page.evaluate(() => scrollTo(0, 450));
    await page.locator('.theme-picker-open').click();
    const lower = card(page, 'retro-futurist');
    await lower.scrollIntoViewIfNeeded();
    const chrome = await page.getByRole('dialog').evaluate(node => ({ background: getComputedStyle(node).backgroundColor, radius: getComputedStyle(node).borderRadius }));
    const before = await position(page, 'retro-futurist');
    expect(before.scroll).toBeGreaterThan(0);
    await lower.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'retro-futurist');
    await expect.poll(async () => Math.abs((await position(page, 'retro-futurist')).scroll - before.scroll)).toBeLessThan(2);
    await expect.poll(async () => Math.abs((await position(page, 'retro-futurist')).window - before.window)).toBeLessThan(2);
    expect(await page.getByRole('dialog').evaluate(node => ({ background: getComputedStyle(node).backgroundColor, radius: getComputedStyle(node).borderRadius }))).toEqual(chrome);
    const preview = await position(page, 'retro-futurist');
    await mode(page, 'light').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect.poll(async () => Math.abs((await position(page, 'retro-futurist')).offset - preview.offset)).toBeLessThan(2);
    await expect.poll(async () => Math.abs((await position(page, 'retro-futurist')).window - preview.window)).toBeLessThan(2);
    const flipped = await position(page, 'retro-futurist');
    await page.locator('.theme-picker-apply').click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(flipped.window);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('retro-futurist');
  });

  test('Halo keeps its Starship light partner through Use and returns on dark', async ({ page }) => {
    await page.goto('/?theme=swiss&mode=dark');
    await page.locator('.theme-picker-open').click();
    await card(page, 'holo').click();
    await mode(page, 'light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'starship');
    await expect(page.locator('.theme-picker-status')).toContainText('light partner of Halo');
    await page.locator('.theme-picker-apply').click();
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('holo');
    await mode(page, 'dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'holo');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'holo');
  });

  test('Indigo survives both schemes and clearing the manual theme; Escape cancels a new preview', async ({ page }) => {
    await page.goto('/?theme=swiss&mode=dark');
    await page.locator('.theme-picker-open').click();
    await card(page, 'liquid-glass-dark', 'indigo').click();
    await page.locator('.theme-picker-apply').click();
    await page.locator('.theme-picker-open').click();
    await mode(page, 'light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'liquid-glass-light');
    await mode(page, 'dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'indigo');
    await page.locator('.theme-picker-reset').click();
    await expect(page.locator('.theme-picker-reset')).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('themePalette'))).toBe('indigo');
    const defaultTheme = await page.locator('html').getAttribute('data-theme');
    await card(page, 'paper').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).toHaveAttribute('data-theme', defaultTheme);
    await expect(page.locator('.theme-picker-open')).toBeFocused();
    await page.reload();
    expect(await page.evaluate(() => localStorage.getItem('themePalette'))).toBe('indigo');
  });
});
