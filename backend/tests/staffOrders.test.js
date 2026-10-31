const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Order = require("../models/Order");
const router = require("../routes/orderRoutes");

test("staff order endpoints: JWT authorization, listing, transitions and errors", async () => {
  const originalFindUser = User.findById;
  const originalFind = Order.find;
  const originalFindOrder = Order.findById;
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "staff-orders-test-secret";
  const order = {
    _id: "507f1f77bcf86cd799439011", tokenNumber: "BL-TEST", status: "pending",
    user: { name: "Customer", email: "customer@example.test", role: "customer" },
    items: [{ name: "Rice", quantity: 2, price: 100 }], totalAmount: 200,
    async save() {},
  };
  User.findById = (id) => ({ select: async (selection) => {
    assert.equal(selection, "-password");
    return { _id: id, role: id };
  } });
  Order.find = () => ({ populate(field, selection) {
    assert.equal(field, "user"); assert.equal(selection, "name email role");
    return { sort: async () => [order] };
  } });
  Order.findById = async (id) => id === order._id ? order : null;
  const app = express();
  app.use(express.json());
  app.use("/api/orders", router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.on("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/orders`;
  const request = (role, path = "", method = "GET", body) => fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(role ? { Authorization: `Bearer ${jwt.sign({ id: role }, process.env.JWT_SECRET)}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    assert.equal((await request(null)).status, 401);
    assert.equal((await fetch(base, { headers: { Authorization: "Bearer invalid" } })).status, 401);
    for (const role of ["customer"]) {
      assert.equal((await request(role)).status, 403);
      assert.equal((await request(role, `/${order._id}/status`, "PUT", { status: "accepted" })).status, 403);
    }
    for (const role of ["staff", "admin"]) {
      const response = await request(role);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data[0].user.email, "customer@example.test");
      assert.equal(data[0].items[0].quantity, 2);
    }
    for (const status of ["accepted", "preparing", "ready", "completed"]) {
      const response = await request("staff", `/${order._id}/status`, "PUT", { status });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).order.status, status);
      const refreshed = await request("staff");
      assert.equal((await refreshed.json())[0].status, status);
    }
    assert.equal((await request("staff", `/${order._id}/status`, "PUT", { status: "invalid" })).status, 400);
    assert.equal((await request("staff", "/missing/status", "PUT", { status: "ready" })).status, 404);
    Order.find = () => { throw new Error("Database unavailable"); };
    assert.equal((await request("staff")).status, 500);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    User.findById = originalFindUser;
    Order.find = originalFind;
    Order.findById = originalFindOrder;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});
