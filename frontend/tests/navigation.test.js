import { test } from "node:test";
import assert from "node:assert/strict";
import { dashboardPath, navigationLinks } from "../src/components/navigation.js";

test("authenticated visitors return to their role's dashboard", () => {
  assert.equal(dashboardPath("customer"), "/customer");
  assert.equal(dashboardPath("staff"), "/staff");
  assert.equal(dashboardPath("admin"), "/admin");
});

test("navigation exposes only links for the current role", () => {
  assert.deepEqual(navigationLinks().map((link) => link.to), ["/", "/login", "/register"]);
  assert.deepEqual(navigationLinks("customer").map((link) => link.to), ["/", "/customer", "/menu", "/cart", "/orders"]);
  assert.deepEqual(navigationLinks("staff").map((link) => link.to), ["/", "/staff"]);
  assert.deepEqual(navigationLinks("admin").map((link) => link.to), ["/", "/admin", "/admin/menu"]);
  assert.equal(navigationLinks("admin").find((link) => link.to === "/admin").end, true);
});
