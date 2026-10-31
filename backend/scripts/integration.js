const { spawn } = require("node:child_process");
const path = require("node:path");
const { readEnvironment, validateEnvironment, configureIntegration } = require("../tests/integration/environment");

async function main() {
  const mode = process.argv[2];
  if (mode === "test") {
    const env = readEnvironment();
    const config = validateEnvironment(env);
    const child = spawn(process.execPath, ["--test", path.resolve(__dirname, "../tests/integration/workflow.integration.js")], {
      stdio: "inherit", windowsHide: true,
      env: { ...process.env, NODE_ENV: "test", BITELINE_TEST_MONGO_URI: config.uri, BITELINE_TEST_JWT_SECRET: config.secret, BITELINE_TEST_ALLOW_WRITE: "yes" },
    });
    child.on("error", () => { console.error("Could not start integration test process."); process.exitCode = 1; });
    child.on("exit", (code) => { process.exitCode = code ?? 1; });
    return;
  }
  if (mode !== "serve") throw new Error("Use test or serve mode.");
  const config = configureIntegration();
  if (!config.fixturePassword || config.fixturePassword.length < 12) throw new Error("Set a synthetic-only BITELINE_TEST_FIXTURE_PASSWORD (12+ characters) for the interactive test server.");
  const { openHarness, registerCustomers } = require("../tests/integration/harness");
  const harness = await openHarness(config, 5001);
  try { await registerCustomers(harness); } catch { await harness.close(); throw new Error("Could not prepare synthetic accounts."); }
  console.log("Isolated integration API ready at http://127.0.0.1:5001 (synthetic test data only).");
  console.log("Fixture emails: customer1@example.test, customer2@example.test, staff1@example.test, staff2@example.test, admin@example.test. Password is configured locally and is not logged.");
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    try { await harness.close(); } catch { console.error("Test cleanup failed; inspect only the isolated test namespace."); process.exitCode = 1; }
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
