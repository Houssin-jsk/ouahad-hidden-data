import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { availabilityFixture } from "../fixtures/cloud-availability";
import { handleAvailability } from "../../src/cloud-vision/server/availability";
import { DEFAULT_POLICY } from "../../src/cloud-vision/server/policy";

async function simulate(page: Page) {
  const f = availabilityFixture();
  await page.route("**/api/cloud-vision/status", async (route) => {
    const response = await handleAvailability(
      new Request(route.request().url(), {
        headers: route.request().headers(),
      }),
      f.env,
      { ledger: f.ledger, adapters: [f.adapter] },
    );
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    });
  });
  return f;
}
async function ready(page: Page) {
  await page.goto("/");
  await page
    .getByLabel("Choose image")
    .setInputFiles("tests/fixtures/phase01/red.png");
  await page
    .getByRole("button", { name: "Analyze image", exact: true })
    .click();
  await expect(page.getByTestId("image-dna")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AI Visual Observations", exact: true }),
  ).toBeVisible();
}
async function check(page: Page, code: string) {
  await page.locator(".cloud-access > summary").click();
  await page.getByLabel("Pilot access code").fill(code);
  await page.getByRole("button", { name: "Check access", exact: true }).click();
}
for (const state of [
  "globally disabled",
  "emergency stop",
  "missing release",
  "no qualified provider",
  "no invitations",
  "provider cooldown",
] as const) {
  test(`Overview truthfully reports ${state} without image upload or provider invocation`, async ({
    page,
  }) => {
    const f = await simulate(page),
      posts: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST") posts.push(r.url());
    });
    try {
      if (state === "globally disabled") f.adapter.eligibility.enabled = false;
      if (state === "emergency stop")
        f.db
          .prepare("UPDATE ai_settings SET config=?")
          .run(JSON.stringify(DEFAULT_POLICY));
      if (state === "missing release")
        delete f.env.CLOUD_AI_RELEASE_READY_UNTIL;
      if (state === "no qualified provider")
        f.db.exec("UPDATE providers SET enabled=0");
      if (state === "no invitations") f.env.CLOUD_AI_INVITES = "{}";
      if (state === "provider cooldown")
        f.db
          .prepare(
            "INSERT INTO cloud_cooldowns(provider,until_time) VALUES(?,?)",
          )
          .run(f.adapter.model, Date.now() + 60000);
      const before = f.snapshot();
      await ready(page);
      await expect(page.locator(".cloud-availability")).toContainText(
        "currently unavailable",
      );
      await expect(
        page.getByRole("button", { name: "Start Cloud AI analysis" }),
      ).toHaveCount(0);
      await expect(page.locator(".cloud-access")).toHaveCount(0);
      await expect(page.locator(".cloud-observations")).not.toContainText(
        /Gemini|Cloudflare|quota|billing|kill|provider/,
      );
      expect(posts).toEqual([]);
      expect(f.snapshot()).toBe(before);
      expect(f.providerCalls()).toBe(0);
      expect(f.queries.every((sql) => sql.trim().startsWith("SELECT"))).toBe(
        true,
      );
    } finally {
      f.db.close();
    }
  });
}
for (const expired of [false, true]) {
  test(`${expired ? "expired" : "invalid"} invitation never reveals a start action`, async ({
    page,
  }) => {
    const f = await simulate(page);
    try {
      if (expired) {
        const another = createHash("sha256")
          .update("B".repeat(43))
          .digest("hex");
        f.env.CLOUD_AI_INVITES = JSON.stringify({
          [f.hash]: {
            country: "MA",
            expiresAt: new Date(Date.now() - 1000).toISOString(),
          },
          [another]: {
            country: "MA",
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
        });
      }
      await ready(page);
      await expect(page.locator(".cloud-availability")).toContainText(
        "invited testers",
      );
      await check(page, expired ? f.code : "Z".repeat(43));
      await expect(page.locator(".cloud-availability")).toContainText(
        "invalid or expired",
      );
      await expect(
        page.getByRole("button", { name: "Start Cloud AI analysis" }),
      ).toHaveCount(0);
      expect(f.providerCalls()).toBe(0);
    } finally {
      f.db.close();
    }
  });
}

for (const width of [390, 1280]) {
  test(`discoverable restricted and eligible Overview, keyboard access and declined consent at ${width}px`, async ({
    page,
  }) => {
    const f = await simulate(page),
      uploads: string[] = [];
    await page.setViewportSize({ width, height: 900 });
    page.on("request", (r) => {
      if (r.method() === "POST") uploads.push(r.url());
    });
    try {
      await ready(page);
      await expect(page.locator(".cloud-availability")).toContainText(
        "invited testers",
      );
      const summary = page.locator(".cloud-access > summary");
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByLabel("Pilot access code")).toBeVisible();
      await page.getByLabel("Pilot access code").fill(f.code);
      await page
        .getByRole("button", { name: "Check access", exact: true })
        .click();
      await expect(page.locator(".cloud-availability")).toContainText(
        "Access confirmed",
      );
      await expect(page.locator(".cloud-availability")).toBeFocused();
      const start = page.getByRole("button", {
        name: "Start Cloud AI analysis",
        exact: true,
      });
      await expect(start).toBeDisabled();
      await page.getByLabel(/I am 18 or older/).check();
      await expect(start).toBeDisabled();
      await page.getByLabel(/I agree to send/).check();
      await expect(start).toBeEnabled();
      await page.getByLabel(/I agree to send/).uncheck();
      await expect(start).toBeDisabled();
      expect(uploads).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.getByLabel("Pilot access code").fill("B".repeat(43));
      await expect(start).toHaveCount(0);
      expect(f.providerCalls()).toBe(0);
    } finally {
      f.db.close();
    }
  });
}

