const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateEnvironment, assertTestConnection } = require("./environment");
const safe = { BITELINE_TEST_MONGO_URI: "mongodb://127.0.0.1:27017/biteline_integration_test", BITELINE_TEST_JWT_SECRET: "a".repeat(48), BITELINE_TEST_ALLOW_WRITE: "yes" };

test("only an explicitly configured test namespace and separate JWT are accepted", () => {
  assert.doesNotThrow(() => validateEnvironment(safe));
  for (const uri of [undefined, "mongodb://127.0.0.1/dev", "mongodb://127.0.0.1/admin", "mongodb://127.0.0.1/", "mongodb://127.0.0.1/biteline_integration_test?dbName=dev", "mongodb://127.0.0.1/biteline_integration_test#dev"]) {
    assert.throws(() => validateEnvironment({ ...safe, BITELINE_TEST_MONGO_URI: uri }));
  }
  assert.throws(() => validateEnvironment({ ...safe, NODE_ENV: "production" }));
  assert.throws(() => validateEnvironment({ ...safe, BITELINE_TEST_ALLOW_WRITE: "no" }));
  assert.throws(() => validateEnvironment({ ...safe, JWT_SECRET: safe.BITELINE_TEST_JWT_SECRET }));
  assert.throws(() => validateEnvironment({ ...safe, BITELINE_TEST_JWT_SECRET: "short" }));
  assert.throws(() => validateEnvironment({ MONGO_URI: safe.BITELINE_TEST_MONGO_URI }));
});

test("cleanup rejects disconnected, non-test and mismatched databases", () => {
  const database = `biteline_integration_test_${"a".repeat(32)}`;
  assert.doesNotThrow(() => assertTestConnection({ name: database, readyState: 1 }, database));
  assert.throws(() => assertTestConnection({ name: "dev", readyState: 1 }, database));
  assert.throws(() => assertTestConnection({ name: database, readyState: 0 }, database));
  assert.throws(() => assertTestConnection({ name: "dev", readyState: 1 }, "dev"));
});
