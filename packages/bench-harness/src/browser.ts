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
 * Launch a Chrome instance configured for benchmarking.
 */
export async function launchBrowser(config: BenchmarkConfig): Promise<BrowserContext> {
  const browser = await chromium.launch({
    executablePath: config.chromePath,
    args: config.chromeFlags,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  // Enable performance monitoring
  await cdp.send('Performance.enable');

  async function forceGC(): Promise<void> {
    await page.evaluate(() => {
      if (typeof (window as unknown as { gc: () => void }).gc === 'function') {
        (window as unknown as { gc: () => void }).gc();
      }
    });
    await new Promise((r) => setTimeout(r, config.delayAfterGC));
  }

  async function getHeapUsage(): Promise<number> {
    // Double GC for accurate measurement
    await forceGC();
    await new Promise((r) => setTimeout(r, 1000));
    await forceGC();

    const result = await cdp.send('Runtime.getHeapUsage' as string);
    return (result as unknown as { usedSize: number }).usedSize;
  }

  async function close(): Promise<void> {
    await cdp.detach();
    await context.close();
    await browser.close();
  }

  return { browser, page, cdp, forceGC, getHeapUsage, close };
}

/**
 * Navigate to an app and wait for it to be ready.
 */
export async function navigateToApp(ctx: BrowserContext, url: string): Promise<void> {
  await ctx.page.goto(url, { waitUntil: 'networkidle' });
  // Wait for the benchmark hooks to be available
  await ctx.page.waitForFunction(
    () => typeof (window as unknown as { __benchmark: unknown }).__benchmark !== 'undefined',
    { timeout: 10000 }
  );
}
