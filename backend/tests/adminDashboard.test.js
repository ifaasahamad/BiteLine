const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Category = require("../models/Category");
const customerRouter = require("../routes/customerRoutes");
const categoryRouter = require("../routes/categoryRoutes");
const menuRouter = require("../routes/menuRoutes");

test("admin customer privacy, authorization and category CRUD", async () => {
  const originals = { userById: User.findById, users: User.find, category: Category.findById, existing: Category.findOne, create: Category.create };
  const secret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "admin-dashboard-test-secret";
  const customer = { _id: "customer-id", name: "Customer", email: "customer@example.test", createdAt: "2026-10-31T00:00:00Z" };
  let deleted = false;
  const category = { _id: "category-id", name: "Lunch", description: "", async save() {}, async deleteOne() { deleted = true; } };
  User.findById = (id) => ({ select: async () => ({ _id: id, role: id }) });
  User.find = (filter) => {
    assert.deepEqual(filter, { role: "customer" });
    return { select(fields) {
      assert.equal(fields, "_id name email createdAt");
      return { sort: async () => [customer] };
    } };
  };
  Category.findOne = async () => null;
  Category.findById = async (id) => id === "category-id" ? category : null;
  Category.create = async (data) => ({ _id: "new-category", ...data });
  const app = express();
  app.use(express.json());
  app.use("/customers", customerRouter);
  app.use("/categories", categoryRouter);
  app.use("/menu", menuRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.on("listening", resolve));
  const request = (role, path, method = "GET", body) => fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method, headers: { "Content-Type": "application/json", ...(role ? { Authorization: `Bearer ${jwt.sign({ id: role }, process.env.JWT_SECRET)}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    assert.equal((await request(null, "/customers")).status, 401);
    for (const role of ["staff", "customer"]) {
      assert.equal((await request(role, "/customers")).status, 403);
      for (const prefix of ["/categories", "/menu"]) {
        assert.equal((await request(role, prefix, "POST", { name: "Denied" })).status, 403);
        assert.equal((await request(role, `${prefix}/category-id`, "PUT", { name: "Denied" })).status, 403);
        assert.equal((await request(role, `${prefix}/category-id`, "DELETE")).status, 403);
      }
    }
    const response = await request("admin", "/customers");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [customer]);
    const created = await request("admin", "/categories", "POST", { name: "Breakfast", description: "Morning" });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).category.name, "Breakfast");
    assert.equal((await request("admin", "/categories", "POST", {})).status, 400);
    Category.findOne = async () => category;
    assert.equal((await request("admin", "/categories", "POST", { name: "Lunch" })).status, 400);
    const updated = await request("admin", "/categories/category-id", "PUT", { name: "Dinner" });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).category.name, "Dinner");
    assert.equal((await request("admin", "/categories/missing", "PUT", {})).status, 404);
    assert.equal((await request("admin", "/categories/category-id", "DELETE")).status, 200);
    assert.equal(deleted, true);
    User.find = () => { throw new Error("Database failure"); };
    assert.equal((await request("admin", "/customers")).status, 500);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    User.findById = originals.userById; User.find = originals.users;
    Category.findById = originals.category; Category.findOne = originals.existing; Category.create = originals.create;
    if (secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secret;
  }
});
