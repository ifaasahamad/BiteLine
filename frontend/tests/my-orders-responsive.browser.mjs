import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { preview } from "vite";

const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : "playwright");
const server = await preview({ preview: { host: "127.0.0.1", port: 0, open: false } });
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem("token", "responsive-test"));
  const page = await context.newPage();
  let calls = 0;
  await page.route("**/api/**", (route) => {
    if (route.request().url().endsWith("/auth/me")) return route.fulfill({ json: { user: { role: "customer", name: "Test" } } });
    calls++;
    return route.fulfill({ json: ["pending", "accepted", "preparing", "ready", "completed", "cancelled"].map((status, index) => ({
      _id: `order-${index}`, tokenNumber: `BL-${"1234567890".repeat(7)}`, status,
      totalAmount: 1234567890123.45, createdAt: "2026-10-31T00:00:00Z",
      items: [{ name: "VeryLongUnbrokenFoodName".repeat(12), quantity: 1234 }],
    })) });
  });
  for (const width of [390, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/orders`);
    await page.locator(".history-order").first().waitFor();
    const result = await page.evaluate(() => {
      const fits = (element) => {
        const box = element.getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth + 1 && element.scrollWidth <= element.clientWidth + 1;
      };
      const heading = document.querySelector(".history-order-heading");
      const token = heading.querySelector("h3").getBoundingClientRect();
      const badge = heading.querySelector(".status-badge").getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        fits: [...document.querySelectorAll(".history-order, .history-order li, .history-order-total, .orders-section-heading, .orders-section-heading > span, .page-actions button")].every(fits),
        noOverlap: badge.left >= token.right || badge.top >= token.bottom,
        cardWidth: document.querySelector(".history-order").getBoundingClientRect().width,
        contentWidth: document.querySelector(".orders-page").getBoundingClientRect().width,
      };
    });
    assert.equal(result.overflow, false);
    assert.equal(result.fits, true);
    assert.equal(result.noOverlap, true);
    if (width >= 1366) assert.ok(result.cardWidth > 480);
    const before = calls;
    await page.getByRole("button", { name: "Refresh Status", exact: true }).click();
    await page.getByRole("button", { name: "Refresh Status", exact: true }).waitFor();
    assert.ok(calls > before);
    console.log(`PASS ${width}px: no overflow/overlap, count visible, long content wraps, refresh works; content ${result.contentWidth}px, card ${Math.round(result.cardWidth)}px`);
  }
  await context.close();
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
