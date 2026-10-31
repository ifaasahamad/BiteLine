import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeOrders, customerOrders, dateKey, money } from "../src/pages/adminDashboardData.js";

test("overview uses Colombo dates, completed revenue and registered customer count", () => {
  const orders = [
    { user: { _id: "a" }, status: "completed", totalAmount: 450, createdAt: "2026-10-30T20:00:00Z" },
    { user: { _id: "b" }, status: "cancelled", totalAmount: 800, createdAt: "2026-10-31T02:00:00Z" },
    { user: "a", status: "pending", totalAmount: 200, createdAt: "2026-10-30T10:00:00Z" },
  ];
  const summary = summarizeOrders(orders, 5, new Date("2026-10-31T03:00:00Z"));
  assert.equal(summary["Total orders"], 3);
  assert.equal(summary["Today's orders"], 2);
  assert.equal(summary["Pending orders"], 1);
  assert.equal(summary["Completed orders"], 1);
  assert.equal(summary["Total revenue"], money(450));
  assert.equal(summary["Registered customers"], 5);
  assert.equal(dateKey("2026-10-30T20:00:00Z"), "2026-10-31");
  assert.equal(customerOrders(orders, "a").length, 2);
  assert.equal(customerOrders(orders, "missing").length, 0);
});

test("empty database produces zero statistics", () => {
  const summary = summarizeOrders([], 0);
  assert.equal(summary["Total orders"], 0);
  assert.equal(summary["Today's orders"], 0);
  assert.equal(summary["Total revenue"], money(0));
});
