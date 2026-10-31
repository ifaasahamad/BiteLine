import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { createServer } from "vite";
const require = createRequire(import.meta.url);
const { configureIntegration, assertTestConnection } = require("../../backend/tests/integration/environment");
const { openHarness, registerCustomers } = require("../../backend/tests/integration/harness");
const mongoose = require("../../backend/node_modules/mongoose");
const Order = require("../../backend/models/Order");
const User = require("../../backend/models/User");
const Category = require("../../backend/models/Category");
const MenuItem = require("../../backend/models/MenuItem");

let harness, vite, browser, config;
let currentStep = "setup", passed = 0;
const categoryName = "Browser test category", editedCategory = "Browser test category edited";
const itemName = "Browser test meal", editedItem = "Browser test meal edited";
const frontend = "http://127.0.0.1:5174";
const api = "http://127.0.0.1:5001/api";
const consoleErrors = [];
async function check(name, action) {
  currentStep = name;
  await action();
  passed++;
  console.log(`PASS ${name}`);
}
async function newPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on("pageerror", (error) => consoleErrors.push(error.name));
  return page;
}
async function login(page, email, destination) {
  await page.goto(`${frontend}/login`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(harness.fixtures.password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForURL(`${frontend}${destination}`);
}
const token = (page) => page.evaluate(() => localStorage.getItem("token"));
async function browserRequest(page, method, path, data) {
  return page.request.fetch(api + path, { method, data, headers: { Authorization: `Bearer ${await token(page)}` } });
}
async function mutation(page, action, method, path) {
  const [response] = await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).pathname === path && response.request().method() === method), action(),
  ]);
  assert.ok(response.status() >= 200 && response.status() < 300);
  return response.json();
}

