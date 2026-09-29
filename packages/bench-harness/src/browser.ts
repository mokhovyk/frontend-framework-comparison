import { chromium, type Browser, type Page, type CDPSession } from 'playwright';
import type { BenchmarkConfig } from './config.js';

export interface BrowserContext {
  browser: Browser;
  page: Page;
  cdp: CDPSession;
  forceGC: () => Promise<void>;
  getHeapUsage: () => Promise<number>;
  close: () => Promise<void>;
}

/**
 * Launch Chromium configured for benchmarking. Uses Playwright's bundled
 * Chromium (new headless mode) unless CHROME_BIN points elsewhere, so the
 * browser always matches the Playwright/CDP version in the lockfile.
 */
export function launchChromium(config: BenchmarkConfig): Promise<Browser> {
  return chromium.launch({
    ...(config.chromePath ? { executablePath: config.chromePath } : { channel: 'chromium' }),
    args: config.chromeFlags,
  });
}

export async function launchBrowser(config: BenchmarkConfig): Promise<BrowserContext> {
  const browser = await launchChromium(config);

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  await cdp.send('Performance.enable');
  await cdp.send('HeapProfiler.enable');

  async function forceGC(): Promise<void> {
    await cdp.send('HeapProfiler.collectGarbage');
    await new Promise((r) => setTimeout(r, config.delayAfterGC));
  }

  async function getHeapUsage(): Promise<number> {
    // Double GC for accurate measurement
    await forceGC();
    await new Promise((r) => setTimeout(r, 1000));
    await forceGC();

    const result = await cdp.send('Runtime.getHeapUsage');
    return result.usedSize;
  }

  async function close(): Promise<void> {
    await cdp.detach();
    await context.close();
    await browser.close();
  }

  return { browser, page, cdp, forceGC, getHeapUsage, close };
}

/** Wait until the app has exposed its benchmark hooks. */
export async function waitForHooks(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __benchmark: unknown }).__benchmark !== 'undefined',
    undefined,
    { timeout: 10000 },
  );
}

/**
 * Navigate to an app and wait for it to be ready.
 */
export async function navigateToApp(ctx: BrowserContext, url: string): Promise<void> {
  const pageErrors: string[] = [];
  const onError = (err: Error) => {
    pageErrors.push(err.message);
    console.warn(`    [page error] ${err.message}`);
  };
  ctx.page.on('pageerror', onError);

  try {
    await ctx.page.goto(url, { waitUntil: 'networkidle' });
    await waitForHooks(ctx.page);
  } catch (err) {
    if (pageErrors.length > 0) {
      throw new Error(`${(err as Error).message} — page errors: ${pageErrors.join('; ')}`);
    }
    throw err;
  } finally {
    ctx.page.off('pageerror', onError);
  }
}

/**
 * Call `window.__benchmark[op](...args)` in the page and wait for it to
 * commit (hooks may return a promise — see BenchmarkHooks contract).
 */
export async function callHook(page: Page, op: string, args: unknown[] = []): Promise<void> {
  await page.evaluate(
    async ([o, a]) => {
      const bm = (
        window as unknown as { __benchmark: Record<string, (...x: unknown[]) => unknown> }
      ).__benchmark;
      await bm[o](...a);
    },
    [op, args] as [string, unknown[]],
  );
}

/**
 * Time `__benchmark[op](...args)` from call → DOM committed → next paint.
 * Paint is detected with requestAnimationFrame + setTimeout(0): the timeout
 * fires after the frame containing the committed DOM has been rendered.
 */
export async function timeHook(page: Page, op: string, args: unknown[] = []): Promise<number> {
  return page.evaluate(
    async ([o, a]) => {
      const bm = (
        window as unknown as { __benchmark: Record<string, (...x: unknown[]) => unknown> }
      ).__benchmark;
      const start = performance.now();
      await bm[o](...a);
      await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
      return performance.now() - start;
    },
    [op, args] as [string, unknown[]],
  );
}
