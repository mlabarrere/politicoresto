import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "retain-on-failure"
  },
  webServer: {
    command:
      "powershell -Command \"if (Test-Path .next) { Remove-Item -Recurse -Force .next }; npm run dev -- --hostname 127.0.0.1 --port 3001\"",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    {
      name: "desktop",
      use: {
        browserName: "chromium",
        ...devices["Desktop Chrome"]
      }
    },
    {
      name: "mobile",
      use: {
        browserName: "chromium",
        ...devices["Pixel 5"]
      }
    }
  ]
});
