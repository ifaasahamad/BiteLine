const mongoose = require("mongoose");
const { once } = require("node:events");
const { assertTestConnection } = require("./environment");
const { createFixtures } = require("./fixtures");

async function openHarness(config, port = 0) {
  let server, fixtures;
  try {
    if (!/^biteline_integration_test_[a-f0-9]{32}$/.test(config.database)) throw new Error("Unsafe test database name.");
    // dbName is generated internally, never taken from a development environment.
    await mongoose.connect(config.uri, { dbName: config.database, serverSelectionTimeoutMS: 5000 });
    assertTestConnection(mongoose.connection, config.database);
    const models = [require("../../models/User"), require("../../models/Category"), require("../../models/MenuItem"), require("../../models/Order")];
    await Promise.all(models.map((model) => model.init()));
    fixtures = await createFixtures(config);
    const app = require("../../app");
    server = app.listen(port, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const request = async (method, route, body, token) => {
      const response = await fetch(base + route, {
        method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(10000),
      });
      return { status: response.status, data: await response.json() };
    };
    return {
      fixtures, request, database: config.database,
      async close() {
        if (server) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
        try { await fixtures.cleanup(); } finally { await mongoose.disconnect(); }
      },
    };
  } catch {
    if (server) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
    try { if (fixtures) await fixtures.cleanup(); } finally { await mongoose.disconnect(); }
    // Driver exceptions may include hostnames or authentication details. Do not print them.
    throw new Error("Integration setup failed. Check the dedicated test URI, scoped database permissions, MongoDB availability, and free test port. No development configuration was used.");
  }
}

async function registerCustomers(harness) {
  for (const user of harness.fixtures.users.filter((entry) => entry.role === "customer")) {
    const response = await harness.request("POST", "/auth/register", { name: user.name, email: user.email, password: harness.fixtures.password });
    if (response.status !== 201) throw new Error("Synthetic customer registration failed.");
    user._id = new mongoose.Types.ObjectId(response.data.user.id);
  }
}

module.exports = { openHarness, registerCustomers };
