import type { Page } from 'playwright'

import type { Vitals } from './types.js'

const INSTALL = `(() => {
  const state = { lcp: null, cls: 0 };
  globalThis.__cwv = state;
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) state.lcp = last.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (error) {
    state.lcpError = String(error);
  }
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) state.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (error) {
    state.clsError = String(error);
  }
})()`

export async function installVitals(page: Page): Promise<void> {
  await page.addInitScript(INSTALL)
}

export async function readVitals(page: Page): Promise<Vitals> {
  await page
    .waitForFunction('globalThis.__cwv && globalThis.__cwv.lcp != null', { timeout: 1_000 })
    .catch(() => undefined)

  const raw = await page.evaluate(`(() => {
    const state = globalThis.__cwv;
    if (!state) return null;
    return { lcpMs: state.lcp, cls: state.cls };
  })()`)

  if (!raw || typeof raw !== 'object') return { lcpMs: null, cls: null }
  const record = raw as { lcpMs?: unknown; cls?: unknown }
  return {
    lcpMs: typeof record.lcpMs === 'number' ? Math.round(record.lcpMs) : null,
    cls: typeof record.cls === 'number' ? Number(record.cls.toFixed(4)) : null,
  }
}
