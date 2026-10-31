const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const dotenv = require("dotenv");

const BASE_DATABASE = "biteline_integration_test";

function validateEnvironment(env) {
  if (env.NODE_ENV === "production") throw new Error("Integration commands refuse NODE_ENV=production.");
  if (env.BITELINE_TEST_ALLOW_WRITE !== "yes") throw new Error("Set BITELINE_TEST_ALLOW_WRITE=yes in the dedicated test config.");
  const uri = env.BITELINE_TEST_MONGO_URI;
  if (!uri) throw new Error("Missing BITELINE_TEST_MONGO_URI; configure .env.integration.local. Development MONGO_URI is never used.");
  // Parse the path independently of credentials (including MongoDB multi-host URIs).
  const match = /^mongodb(?:\+srv)?:\/\/[^/?#]+\/([^/?#]+)(?:\?[^#]*)?$/.exec(uri);
  if (!match || match[1] !== BASE_DATABASE) throw new Error("Test URI must explicitly name biteline_integration_test, without fragments or another database path.");
  const query = new URLSearchParams(uri.includes("?") ? uri.slice(uri.indexOf("?") + 1) : "");
  if ([...query.keys()].some((key) => key.toLowerCase() === "dbname")) throw new Error("URI database overrides are not permitted.");
  const secret = env.BITELINE_TEST_JWT_SECRET;
  if (!secret || secret.length < 32 || secret === env.JWT_SECRET) throw new Error("Configure a separate BITELINE_TEST_JWT_SECRET of at least 32 characters.");
  return { uri, secret };
}

function readEnvironment() {
  const file = path.resolve(__dirname, "../../.env.integration.local");
  const local = fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
  // CI variables may override the dedicated local file; never load backend/.env.
  return { ...local, ...process.env };
}

function configureIntegration() {
  const env = readEnvironment();
  const validated = validateEnvironment(env);
  const database = `${BASE_DATABASE}_${randomUUID().replaceAll("-", "")}`;
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = validated.secret;
  // No connection helper can fall back to the normal development URI.
  delete process.env.MONGO_URI;
  return { ...validated, database, fixturePassword: env.BITELINE_TEST_FIXTURE_PASSWORD };
}

function assertTestConnection(connection, expectedDatabase) {
  if (!/^biteline_integration_test_[a-f0-9]{32}$/.test(expectedDatabase) || connection.name !== expectedDatabase || connection.readyState !== 1) {
    throw new Error("Refusing test writes/cleanup outside the isolated run database.");
  }
}

module.exports = { validateEnvironment, readEnvironment, configureIntegration, assertTestConnection };
