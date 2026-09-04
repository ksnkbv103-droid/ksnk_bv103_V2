#!/usr/bin/env node
/**
 * CI helper: skip E2E cleanly when credentials missing; fail hard when present and tests fail.
 */
import { spawnSync } from "node:child_process";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

if (!email || !password) {
  console.log(
    "[e2e-ci-gate] SKIP — thiếu E2E_USER_EMAIL / E2E_USER_PASSWORD (không fail CI).",
  );
  process.exit(0);
}

console.log("[e2e-ci-gate] Chạy Playwright với credentials đã cấu hình…");
const run = spawnSync("npm", ["run", "test:e2e"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});
process.exit(run.status ?? 1);
