const bcrypt = require("bcryptjs");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const User = require("../../models/User");
const Category = require("../../models/Category");
const MenuItem = require("../../models/MenuItem");
const Order = require("../../models/Order");
const { assertTestConnection } = require("./environment");

async function createFixtures(config) {
  assertTestConnection(mongoose.connection, config.database);
  const password = config.fixturePassword || randomBytes(24).toString("base64url");
  const users = [
    ["customer1", "customer"], ["customer2", "customer"],
    ["staff1", "staff"], ["staff2", "staff"], ["admin", "admin"],
  ].map(([name, role]) => ({ _id: new mongoose.Types.ObjectId(), name: `Integration ${name}`, email: `${name}@example.test`, role }));
  const categoryId = new mongoose.Types.ObjectId();
  const availableId = new mongoose.Types.ObjectId(), unavailableId = new mongoose.Types.ObjectId();
  const createdOrderIds = new Set();
  // Explicit IDs are allocated before insertion so partial setup is cleanable.
  const fixtures = {
    password, users, createdOrderIds,
    async cleanup() {
      assertTestConnection(mongoose.connection, config.database);
      const registered = await User.find({ email: { $in: users.map((user) => user.email) } }).select("_id");
      const userIds = [...users.map((user) => user._id), ...registered.map((user) => user._id)];
      await Order.deleteMany({ $or: [{ user: { $in: userIds } }, { _id: { $in: [...createdOrderIds] } }] });
      await MenuItem.deleteMany({ _id: { $in: [availableId, unavailableId] } });
      await Category.deleteMany({ _id: categoryId });
      await User.deleteMany({ _id: { $in: userIds } });
    },
  };
  try {
    const hash = await bcrypt.hash(password, 10);
    // Customers are registered through the real API later; staff/admin have no provisioning API.
    await User.insertMany(users.filter((user) => user.role !== "customer").map((user) => ({ ...user, password: hash })));
    const category = await Category.create({ _id: categoryId, name: "Integration meals", description: "Synthetic test category" });
    const available = await MenuItem.create({ _id: availableId, name: "Integration rice", price: 350.5, category: category._id, available: true });
    const unavailable = await MenuItem.create({ _id: unavailableId, name: "Integration unavailable meal", price: 200, category: category._id, available: false });
    return Object.assign(fixtures, { category, available, unavailable });
  } catch (error) {
    await fixtures.cleanup();
    throw error;
  }
}

module.exports = { createFixtures };
