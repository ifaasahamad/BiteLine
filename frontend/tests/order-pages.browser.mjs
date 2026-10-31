import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preview } from "vite";

const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : "playwright");
const server = await preview({ preview: { host: "127.0.0.1", port: 0, open: false } });
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
// Test data is intercepted at the network boundary; production uses real APIs.
const cart = [{ _id: "rice", name: "Vegetable Rice", price: 350, quantity: 2 }, { _id: "snack", name: "Vegetable Snack", price: 150, quantity: 1 }];
const order = { _id: "order", tokenNumber: "BL-1793444400000", status: "pending", totalAmount: 850, createdAt: "2026-10-31T10:00:00Z", items: cart.map((item) => ({ ...item, menuItem: item._id })) };
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem("token", "orders-browser-test"));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let checkoutFail = false, historyMode = "normal", refreshed = false, posts = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return route.fulfill({ json: { user: { _id: "customer", name: "Customer", role: "customer" } } });
    if (path === "/api/orders" && route.request().method() === "POST") {
      posts++;
      assert.equal(route.request().headers().authorization, "Bearer orders-browser-test");
      assert.deepEqual(route.request().postDataJSON(), { items: [{ menuItem: "rice", quantity: 2 }, { menuItem: "snack", quantity: 1 }] });
      await new Promise((resolve) => setTimeout(resolve, 600));
      return route.fulfill(checkoutFail ? { status: 400, json: { message: "Item is unavailable" } } : { status: 201, json: { order } });
    }
    if (path.endsWith("/orders/my-orders")) {
      assert.equal(route.request().headers().authorization, "Bearer orders-browser-test");
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (historyMode === "error") return route.fulfill({ status: 500, json: { message: "Could not fetch orders" } });
      return route.fulfill({ json: historyMode === "empty" ? [] : ["completed", "pending", "accepted", "preparing", "ready", "cancelled"].map((status, index) => ({ ...order, _id: `order-${index}`, tokenNumber: `BL-TEST-${index}`, status: refreshed && status === "preparing" ? "ready" : status })) });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto(base + "/cart");
  const seed = async () => {
    await page.evaluate((items) => sessionStorage.setItem("biteline-cart", JSON.stringify(items)), cart);
    await page.goto(base + "/cart"); await page.locator(".cart-item").first().waitFor();
  };
  const fits = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  for (const width of [390, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await seed(); await fits();
    assert.equal(await page.locator(".cart-item").count(), 2);
    assert.ok((await page.locator(".cart-grand-total").textContent()).includes("850.00"));
    const before = posts;
    await page.getByRole("button", { name: "Proceed to Checkout" }).click();
    await page.getByRole("button", { name: "Placing Order..." }).waitFor();
    assert.equal(await page.locator(".cart-item button:not(:disabled)").count(), 0);
    assert.equal(await page.getByRole("button", { name: "Clear Cart" }).isDisabled(), true);
    await page.waitForURL(base + "/order-success");
    assert.equal(posts, before + 1);
    assert.equal(await page.locator(".order-success-token").textContent(), order.tokenNumber);
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem("biteline-cart")).length), 0);
    await fits();
    if ([390, 1366].includes(width)) await page.screenshot({ path: join(tmpdir(), `biteline-success-${width}.png`), fullPage: true });
    await page.getByRole("link", { name: "View My Orders", exact: true }).click();
    await page.locator(".history-order").first().waitFor();
    assert.equal(await page.locator(".history-order").count(), 6);
    assert.equal(await page.locator(".orders-active .history-order").count(), 4);
    assert.equal(await page.locator(".orders-history .history-order").count(), 2);
    for (const status of ["pending", "accepted", "preparing", "ready", "completed", "cancelled"]) assert.equal(await page.locator(`.history-order .status-badge-${status}`).count(), 1);
    await fits();
    if ([390, 1366].includes(width)) await page.screenshot({ path: join(tmpdir(), `biteline-orders-${width}.png`), fullPage: true });
    console.log(`PASS ${width}px: cart, checkout lock, success token, six statuses, active/history and no overflow`);
  }
  await seed();
  await page.getByRole("button", { name: "Increase quantity of Vegetable Rice" }).click();
  assert.equal(await page.locator(".quantity-value").first().textContent(), "3");
  await page.getByRole("button", { name: "Decrease quantity of Vegetable Rice" }).click();
  assert.equal(await page.locator(".quantity-value").first().textContent(), "2");
  await page.getByRole("button", { name: "Decrease quantity of Vegetable Snack" }).click();
  assert.equal(await page.locator(".cart-item").count(), 1);
  await page.getByRole("button", { name: "Remove Vegetable Rice", exact: true }).click();
  await page.getByRole("heading", { name: "Your cart is empty." }).waitFor();
  await seed(); await page.getByRole("button", { name: "Clear Cart" }).click();
  await page.getByRole("heading", { name: "Your cart is empty." }).waitFor();
  await seed(); checkoutFail = true;
  await page.getByRole("button", { name: "Proceed to Checkout" }).click();
  await page.getByRole("alert").waitFor();
  assert.equal(await page.locator(".cart-item").count(), 2);
  assert.equal(await page.getByRole("button", { name: "Proceed to Checkout" }).isEnabled(), true);
  checkoutFail = false;
  await page.goto(base + "/order-success");
  await page.getByRole("heading", { name: "No order information found" }).waitFor();
  await page.goto(base + "/orders"); await page.locator(".history-order").first().waitFor();
  refreshed = true; await page.getByRole("button", { name: "Refresh Status", exact: true }).click();
  await page.getByRole("button", { name: "Refresh Status", exact: true }).waitFor();
  assert.equal(await page.locator(".history-order .status-badge-ready").count(), 2);
  historyMode = "error"; await page.getByRole("button", { name: "Refresh Status", exact: true }).click();
  await page.getByRole("alert").waitFor();
  historyMode = "empty"; await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("heading", { name: "No orders found." }).waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS quantity +/-/zero removal, remove, clear, checkout failure preserves cart, missing success state, refresh/error/retry/empty orders");
  await context.close();
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
