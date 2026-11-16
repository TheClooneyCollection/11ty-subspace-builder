import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const card = (page, id, palette = '') => page.locator(`.theme-picker-card[data-id="${id}"][data-palette="${palette}"]`);
const mode = (page, value) => page.locator(`[data-theme-mode-toggle="${value}"]`);
// Playwright scrolls the window when it clicks during a view transition, so wait out the crossfade.
const settled = page => page.waitForFunction(() => !document.documentElement.matches(':active-view-transition'));
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

  test('switching themes never paints a frame without the new theme styles', async ({ page }) => {
    const sheets = [];
    page.on('request', request => { if (/\/assets\/css\/themes[./]/.test(request.url())) sheets.push(new URL(request.url()).pathname); });
    // Reduced motion turns off the crossfade and the colour transitions, so each frame shows a settled value.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?theme=swiss&mode=dark');
    await page.evaluate(() => {
      window.__frames = [];
      const check = () => {
        const root = document.documentElement;
        const look = ['html', 'body', '.site-header', '[data-region=masthead]', '.home-posts > h1', '.home-intro'].map(selector => {
          const node = document.querySelector(selector);
          if (!node) return '-';
          const style = getComputedStyle(node);
          return [style.backgroundColor, style.backgroundImage.slice(0, 40), style.color, style.fontFamily, style.fontSize, style.padding, style.borderWidth].join(' ');
        }).join(' | ');
        window.__frames.push({ id: `${root.dataset.theme}/${root.dataset.scheme}`, look });
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
    await page.locator('.theme-picker-open').click();
    for (const id of ['brutalist', 'zine', 'retro-futurist']) {
      await card(page, id).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', id);
    }
    await page.keyboard.press('Escape');
    await mode(page, 'light').click();
    await expect(page.locator('html')).toHaveAttribute('data-scheme', 'light');
    await page.waitForTimeout(600);
    const frames = await page.evaluate(() => window.__frames);
    // Each theme's last frame is its settled look; every earlier frame under that theme must already match it.
    const settled = Object.fromEntries(frames.map(frame => [frame.id, frame.look]));
    expect(Object.keys(settled)).toEqual(['swiss/dark', 'brutalist/dark', 'zine/dark', 'retro-futurist/dark', 'retro-futurist/light']);
    expect(new Set(Object.values(settled)).size).toBe(5);
    expect(frames.filter(frame => frame.look !== settled[frame.id]).map(frame => frame.id)).toEqual([]);
    // One bundle holds every theme; switching never fetches another sheet.
    expect(sheets).toHaveLength(1);
    expect(sheets[0]).toMatch(/^\/assets\/css\/themes\.[a-f0-9]{10}\.css$/);
  });

  for (const reducedMotion of ['no-preference', 'reduce']) test(`theme switch crossfade is ${reducedMotion === 'reduce' ? 'off' : 'on'} with reduced motion ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/?theme=swiss&mode=dark');
    const supported = await page.evaluate(() => {
      window.__fades = 0;
      if (!document.startViewTransition) return false;
      const start = document.startViewTransition.bind(document);
      document.startViewTransition = update => { window.__fades += 1; return start(update); };
      return true;
    });
    expect(supported).toBe(true);
    await page.locator('.theme-picker-open').click();
    await card(page, 'zine').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'zine');
    await settled(page);
    await mode(page, 'light').click();
    await expect(page.locator('html')).toHaveAttribute('data-scheme', 'light');
    expect(await page.evaluate(() => window.__fades)).toBe(reducedMotion === 'reduce' ? 0 : 2);
    // site.theme.fadeDuration and fadeBlur reach the crossfade.
    expect(await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement, '::view-transition-new(root)');
      return [style.animationDuration, style.animationName, style.getPropertyValue('--theme-fade-blur').trim()];
    })).toEqual(['0.7s', 'theme-fade-in', '8px']);
    // With no configured custom properties, the CSS fallback keeps the same feel.
    await page.addStyleTag({ content: 'html { --theme-fade-duration: initial !important; --theme-fade-blur: initial !important; }' });
    expect(await page.evaluate(() => {
      const duration = getComputedStyle(document.documentElement, '::view-transition-new(root)').animationDuration;
      const probe = document.createElement('div');
      probe.style.animation = 'theme-fade-in 1s paused both';
      document.body.append(probe);
      const blur = getComputedStyle(probe).filter;
      probe.remove();
      return [duration, blur];
    })).toEqual(['0.7s', reducedMotion === 'reduce' ? 'none' : 'blur(8px)']);
  });

  test('clicks save immediately and each opening has its own Revert target', async ({ page }) => {
    await page.goto('/?theme=swiss&mode=dark');
    await page.evaluate(() => window.siteTheme.apply('swiss','dark','',true));
    await page.locator('.theme-picker-open').click();
    await expect(page.locator('.theme-picker-revert')).toBeHidden();
    await card(page,'zine').click();
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('zine');
    await expect(page.locator('.theme-picker-revert')).toHaveText('Revert to Swiss');
    await settled(page);
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme','zine');
    await page.locator('.theme-picker-open').click();
    await card(page,'paper').click();
    await expect(page.locator('.theme-picker-revert')).toHaveText('Revert to Zine');
    await settled(page);
    await page.locator('.theme-picker-revert').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme','zine');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('zine');
    await expect(page.locator('.theme-picker-revert')).toBeHidden();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('Revert restores the opening palette and mode, including a Halo partner', async ({page}) => {
    await page.goto('/');
    await page.evaluate(() => window.siteTheme.apply('liquid-glass-dark','dark','indigo',true));
    await settled(page);
    await page.locator('.theme-picker-open').click();
    await card(page,'liquid-glass-dark','aurora').click();
    await settled(page);await mode(page,'light').click();await settled(page);
    await page.locator('.theme-picker-revert').click();
    await expect(page.locator('html')).toHaveAttribute('data-palette','indigo');
    await expect(page.locator('html')).toHaveAttribute('data-scheme','dark');
    await settled(page);await page.keyboard.press('Escape');
    await page.evaluate(() => window.siteTheme.apply('holo','light','indigo',true));
    await settled(page);await page.locator('.theme-picker-open').click();
    await card(page,'paper').click();await settled(page);
    await page.locator('.theme-picker-revert').click();
    await expect(page.locator('.theme-picker-status')).toContainText('light partner of Halo');
    await settled(page);await mode(page,'dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme','holo');
  });

  test('a tap during the crossfade still picks the tapped card', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?theme=swiss&mode=dark');
    await page.locator('.theme-picker-open').click();
    // A DOM click starts the fade without Playwright scrolling the page mid-transition.
    await card(page, 'brutalist').evaluate(node => node.click());
    // Tap the middle of whichever other card shows in the panel body.
    const box = await page.evaluate(() => {
      const body = document.querySelector('.theme-picker-body').getBoundingClientRect();
      for (const node of document.querySelectorAll('.theme-picker-card:not([hidden]):not([data-id="brutalist"])')) {
        const rect = node.getBoundingClientRect();
        const top = Math.max(rect.top, body.top), bottom = Math.min(rect.bottom, body.bottom, innerHeight);
        if (bottom - top > 40) return { id: node.dataset.id, active: document.documentElement.matches(':active-view-transition'), x: rect.x + rect.width / 2, y: (top + bottom) / 2 };
      }
    });
    expect(box.active).toBe(true);
    // A raw tap, as a reader would make it, while Chromium still hit-tests the root.
    await page.mouse.click(box.x, box.y);
    await expect(page.locator('html')).toHaveAttribute('data-theme', box.id);
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('lower card selection, scheme flip, and closing preserve panel and page scroll', async ({ page }) => {
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
    await settled(page);
    await expect.poll(async () => Math.abs((await position(page, 'retro-futurist')).scroll - before.scroll)).toBeLessThan(2);
    await expect.poll(async () => Math.abs((await position(page, 'retro-futurist')).window - before.window)).toBeLessThan(2);
    expect(await page.getByRole('dialog').evaluate(node => ({ background: getComputedStyle(node).backgroundColor, radius: getComputedStyle(node).borderRadius }))).toEqual(chrome);
    const preview = await position(page, 'retro-futurist');
    await mode(page, 'light').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect.poll(async () => Math.abs((await position(page, 'retro-futurist')).offset - preview.offset)).toBeLessThan(2);
    await expect.poll(async () => Math.abs((await position(page, 'retro-futurist')).window - preview.window)).toBeLessThan(2);
    const flipped = await position(page, 'retro-futurist');
    await settled(page);await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(flipped.window);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('retro-futurist');
  });

  test('Halo keeps its Starship light partner after immediate selection and returns on dark', async ({ page }) => {
    await page.goto('/?theme=swiss&mode=dark');
    await page.locator('.theme-picker-open').click();
    await card(page, 'holo').click();
    await mode(page, 'light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'starship');
    await expect(page.locator('.theme-picker-status')).toContainText('light partner of Halo');
    await settled(page);await page.keyboard.press('Escape');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('holo');
    await mode(page, 'dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'holo');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'holo');
  });

  test('Indigo survives both schemes and clearing the manual theme; Escape keeps a new selection', async ({ page }) => {
    await page.goto('/?theme=swiss&mode=dark');
    await page.locator('.theme-picker-open').click();
    await card(page, 'liquid-glass-dark', 'indigo').click();
    await settled(page);await page.keyboard.press('Escape');
    await page.locator('.theme-picker-open').click();
    await mode(page, 'light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'liquid-glass-light');
    await mode(page, 'dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'indigo');
    await page.locator('.theme-picker-reset').click();
    await expect(page.locator('.theme-picker-reset')).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('themePalette'))).toBe('indigo');
    // A theme switch paints once its sheet has loaded, so wait for the page to catch up with the runtime.
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme === window.siteTheme.state.theme)).toBe(true);
    const defaultTheme = await page.locator('html').getAttribute('data-theme');
    await card(page, 'paper').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
    await expect(page.locator('.theme-picker-open')).toBeFocused();
    await page.reload();
    expect(await page.evaluate(() => localStorage.getItem('themePalette'))).toBe('indigo');
  });
});
