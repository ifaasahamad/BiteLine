# Real database integration foundation

This suite runs the actual Express application, controllers, JWT middleware and
Mongoose models against a real MongoDB database. Database operations are not mocked.
The existing mocked tests in `tests/*.test.js` are unchanged.

## Isolation contract

- Development `backend/.env` is never loaded by integration commands.
- `MONGO_URI` is never used by the harness. `NODE_ENV=production` is rejected.
- Supply `BITELINE_TEST_MONGO_URI` with the exact path `/biteline_integration_test`.
  Missing paths, development database names and `dbName` query overrides fail closed.
- Each run overrides the database name with
  `biteline_integration_test_<random UUID>` before connecting. It never uses the
  database named by the normal development configuration.
- A separate 32+ character `BITELINE_TEST_JWT_SECRET` is mandatory. Generate it for
  testing only. Never copy the development or production secret.
- Explicit `BITELINE_TEST_ALLOW_WRITE=yes` is required.
- Cleanup checks the connected database and deletes only fixture users, their
  orders, and the allocated fixture menu/category IDs. It never drops a database
  or issues unfiltered collection deletion commands.
- Empty per-run databases/collections/indexes may remain. This is deliberate:
  automatic database deletion is not part of this foundation.
- Interrupted or forcibly terminated runs may leave synthetic records in that
  run's test namespace. A later run does not clear them or reuse that namespace.
- Restrict remote credentials to these integration namespaces on a dedicated test
  deployment. Do not use a production connection or broadly privileged production
  credentials, even though the database-name guard is enforced.

## Local configuration (manual prerequisite)

No MongoDB dependency is installed by this project. Start a local MongoDB instance,
or provision a dedicated remote test deployment. No actual test database connection
is attempted until the dedicated configuration passes validation.

From `backend` in PowerShell:

```powershell
# Only if the local file does not already exist:
Copy-Item .env.integration.example .env.integration.local
```

Edit the **local** file. Keep its database path exactly `/biteline_integration_test`.
The sample `mongodb://127.0.0.1:27017/biteline_integration_test` needs no credentials
only when your local MongoDB is configured that way. Configure authentication as
required by your own local installation. A remote URI must use dedicated test
credentials with permission to create/read/write the generated test databases
and their indexes.

Generate a new secret and synthetic fixture password directly into the file,
without displaying either in the terminal (Node must be available):

```powershell
node -e "const fs=require('node:fs'),c=require('node:crypto'),p='.env.integration.local';let s=fs.readFileSync(p,'utf8');s=s.replace(/^BITELINE_TEST_JWT_SECRET=.*$/m,'BITELINE_TEST_JWT_SECRET='+c.randomBytes(48).toString('hex')).replace(/^BITELINE_TEST_FIXTURE_PASSWORD=.*$/m,'BITELINE_TEST_FIXTURE_PASSWORD='+c.randomBytes(24).toString('base64url'));fs.writeFileSync(p,s);"
```

This replaces only the dedicated test secrets. Run it only when initially setting
up or deliberately rotating those test credentials. `.env.integration.local` is
Git-ignored; the example contains no credentials. CI can supply the dedicated
variables through its secret store instead. Environment variables take precedence.

Do not paste connection strings or secrets into chat, screenshots or commit messages.

## Commands

From `backend`:

```powershell
npm.cmd run test:unit                 # Existing mocked tests only
npm.cmd run test:integration:guards   # Isolation tests; no MongoDB required
npm.cmd run test:integration          # Real Express + MongoDB suite
npm.cmd run test:all                  # All three, stopping on failure
```

`npm test` is an alias for the existing mocked tests. A missing/unsafe integration
configuration exits nonzero: it does not silently skip tests or fall back to `.env`.
Setup errors are sanitized to avoid exposing MongoDB connection credentials.
The real suite starts the API on a random loopback port, so it doesn't hit a running
development server. MongoDB selection times out after five seconds.

## Frontend → real API → real MongoDB (interactive foundation)

In one terminal, from `backend`:

```powershell
npm.cmd run start:integration
```

This starts an isolated API at `http://127.0.0.1:5001`, creates synthetic fixtures,
and registers the two customers through the real API. There is no fallback to
another port or to the development server. Keep this terminal open.

In a second terminal, from `frontend`:

```powershell
npm.cmd run dev:integration
```

Open `http://127.0.0.1:5174`. Vite's integration mode forces the API URL to
`http://127.0.0.1:5001/api`. Normal development/production behavior retains the
existing API URL unless `VITE_API_BASE_URL` is explicitly configured.

Synthetic fixture accounts:

| Email | Role |
| --- | --- |
| customer1@example.test | customer |
| customer2@example.test | customer |
| staff1@example.test | staff |
| staff2@example.test | staff |
| admin@example.test | admin |

All use the locally configured `BITELINE_TEST_FIXTURE_PASSWORD`. It is never logged.
Staff/admin are inserted with bcrypt hashes because there is no staff provisioning
API. Category and available/unavailable food fixtures are inserted with real
Mongoose writes. Use a separate browser profile/private window for integration
work so development localStorage/sessionStorage cannot confuse manual tests.
Use only the fixture accounts; additional manually registered accounts are not
automatically cleaned. Ctrl+C on the API terminal removes the fixture records and
closes MongoDB. A forced process kill cannot guarantee cleanup.

## Initial real integration coverage

The single sequential foundation suite verifies:

1. Two customer registrations and persisted bcrypt hashes.
2. Login of both customers, both staff and the admin through the actual API.
3. Missing/invalid JWT rejection, `/auth/me` and role restrictions.
4. Database-backed categories and populated menu retrieval.
5. Unavailable-food rejection without an order write.
6. Order creation, server-calculated prices, authenticated ownership, token and
   pending status, verified by a direct MongoDB query.
7. Customer history isolation, including a forged user query parameter.
8. Both staff accounts retrieving the real customer order.
9. Accepted → preparing → ready → completed updates, checked through both direct
   database queries and customer API responses at every step.
10. Fixture cleanup verified by database queries, including preservation of a
    separate synthetic sentinel record, without dropping the database.

The suite cleans up in `finally`. It does not test concurrent token collisions,
complete validation/error matrices, restart durability or automated real-browser
multi-role workflows yet. The existing intercepted browser suites remain separate.
No real-database or full-stack pass should be claimed until the commands actually
run against a configured test MongoDB.