test("server state is rechecked on start and quota exhaustion removes the unavailable action", async ({
  page,
}) => {
  const f = await simulate(page);
  let posts = 0;
  await page.route("**/api/cloud-vision", async (route) => {
    posts++;
    await route.fulfill({
      status: 429,
      json: {
        schema: "cloud-vision/1",
        status: "unavailable",
        error: "quota_exhausted",
        message: "internal quota details must not appear",
      },
    });
  });
  try {
    await ready(page);
    await check(page, f.code);
    await page.getByLabel(/I am 18 or older/).check();
    await page.getByLabel(/I agree to send/).check();
    await page
      .getByRole("button", { name: "Start Cloud AI analysis", exact: true })
      .click();
    await expect(page.locator(".cloud-availability")).toContainText(
      "currently unavailable",
    );
    await expect(page.locator(".cloud-status")).toContainText(
      "quota is exhausted",
    );
    await expect(
      page.getByRole("button", { name: "Retry Cloud AI" }),
    ).toHaveCount(0);
    await expect(page.locator(".cloud-observations")).not.toContainText(
      "internal quota",
    );
    await page
      .getByRole("button", { name: "Check availability", exact: true })
      .click();
    await expect(page.locator(".cloud-availability")).toContainText(
      "Access confirmed",
    );
    await expect(page.getByLabel(/I agree to send/)).not.toBeChecked();
    await page.locator(".cloud-access > summary").click();
    await expect(
      page.getByRole("button", { name: "Retry Cloud AI", exact: true }),
    ).toBeDisabled();
    expect(posts).toBe(1);
    expect(f.providerCalls()).toBe(0);
  } finally {
    f.db.close();
  }
});

test("malformed or failed availability cannot enable inference", async ({
  page,
}) => {
  await page.route("**/api/cloud-vision/status", (route) =>
    route.fulfill({
      status: 500,
      json: { schema: "cloud-availability/1", status: "eligible" },
    }),
  );
  await ready(page);
  await expect(page.locator(".cloud-availability")).toContainText(
    "currently unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Start Cloud AI analysis" }),
  ).toHaveCount(0);
});
