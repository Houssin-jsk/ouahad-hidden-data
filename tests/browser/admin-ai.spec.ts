import { test, expect } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import {
  LEDGER_SCHEMA,
  SharedLedger,
} from "../../src/cloud-vision/server/ledger";
import {
  handleAdmin,
  handleAdminSession,
} from "../../src/cloud-vision/server/admin";

test("owner dashboard rejects unauthorized access and fails closed without configured infrastructure", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/admin/ai")).status()).toBe(401);
  expect(
    (
      await request.post("/api/admin/ai", { data: { action: "global" } })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/admin/ai/session", {
        headers: {
          origin: "https://evil.invalid",
          "x-admin-action": "session-v1",
        },
        data: { secret: "S".repeat(43) },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/admin/ai");
  await expect(
    page.getByRole("heading", { name: "Owner access", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Provider management" }),
  ).toHaveCount(0);
  await page.getByLabel("Owner access key").fill("S".repeat(43));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Owner authentication failed",
  );
  await expect(
    page.getByRole("heading", { name: "Provider management" }),
  ).toHaveCount(0);
});
test("owner controls authenticate, persist, audit, stop and sign out on desktop and mobile (SQLite harness)", async ({
  page,
  context,
}) => {
  const db = new DatabaseSync(":memory:");
  LEDGER_SCHEMA.forEach((sql) => db.exec(sql));
  const ledger = new SharedLedger(
    async (sql, params) =>
      db.prepare(sql).all(...params) as Record<string, unknown>[],
  );
  const env = {
    CLOUD_AI_ADMIN_SECRET: "S".repeat(43),
    CLOUD_AI_ORIGIN: "http://127.0.0.1:3001",
    GEMINI_API_KEY: "mock-only",
    CLOUD_AI_GEMINI_FREE_UNTIL: new Date(Date.now() + 86400000).toISOString(),
    CLOUD_AI_GEMINI_31_VISION_UNTIL: new Date(
      Date.now() + 86400000,
    ).toISOString(),
  };
  // The UI calls the actual authenticated handlers with real SQLite, while D1
  // transport and external inference are deliberately not claimed by this test.
  await page.route("**/api/admin/ai{,/session}", async (route) => {
    const incoming = route.request();
    const headers = await incoming.allHeaders();
    const request = new Request(incoming.url(), {
      method: incoming.method(),
      headers,
      ...(incoming.method() === "POST" ? { body: incoming.postData() } : {}),
    });
    const response = incoming.url().endsWith("/session")
      ? await handleAdminSession(request, env, ledger)
      : await handleAdmin(request, env, ledger);
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    });
  });
  try {
    await page.goto("/admin/ai");
    await page.getByLabel("Owner access key").fill(env.CLOUD_AI_ADMIN_SECRET);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Provider management", exact: true }),
    ).toBeVisible();
    expect(
      (await context.cookies()).find((c) => c.name === "hd_admin_dev")
        ?.httpOnly,
    ).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain(
      "hd_admin_dev",
    );
    await expect(
      page.getByText(
        "Unknown: internal remaining allocation is not a provider balance.",
        { exact: false },
      ),
    ).toBeVisible();
    const model = page.locator("article").filter({
      has: page.getByRole("heading", {
        name: "gemini-3.5-flash-lite",
        exact: true,
      }),
    });
    await expect(page.getByText(/Shared database: Connected/)).toBeVisible();
    await expect(model.getByText("Disabled", { exact: true })).toBeVisible();
    await model.getByLabel("Enable eligible model").check();
    await model.getByLabel("Daily attempt cap", { exact: true }).fill("20");
    await model.getByRole("button", { name: "Save model settings" }).click();
    await expect(page.getByRole("status")).toContainText("saved and audited");
    await expect(
      model.getByLabel("Daily attempt cap", { exact: true }),
    ).toHaveValue("20");
    await page.getByLabel("Pause new inference").uncheck();
    await page.getByRole("button", { name: "Save shared policy" }).click();
    await expect(
      page.getByText("Owner testing only · public release blocked", {
        exact: true,
      }),
    ).toBeVisible();
    expect((await ledger.settings()).config.kill).toBe(false);
    await expect(model.getByText("Active", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Emergency stop", exact: true })
      .click();
    await expect(page.getByText("PAUSED", { exact: true })).toBeVisible();
    expect((await ledger.settings()).config.kill).toBe(true);
    await expect(
      model.getByText("Paused by owner", { exact: true }),
    ).toBeVisible();
    expect(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM admin_audit WHERE actor='owner' AND action='update'",
        )
        .get()?.n,
    ).toBe(3);
    await page.screenshot({
      path: "test-results/admin-ai-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/admin-ai-mobile.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Owner access", exact: true }),
    ).toBeVisible();
    expect(
      db.prepare("SELECT COUNT(*) AS n FROM admin_sessions").get()?.n,
    ).toBe(0);
  } finally {
    db.close();
  }
});
