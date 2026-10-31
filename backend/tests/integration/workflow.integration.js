const { test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { configureIntegration } = require("./environment");
const { openHarness, registerCustomers } = require("./harness");
const User = require("../../models/User");
const Order = require("../../models/Order");
const Category = require("../../models/Category");
const MenuItem = require("../../models/MenuItem");

test("real Express → MongoDB integration foundation", { timeout: 60000 }, async (suite) => {
  const config = configureIntegration();
  const harness = await openHarness(config);
  const { fixtures, request } = harness;
  const tokens = {};
  let createdOrder;
  try {
    await suite.test("register two customers and persist password hashes", async () => {
      await registerCustomers(harness);
      for (const fixture of fixtures.users.filter((user) => user.role === "customer")) {
        const saved = await User.findById(fixture._id);
        assert.equal(saved.role, "customer");
        assert.notEqual(saved.password, fixtures.password);
        assert.equal(await bcrypt.compare(fixtures.password, saved.password), true);
      }
    });
    await suite.test("login all five users through the actual authentication endpoint", async () => {
      for (const fixture of fixtures.users) {
        const response = await request("POST", "/auth/login", { email: fixture.email, password: fixtures.password });
        assert.equal(response.status, 200);
        assert.equal(response.data.user.role, fixture.role);
        assert.equal(typeof response.data.token, "string");
        assert.equal(response.data.user.password, undefined);
        tokens[fixture.email.split("@")[0]] = response.data.token;
      }
    });
    await suite.test("real JWT authentication and role restrictions", async () => {
      assert.equal((await request("GET", "/auth/me")).status, 401);
      assert.equal((await request("GET", "/auth/me", undefined, "invalid-token")).status, 401);
      const me = await request("GET", "/auth/me", undefined, tokens.customer1);
      assert.equal(me.status, 200);
      assert.equal(me.data.user.email, "customer1@example.test");
      assert.equal(me.data.user.password, undefined);
      assert.equal((await request("GET", "/orders", undefined, tokens.customer1)).status, 403);
      assert.equal((await request("POST", "/menu", {}, tokens.staff1)).status, 403);
      assert.equal((await request("GET", "/customers", undefined, tokens.staff1)).status, 403);
      assert.equal((await request("GET", "/customers", undefined, tokens.admin)).status, 200);
    });
    await suite.test("retrieve database-backed categories and populated menu items", async () => {
      const categories = await request("GET", "/categories");
      assert.equal(categories.status, 200);
      assert.ok(categories.data.some((category) => category._id === String(fixtures.category._id)));
      const menu = await request("GET", "/menu");
      assert.equal(menu.status, 200);
      const available = menu.data.find((item) => item._id === String(fixtures.available._id));
      assert.equal(available.category.name, fixtures.category.name);
      assert.equal(available.available, true);
      assert.equal(menu.data.find((item) => item._id === String(fixtures.unavailable._id)).available, false);
    });
    await suite.test("reject unavailable food without persisting an order", async () => {
      const count = await Order.countDocuments();
      const response = await request("POST", "/orders", { items: [{ menuItem: String(fixtures.unavailable._id), quantity: 1 }] }, tokens.customer1);
      assert.equal(response.status, 400);
      assert.equal(await Order.countDocuments(), count);
    });
    await suite.test("create and persist an order using server prices and authenticated ownership", async () => {
      const response = await request("POST", "/orders", {
        user: String(fixtures.users[1]._id), totalAmount: 1,
        items: [{ menuItem: String(fixtures.available._id), quantity: 2, price: 1 }],
      }, tokens.customer1);
      assert.equal(response.status, 201);
      createdOrder = response.data.order;
      fixtures.createdOrderIds.add(createdOrder._id);
      const saved = await Order.findById(createdOrder._id).lean();
      assert.equal(String(saved.user), String(fixtures.users[0]._id));
      assert.equal(saved.totalAmount, 701);
      assert.equal(saved.items[0].price, 350.5);
      assert.equal(saved.items[0].quantity, 2);
      assert.equal(saved.status, "pending");
      assert.equal(saved.tokenNumber, createdOrder.tokenNumber);
      assert.match(saved.tokenNumber, /^BL-\d+$/);
    });
    await suite.test("customer history is persistent and isolated from another customer", async () => {
      const own = await request("GET", "/orders/my-orders", undefined, tokens.customer1);
      assert.equal(own.status, 200);
      assert.ok(own.data.some((order) => order._id === createdOrder._id));
      const other = await request("GET", `/orders/my-orders?user=${fixtures.users[0]._id}`, undefined, tokens.customer2);
      assert.equal(other.status, 200);
      assert.equal(other.data.length, 0);
      assert.equal((await request("PUT", `/orders/${createdOrder._id}/status`, { status: "ready" }, tokens.customer2)).status, 403);
    });
    await suite.test("both staff retrieve the saved order with populated customer details", async () => {
      for (const token of [tokens.staff1, tokens.staff2]) {
        const response = await request("GET", "/orders", undefined, token);
        assert.equal(response.status, 200);
        const order = response.data.find((entry) => entry._id === createdOrder._id);
        assert.equal(order.user.email, "customer1@example.test");
        assert.equal(order.user.password, undefined);
      }
    });
    await suite.test("staff status updates persist and customer sees every transition", async () => {
      for (const status of ["accepted", "preparing", "ready", "completed"]) {
        const response = await request("PUT", `/orders/${createdOrder._id}/status`, { status }, tokens.staff1);
        assert.equal(response.status, 200);
        assert.equal((await Order.findById(createdOrder._id)).status, status);
        const customer = await request("GET", "/orders/my-orders", undefined, tokens.customer1);
        assert.equal(customer.data.find((order) => order._id === createdOrder._id).status, status);
      }
    });
    await suite.test("fixture cleanup removes test-created records without dropping the database", async () => {
      // Prove cleanup is scoped: this additional synthetic record is not a fixture.
      const sentinel = await User.create({ name: "Cleanup sentinel", email: "sentinel@example.test", password: await bcrypt.hash(fixtures.password, 10) });
      try {
        await fixtures.cleanup();
        assert.equal(await User.countDocuments(), 1);
        assert.ok(await User.findById(sentinel._id));
        assert.equal(await Order.countDocuments(), 0);
        assert.equal(await Category.countDocuments(), 0);
        assert.equal(await MenuItem.countDocuments(), 0);
      } finally {
        await User.deleteOne({ _id: sentinel._id });
      }
    });
  } finally {
    await harness.close();
  }
});
