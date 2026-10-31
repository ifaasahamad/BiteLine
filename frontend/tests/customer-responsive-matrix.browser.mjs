import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { preview } from "vite";

const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : "playwright");
const diagnose = process.argv.includes("--diagnose");
const server = await preview({ preview: { host: "127.0.0.1", port: 0, open: false } });
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem("token", "layout-test"));
  const page = await context.newPage();
  const item = { _id: "food", name: "LongFoodNameWithoutSpaces".repeat(4), price: 350, quantity: 2, available: true, category: { _id: "rice", name: "Rice" } };
  const order = { _id: "order", tokenNumber: "BL-1793444400000", status: "pending", totalAmount: 700, createdAt: "2026-10-31T00:00:00Z", items: [{ ...item, menuItem: item._id }] };
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path.endsWith("/auth/me") ? { user: { role: "customer", name: "Customer" } }
      : path.endsWith("/my-orders") ? ["pending", "ready", "completed", "cancelled"].map((status, index) => ({ ...order, _id: String(index), status }))
        : path === "/api/orders" ? { order } : path === "/api/menu" ? [item] : [{ _id: "rice", name: "Rice" }] });
  });
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  const inspect = async (name, width) => {
    const result = await page.evaluate(() => {
      const main = document.querySelector("#main-content > main");
      const mainBox = main.getBoundingClientRect();
      const problems = [];
      for (const element of document.querySelectorAll(".orders-section-heading > span, .orders-update-note > span, .orders-section, .history-order, .cart-page .customer-empty, .cart-item, .cart-summary, .cart-item button, .checkout-button")) {
        const box = element.getBoundingClientRect();
        if (box.left < mainBox.left - 1 || box.right > mainBox.right + 1 || element.scrollWidth > element.clientWidth + 1) problems.push(element.className || element.tagName);
        if (element.matches(".orders-section-heading > span")) {
          const range = document.createRange(); range.selectNodeContents(element);
          for (const textBox of range.getClientRects()) if (textBox.right > box.right + 1 || textBox.left < box.left - 1) problems.push("clipped order count text");
        }
      }
      for (const heading of document.querySelectorAll(".history-order-heading")) {
        const token = heading.querySelector("h3").getBoundingClientRect();
        const badge = heading.querySelector(".status-badge").getBoundingClientRect();
        if (token.right > badge.left && token.bottom > badge.top && badge.right > token.left && badge.bottom > token.top) problems.push("token/badge overlap");
      }
      return { viewport: innerWidth, scroll: document.documentElement.scrollWidth, problems };
    });
    console.log(`${width}px ${name}: ${JSON.stringify(result)}`);
    if (!diagnose) { assert.ok(result.scroll <= result.viewport); assert.deepEqual(result.problems, []); }
    if (width === 360 && ["empty cart", "orders"].includes(name)) await page.screenshot({ path: join(tmpdir(), `biteline-final-${name.replaceAll(" ", "-")}-360.png`), fullPage: true });
  };
  for (const width of [360, 375, 390, 414, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, selector] of [["/", ".home-hero"], ["/customer", ".customer-recent-order"], ["/menu", ".food-card"], ["/orders", ".history-order"]]) {
      await page.goto(base + path); await page.locator(selector).first().waitFor(); await inspect(path === "/orders" ? "orders" : path, width);
    }
    await page.evaluate(() => sessionStorage.removeItem("biteline-cart"));
    await page.goto(base + "/cart"); await page.locator(".cart-page .customer-empty").waitFor(); await inspect("empty cart", width);
    await page.evaluate((value) => sessionStorage.setItem("biteline-cart", JSON.stringify([value])), item);
    await page.reload(); await page.locator(".cart-item").waitFor(); await inspect("populated cart", width);
    await page.getByRole("button", { name: "Proceed to Checkout" }).click(); await page.waitForURL(base + "/order-success"); await inspect("order success", width);
  }
  await context.close();
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
