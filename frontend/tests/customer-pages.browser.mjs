import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preview } from "vite";

const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : "playwright");
const server = await preview({ preview: { host: "127.0.0.1", port: 0, open: false } });
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
// Fixtures are confined to browser tests. The application always calls its APIs.
const categories = [{ _id: "rice", name: "Rice" }, { _id: "snacks", name: "Snacks" }];
const photo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#e6eadd"/><circle cx="300" cy="200" r="130" fill="#faf8f2"/><circle cx="300" cy="200" r="95" fill="#b1be8d"/></svg>')}`;
const menu = Array.from({ length: 8 }, (_, index) => ({
  _id: `food-${index}`, name: index === 0 ? "Vegetable Rice" : index === 1 ? "Unavailable Snack" : `Test Dish ${index}`,
  description: "A freshly prepared meal with seasonal ingredients.", price: 350 + index * 10,
  category: categories[index % 2], available: index !== 1,
  image: index === 0 ? photo : index === 2 ? "https://test.invalid/missing.jpg" : "",
}));
const orders = ["preparing", "ready", "completed", "pending"].map((status, index) => ({
  _id: `order-${index}`, tokenNumber: `BL-TEST-${index}`, status, totalAmount: 700,
  createdAt: new Date(Date.now() - index * 60000).toISOString(), items: [{ name: "Vegetable Rice", quantity: 2 }],
}));
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem("token", "customer-browser-test"));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let menuMode = "normal", orderMode = "normal", menuRequests = 0, categoryRequests = 0;
  await page.route("https://test.invalid/**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { user: { _id: "customer", name: "Test Customer", role: "customer" } } });
    if (path === "/api/menu") {
      menuRequests++;
      if (menuMode === "error") return route.fulfill({ status: 500, json: { message: "Menu unavailable for test" } });
      await new Promise((resolve) => setTimeout(resolve, 200));
      return route.fulfill({ json: menuMode === "empty" ? [] : menu });
    }
    if (path === "/api/categories") { categoryRequests++; return route.fulfill({ json: categories }); }
    if (path === "/api/orders/my-orders") {
      assert.equal(route.request().headers().authorization, "Bearer customer-browser-test");
      if (orderMode === "error") return route.fulfill({ status: 500, json: { message: "Orders unavailable for test" } });
      return route.fulfill({ json: orderMode === "empty" ? [] : orders });
    }
    return route.fulfill({ json: [] });
  });
  for (const [width, columns] of [[390, 1], [768, 2], [1366, 3], [1920, 4]]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + "/menu");
    await page.locator(".food-card").first().waitFor();
    assert.equal(await page.locator(".food-card").count(), 8);
    const layout = await page.evaluate(() => ({
      columns: getComputedStyle(document.querySelector(".customer-food-grid")).gridTemplateColumns.split(" ").length,
      overflow: document.documentElement.scrollWidth > innerWidth,
      cardsFit: [...document.querySelectorAll(".food-card")].every((card) => card.getBoundingClientRect().right <= innerWidth),
      imagesFit: [...document.querySelectorAll(".food-image-area img")].every((img) => img.getBoundingClientRect().width <= img.closest(".food-card").getBoundingClientRect().width),
    }));
    assert.equal(layout.columns, columns); assert.equal(layout.overflow, false); assert.equal(layout.cardsFit, true); assert.equal(layout.imagesFit, true);
    assert.equal(await page.getByRole("button", { name: "Unavailable Snack is unavailable" }).isDisabled(), true);
    await page.goto(base + "/customer");
    await page.locator(".customer-recent-order").first().waitFor();
    assert.equal(await page.locator(".customer-recent-order").count(), 3);
    assert.ok(await page.getByText("3 orders are in progress.", { exact: false }).count());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.locator(".customer-quick-card").count(), 3);
    if (width === 390 || width === 1366) {
      await page.screenshot({ path: join(tmpdir(), `biteline-customer-${width}.png`), fullPage: true });
      await page.goto(base + "/menu"); await page.locator(".food-card").first().waitFor();
      await page.screenshot({ path: join(tmpdir(), `biteline-menu-${width}.png`), fullPage: true });
    }
    console.log(`PASS ${width}px: menu ${columns} columns; dashboard/cards/images fit`);
  }

  await page.goto(base + "/menu");
  await page.locator(".food-card").first().waitFor();
  const calls = [menuRequests, categoryRequests];
  await page.getByLabel("Search the menu").fill("VEGETABLE");
  assert.equal(await page.locator(".food-card").count(), 1);
  await page.getByLabel("Category", { exact: true }).selectOption("snacks");
  await page.getByText("No menu items found.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Clear filters" }).first().click();
  await page.getByLabel("Category", { exact: true }).selectOption("rice");
  assert.equal(await page.locator(".food-card").count(), 4);
  assert.deepEqual([menuRequests, categoryRequests], calls, "filtering must not refetch data");
  await page.getByRole("button", { name: "Add Vegetable Rice to cart", exact: true }).click();
  await page.getByRole("button", { name: "Add Vegetable Rice to cart", exact: true }).click();
  await page.getByText("Vegetable Rice added to cart", { exact: false }).waitFor();
  await page.getByRole("link", { name: "View cart (2)" }).click();
  await page.getByRole("heading", { name: "Your Cart" }).waitFor();
  assert.ok(await page.getByText("Quantity: 2", { exact: true }).count());
  await page.reload();
  await page.getByText("Quantity: 2", { exact: true }).waitFor();
  console.log("PASS search + category + empty results, no filter refetch, duplicate add, cart route and persistence");

  menuMode = "error"; await page.goto(base + "/menu"); await page.getByRole("alert").waitFor();
  menuMode = "empty"; await page.getByRole("button", { name: "Try again" }).click();
  await page.getByText("The menu is on its way.").waitFor();
  menuMode = "normal"; await page.reload();
  await page.getByText("Loading menu…", { exact: true }).waitFor();
  await page.locator(".food-card").first().waitFor();
  orderMode = "error"; await page.goto(base + "/customer"); await page.getByRole("alert").waitFor();
  orderMode = "empty"; await page.getByRole("button", { name: "Try again" }).click();
  await page.getByText("Your first bite is waiting.").waitFor();
  orderMode = "normal"; await page.getByRole("button", { name: "Refresh status" }).click();
  await page.locator(".customer-recent-order").first().waitFor();
  console.log("PASS menu loading/error/retry/empty and dashboard error/retry/empty/refresh");
  assert.deepEqual(errors, []);
  await context.close();
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
