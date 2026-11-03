import { test as base, expect } from '@playwright/test';

export { expect, type Page } from '@playwright/test';

// Only the deployed site enforces the CSP (generated _headers), so this fires only with E2E_BASE_URL pointed there.
export const test = base.extend<{ cspGuard: void }>({
  cspGuard: [async ({ page }, use) => {
    const violations: string[] = [];
    await page.exposeFunction('__reportCspViolation', (v: string) => { violations.push(v); });
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        (window as any).__reportCspViolation(`${e.effectiveDirective} blocked ${e.blockedURI || 'inline'} on ${location.pathname}`);
      });
    });
    await use();
    expect(violations, violations.join('\n')).toEqual([]);
  }, { auto: true }],
});