try {
  config = configureIntegration();
  harness = await openHarness(config, 5001);
  await registerCustomers(harness);
  vite = await createServer({ mode: "integration", server: { host: "127.0.0.1", port: 5174, strictPort: true, open: false } });
  await vite.listen();
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const customer = await newPage(), staff = await newPage(), admin = await newPage(), guest = await newPage();
  let order;

  await check("customer creates a real order for staff testing", async () => {
    await login(customer, "customer1@example.test", "/customer");
    const response = await harness.request("POST", "/orders", { items: [{ menuItem: String(harness.fixtures.available._id), quantity: 2 }] }, await token(customer));
    assert.equal(response.status, 201);
    order = response.data.order;
    harness.fixtures.createdOrderIds.add(order._id);
    await customer.goto(`${frontend}/orders`);
    await customer.getByRole("heading", { name: order.tokenNumber, exact: true }).waitFor();
  });
  await check("Staff: login, dashboard, customer details, items and total", async () => {
    await login(staff, "staff1@example.test", "/staff");
    const card = staff.locator(".staff-order").filter({ hasText: order.tokenNumber });
    await card.waitFor();
    assert.ok((await card.textContent()).includes("customer1@example.test"));
    assert.ok((await card.textContent()).includes("Integration rice"));
    assert.ok((await card.textContent()).includes("701.00"));
    assert.ok((await card.locator(".staff-items").textContent()).includes("2"));
  });
  for (const [status, label] of [["accepted", "Accept order"], ["preparing", "Start preparing"], ["ready", "Mark ready"], ["completed", "Complete order"]]) {
    await check(`Staff: ${status} persists after reload and reaches customer browser`, async () => {
      await mutation(staff, () => staff.getByRole("button", { name: label, exact: true }).click(), "PUT", `/api/orders/${order._id}/status`);
      assert.equal((await Order.findById(order._id)).status, status);
      await staff.reload();
      const card = staff.locator(".staff-order").filter({ hasText: order.tokenNumber });
      await card.locator(`.staff-badge-${status}`).waitFor();
      await customer.getByRole("button", { name: "Refresh Status", exact: true }).click();
      await customer.locator(".history-order").filter({ hasText: order.tokenNumber }).locator(`.status-badge-${status}`).waitFor();
    });
  }
  await check("Staff: second staff account sees completed order", async () => {
    const other = await newPage(); await login(other, "staff2@example.test", "/staff");
    await other.locator(".staff-order").filter({ hasText: order.tokenNumber }).locator(".staff-badge-completed").waitFor();
    await other.context().close();
  });
  await check("Authorization: guests/customers cannot enter staff or admin routes", async () => {
    for (const path of ["/staff", "/admin", "/admin/menu"]) {
      await guest.goto(frontend + path); await guest.waitForURL(`${frontend}/login`);
      await customer.goto(frontend + path); await customer.waitForURL(frontend + "/");
    }
    assert.equal((await guest.request.get(api + "/orders")).status(), 401);
    assert.equal((await guest.request.post(api + "/categories", { data: { name: "Denied" } })).status(), 401);
    assert.equal((await guest.request.post(api + "/menu", { data: {} })).status(), 401);
    assert.equal((await browserRequest(customer, "GET", "/orders")).status(), 403);
    assert.equal((await browserRequest(customer, "PUT", `/orders/${order._id}/status`, { status: "pending" })).status(), 403);
    assert.equal((await Order.findById(order._id)).status, "completed");
  });
  await check("Admin: login and database-backed overview statistics", async () => {
    await login(admin, "admin@example.test", "/admin");
    await admin.locator(".admin-stats").waitFor();
    const allOrders = await Order.find().lean();
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
    const expected = {
      "Total orders": String(await Order.countDocuments()),
      "Today's orders": String(allOrders.filter((entry) => new Date(entry.createdAt).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }) === today).length),
      "Pending orders": String(await Order.countDocuments({ status: "pending" })),
      "Completed orders": String(await Order.countDocuments({ status: "completed" })),
      "Registered customers": String(await User.countDocuments({ role: "customer" })),
      "Total revenue": "Rs. 701.00",
    };
    for (const [label, value] of Object.entries(expected)) {
      const card = admin.locator(".admin-stats > div").filter({ has: admin.getByText(label, { exact: true }) });
      assert.equal(await card.locator("strong").textContent(), value);
    }
  });
  await check("Admin: customer list, customer history, order search and details", async () => {
    await admin.getByRole("button", { name: "customers", exact: true }).click();
    currentStep = "Admin: customer history button";
    const customerCard = admin.locator(".admin-category").filter({ hasText: "customer1@example.test" });
    await customerCard.getByRole("button", { name: "View order history (1)", exact: true }).click();
    await admin.locator(".admin-history").getByText(order.tokenNumber, { exact: true }).waitFor();
    currentStep = "Admin: order search field";
    await admin.getByRole("button", { name: "orders", exact: true }).click();
    await admin.getByLabel("Token number", { exact: true }).fill(order.tokenNumber);
    currentStep = "Admin: status filter label";
    await admin.getByRole("combobox", { name: /Status/ }).selectOption("completed");
    assert.equal(await admin.locator(".admin-order").count(), 1);
    currentStep = "Admin: expanded order details";
    await admin.locator(".admin-order summary").click();
    assert.ok((await admin.locator(".admin-order-body").textContent()).includes("Integration rice"));
    assert.ok((await admin.locator(".admin-order-body").textContent()).includes("customer1@example.test"));
  });
  let categoryId, itemId;
  await check("Admin: category create/update and reload persistence", async () => {
    await admin.getByRole("button", { name: "categories", exact: true }).click();
    const form = admin.locator(".admin-category-form");
    await form.getByLabel("Name", { exact: true }).fill(categoryName);
    await form.getByLabel("Description", { exact: true }).fill("Real browser fixture");
    const created = await mutation(admin, () => form.getByRole("button", { name: "Save category" }).click(), "POST", "/api/categories");
    categoryId = created.category._id;
    assert.ok(await Category.findById(categoryId));
    await admin.locator(".admin-category").filter({ hasText: categoryName }).getByRole("button", { name: "Edit", exact: true }).click();
    await form.getByLabel("Name", { exact: true }).fill(editedCategory);
    await mutation(admin, () => form.getByRole("button", { name: "Save category" }).click(), "PUT", `/api/categories/${categoryId}`);
    assert.equal((await Category.findById(categoryId)).name, editedCategory);
    await admin.reload(); await admin.getByText(editedCategory, { exact: true }).waitFor();
  });
  await check("Admin: category invalid blank and duplicate inputs rejected", async () => {
    const form = admin.locator(".admin-category-form");
    await form.getByLabel("Name", { exact: true }).fill("");
    assert.equal(await form.evaluate((element) => element.checkValidity()), false);
    await form.getByLabel("Name", { exact: true }).fill(editedCategory);
    const [response] = await Promise.all([admin.waitForResponse((res) => res.url().endsWith("/api/categories") && res.request().method() === "POST"), form.getByRole("button", { name: "Save category" }).click()]);
    assert.equal(response.status(), 400);
    await admin.getByRole("alert").waitFor();
    assert.equal(await Category.countDocuments({ name: editedCategory }), 1);
    assert.equal((await browserRequest(admin, "POST", "/categories", { name: "   " })).status(), 400);
    assert.equal((await browserRequest(admin, "PUT", `/categories/${categoryId}`, { name: "   " })).status(), 400);
    assert.equal((await browserRequest(admin, "PUT", `/categories/${categoryId}`, { name: harness.fixtures.category.name })).status(), 400);
    assert.equal((await Category.findById(categoryId)).name, editedCategory);
    await admin.reload();
  });
  await check("Admin: menu create and direct MongoDB persistence", async () => {
    await admin.getByRole("button", { name: "menu", exact: true }).click();
    const form = admin.locator(".admin-menu form");
    await form.getByLabel("Name", { exact: true }).fill(itemName);
    await form.getByLabel("Description", { exact: true }).fill("Real browser meal");
    await form.getByLabel("Price", { exact: true }).fill("425.50");
    await form.getByLabel("Category", { exact: true }).selectOption(categoryId);
    const created = await mutation(admin, () => form.getByRole("button", { name: "Add Menu Item", exact: true }).click(), "POST", "/api/menu");
    itemId = created.item._id;
    assert.equal((await MenuItem.findById(itemId)).price, 425.5);
  });
  const menuCard = () => admin.locator(".admin-menu h3").filter({ hasText: itemId ? editedItem : itemName }).locator("..");
  await check("Admin: menu edit and reload persistence", async () => {
    const card = admin.locator(".admin-menu h3").filter({ hasText: itemName }).locator("..");
    await card.getByRole("button", { name: "Edit", exact: true }).click();
    const form = admin.locator(".admin-menu form");
    await form.getByLabel("Name", { exact: true }).fill(editedItem);
    await form.getByLabel("Price", { exact: true }).fill("475.25");
    await mutation(admin, () => form.getByRole("button", { name: "Update Menu Item", exact: true }).click(), "PUT", `/api/menu/${itemId}`);
    const saved = await MenuItem.findById(itemId);
    assert.equal(saved.name, editedItem); assert.equal(saved.price, 475.25);
    await admin.reload(); await menuCard().waitFor();
    assert.ok((await menuCard().textContent()).includes("475.25"));
  });
  await check("Admin: availability toggles persist and customer menu reflects them", async () => {
    await mutation(admin, () => menuCard().getByRole("button", { name: "Mark Unavailable", exact: true }).click(), "PUT", `/api/menu/${itemId}`);
    assert.equal((await MenuItem.findById(itemId)).available, false);
    await admin.reload(); await menuCard().getByRole("button", { name: "Mark Available", exact: true }).waitFor();
    await customer.goto(`${frontend}/menu`);
    assert.equal(await customer.getByRole("button", { name: `${editedItem} is unavailable`, exact: true }).isDisabled(), true);
    await mutation(admin, () => menuCard().getByRole("button", { name: "Mark Available", exact: true }).click(), "PUT", `/api/menu/${itemId}`);
    assert.equal((await MenuItem.findById(itemId)).available, true);
    await admin.reload(); await menuCard().getByRole("button", { name: "Mark Unavailable", exact: true }).waitFor();
  });
  await check("Admin: negative price, missing fields and forbidden writes", async () => {
    const form = admin.locator(".admin-menu form");
    await form.getByLabel("Name", { exact: true }).fill("Invalid meal");
    await form.getByLabel("Price", { exact: true }).fill("-1");
    await form.getByLabel("Category", { exact: true }).selectOption(categoryId);
    assert.equal(await form.evaluate((element) => element.checkValidity()), false);
    assert.equal((await browserRequest(admin, "POST", "/menu", {})).status(), 400);
    assert.equal((await browserRequest(admin, "POST", "/menu", { name: "Invalid meal", price: -1, category: categoryId })).status(), 400);
    assert.equal((await browserRequest(admin, "PUT", `/menu/${itemId}`, { price: -1 })).status(), 400);
    assert.equal((await MenuItem.findById(itemId)).price, 475.25);
    assert.equal(await MenuItem.countDocuments({ name: "Invalid meal" }), 0);
    for (const page of [staff, customer]) {
      for (const [method, path, data] of [["POST", "/categories", { name: "Denied" }], ["PUT", `/categories/${categoryId}`, { name: "Denied" }], ["DELETE", `/categories/${categoryId}`], ["POST", "/menu", {}], ["PUT", `/menu/${itemId}`, { available: false }], ["DELETE", `/menu/${itemId}`]]) {
        assert.equal((await browserRequest(page, method, path, data)).status(), 403);
      }
    }
    await staff.goto(`${frontend}/admin`); await staff.waitForURL(frontend + "/");
    assert.equal((await MenuItem.findById(itemId)).available, true);
  });
  await check("Admin: menu/category deletion persists", async () => {
    admin.once("dialog", (dialog) => dialog.accept());
    await mutation(admin, () => menuCard().getByRole("button", { name: "Delete", exact: true }).click(), "DELETE", `/api/menu/${itemId}`);
    assert.equal(await MenuItem.findById(itemId), null);
    await admin.getByRole("button", { name: "categories", exact: true }).click();
    admin.once("dialog", (dialog) => dialog.accept());
    await mutation(admin, () => admin.locator(".admin-category").filter({ hasText: editedCategory }).getByRole("button", { name: "Delete", exact: true }).click(), "DELETE", `/api/categories/${categoryId}`);
    assert.equal(await Category.findById(categoryId), null);
    await admin.reload();
    assert.equal(await admin.getByText(editedCategory, { exact: true }).count(), 0);
  });
  assert.deepEqual(consoleErrors, []);
  console.log(`PASS all ${passed} real-backend Staff/Admin browser checks; no API interception.`);
} catch (error) {
  // Never print browser diagnostics that could include typed passwords or tokens.
  console.error(`FAIL ${currentStep} (${error.name}); sensitive diagnostics suppressed.`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await vite?.close();
  try {
    if (harness) {
      assertTestConnection(mongoose.connection, config.database);
      // Only this suite's explicitly named synthetic records can be removed here.
      await MenuItem.deleteMany({ name: { $in: [itemName, editedItem, "Invalid meal"] } });
      await Category.deleteMany({ name: { $in: [categoryName, editedCategory] } });
    }
  } finally { await harness?.close(); }
}
