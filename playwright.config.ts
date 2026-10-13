import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  timeout: 60000,
  expect: { timeout: 12000 },
  use: {
    baseURL: "http://127.0.0.1:3001",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3001",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
