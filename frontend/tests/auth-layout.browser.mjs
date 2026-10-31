import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preview } from "vite";

// Run after npm run build. Optionally pass the path to a temporary Playwright
// installation as the first argument, without adding a project dependency.
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : "playwright");
const server = await preview({ preview: { host: "127.0.0.1", port: 0, open: false } });
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));

  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 812 : 1000 });
    for (const path of ["/login", "/register"]) {
      await page.goto(base + path);
      await page.locator(".auth-form").waitFor();
      const layout = await page.evaluate(() => {
        const card = document.querySelector(".auth-card").getBoundingClientRect();
        const area = document.querySelector(".auth-page").getBoundingClientRect();
        return {
          width: card.width,
          horizontal: Math.abs(card.x + card.width / 2 - innerWidth / 2),
          vertical: Math.abs(card.y + card.height / 2 - (area.y + area.height / 2)),
          overflow: document.documentElement.scrollWidth > innerWidth,
          fieldsLabeled: [...document.querySelectorAll(".auth-form input")].every((input) => input.labels.length > 0),
        };
      });
      assert.ok(layout.width <= 480, `${path}: max width at ${width}`);
      assert.ok(layout.horizontal <= 1, `${path}: horizontally centered at ${width}`);
      assert.ok(layout.vertical <= 1, `${path}: vertically centered at ${width}`);
      assert.equal(layout.overflow, false, `${path}: no overflow at ${width}`);
      assert.equal(layout.fieldsLabeled, true);
      if (width === 375 || width === 1440) {
        const screenshot = join(tmpdir(), `biteline-${path.slice(1)}-${width}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        console.log(`Screenshot: ${screenshot}`);
      }
      console.log(`PASS ${path}: centered and no overflow at ${width}px`);
    }
  }

  // A short viewport must remain vertically scrollable, with no clipped top.
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto(base + "/register");
  await page.locator(".auth-form").waitFor();
  assert.ok(await page.locator(".auth-card").evaluate((card) => card.getBoundingClientRect().top >= 0));
  await page.locator(".auth-submit").scrollIntoViewIfNeeded();
  assert.ok(await page.locator(".auth-submit").isVisible());

  for (const [role, destination] of [["customer", "/customer"], ["staff", "/staff"], ["admin", "/admin"]]) {
    const signedIn = await browser.newContext();
    await signedIn.addInitScript(() => localStorage.setItem("token", "browser-test-token"));
    const signedPage = await signedIn.newPage();
    await signedPage.route("**/api/**", (route) => route.fulfill({
      json: route.request().url().endsWith("/auth/me") ? { user: { _id: "test-user", name: "Test", role } } : [],
    }));
    for (const path of ["/login", "/register"]) {
      await signedPage.goto(base + path);
      await signedPage.waitForURL(base + destination);
      assert.equal(await signedPage.locator(".auth-form").count(), 0);
      console.log(`PASS ${role}: ${path} redirects to ${destination}`);
    }
    await signedIn.close();
  }
  assert.deepEqual(errors, []);
  await context.close();
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
