import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { preview } from "vite";

const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : "playwright");
const diagnose = process.argv.includes("--diagnose");
const server = await preview({ preview: { host: "127.0.0.1", port: 0, open: false } });
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  const cart = [{ _id: "food", name: "LongFoodNameWithoutSpaces".repeat(8), price: 1234567890123.45, quantity: 2 }];
  await context.addInitScript((items) => {
    localStorage.setItem("token", "overflow-test");
    sessionStorage.setItem("biteline-cart", JSON.stringify(items));
  }, cart);
  const page = await context.newPage();
  await page.route("**/api/**", (route) => route.fulfill({ json: route.request().url().endsWith("/auth/me")
    ? { user: { role: "customer", name: "Test" } }
    : ["pending", "ready", "completed", "cancelled"].map((status, index) => ({
      _id: `order-${index}`, status, tokenNumber: `BL-${"1234567890".repeat(7)}`,
      totalAmount: 1234567890123.45, createdAt: "2026-10-31T00:00:00Z",
      items: [{ name: cart[0].name, quantity: 2 }],
    })) }));
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (const width of [360, 390, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/cart", "/orders"]) {
      await page.goto(base + path);
      await page.locator(path === "/cart" ? ".cart-item" : ".history-order").first().waitFor();
      const result = await page.evaluate(() => {
        const offenders = [...document.querySelectorAll("#main-content *")].filter((element) => {
          const box = element.getBoundingClientRect();
          return box.width && (box.right > innerWidth + 1 || box.left < -1 || element.scrollWidth > element.clientWidth + 1);
        }).map((element) => {
          const css = getComputedStyle(element);
          return { element: element.className || element.tagName, width: Math.round(element.getBoundingClientRect().width), scroll: element.scrollWidth, grid: css.gridTemplateColumns, minWidth: css.minWidth };
        });
        const heading = document.querySelector(".history-order-heading");
        let noOverlap = true;
        if (heading) {
          const token = heading.querySelector("h3").getBoundingClientRect();
          const badge = heading.querySelector(".status-badge").getBoundingClientRect();
          noOverlap = token.right <= badge.left || token.bottom <= badge.top;
        }
        const list = document.querySelector(".cart-item-list")?.getBoundingClientRect();
        const summary = document.querySelector(".cart-summary")?.getBoundingClientRect();
        return { viewport: innerWidth, scroll: document.documentElement.scrollWidth, offenders, noOverlap, stacked: !list || !summary || summary.top >= list.bottom };
      });
      console.log(`${path} ${width}px: ${JSON.stringify(result)}`);
      if (!diagnose) {
        assert.ok(result.scroll <= result.viewport, `${path} ${width}px document must fit`);
        assert.deepEqual(result.offenders, [], `${path} ${width}px every descendant must fit`);
        assert.equal(result.noOverlap, true);
        if (width < 768 && path === "/cart") assert.equal(result.stacked, true);
      }
    }
  }
  await context.close();
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
