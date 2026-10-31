import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

test("public and existing application pages render within the shared providers", async () => {
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  const previousLocal = globalThis.localStorage;
  const previousSession = globalThis.sessionStorage;
  globalThis.localStorage = storage;
  globalThis.sessionStorage = storage;
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { AuthProvider } = await server.ssrLoadModule("/src/context/AuthContext.jsx");
    const { CartProvider } = await server.ssrLoadModule("/src/context/CartContext.jsx");
    for (const [page, expected] of [
      ["Home", "No standing in line."], ["Login", "Logging"], ["Register", "Create Account"],
      ["CustomerDashboard", "Welcome back"], ["CustomerMenu", "Browse Menu"],
      ["Cart", "Your Cart"], ["MyOrders", "My Orders"], ["OrderSuccess", "No order information found"],
      ["StaffDashboard", "Staff Dashboard"], ["AdminDashboard", "Business overview"], ["AdminMenu", "Admin Menu Management"],
    ]) {
      const { default: Component } = await server.ssrLoadModule(`/src/pages/${page}.jsx`);
      const html = renderToString(createElement(MemoryRouter, null,
        createElement(AuthProvider, null, createElement(CartProvider, null, createElement(Component)))));
      assert.ok(html.includes(page === "Login" ? "Login" : expected), `${page} should render`);
      if (page === "Home") assert.equal((html.match(/<h1\b/g) || []).length, 1);
    }
    const { default: Navbar } = await server.ssrLoadModule("/src/components/Navbar.jsx");
    const html = renderToString(createElement(MemoryRouter, null,
      createElement(AuthProvider, null, createElement(CartProvider, null, createElement(Navbar)))));
    assert.ok(html.includes('aria-expanded="false"'));
    assert.ok(html.includes('aria-controls="primary-navigation"'));
    assert.ok(html.includes("Skip to content"));
  } finally {
    await server.close();
    if (previousLocal === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousLocal;
    if (previousSession === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previousSession;
  }
});
