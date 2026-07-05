#!/usr/bin/env node
/**
 * Local golden environment verify — chạy sau `supabase db reset` + seed + rbac sync.
 * SSOT: docs/core/operations-sop.md §2.1.2
 */
import { spawnSync } from "node:child_process";

const steps = [
  { name: "ssot:db:guard:local", cmd: "npm", args: ["run", "ssot:db:guard:local"] },
  { name: "trial:audit:probe:local", cmd: "npm", args: ["run", "trial:audit:probe:local"] },
  { name: "trial:auth:precheck:local", cmd: "npm", args: ["run", "trial:auth:precheck:local"] },
  { name: "gstt:db:audit:local", cmd: "npm", args: ["run", "gstt:db:audit:local"] },
  {
    name: "gstt-gap-id-parity-check",
    cmd: "node",
    args: [
      "scripts/run-supabase-sql.mjs",
      "--local",
      "--file",
      "scripts/sql/gstt-gap-id-parity-check.sql",
    ],
  },
  {
    name: "fact-orphan-fk-sweep",
    cmd: "node",
    args: [
      "scripts/run-supabase-sql.mjs",
      "--local",
      "--file",
      "scripts/sql/fact-orphan-fk-sweep.sql",
    ],
  },
  { name: "cssd:db:audit:local", cmd: "npm", args: ["run", "cssd:db:audit:local"] },
  { name: "admin:rbac:parity:local", cmd: "npm", args: ["run", "admin:rbac:parity:local"] },
  { name: "trial:db:precheck:local", cmd: "npm", args: ["run", "trial:db:precheck:local"] },
  { name: "trial:qlcv:precheck:local", cmd: "npm", args: ["run", "trial:qlcv:precheck:local"] },
  { name: "audit:views", cmd: "npm", args: ["run", "audit:views"] },
];

console.log("=== local:golden:verify —", steps.length, "probes ===\n");

let failed = false;
for (const step of steps) {
  process.stdout.write(`[local:golden] ${step.name} … `);
  const r = spawnSync(step.cmd, step.args, { stdio: "pipe", encoding: "utf8" });
  if (r.status !== 0) {
    failed = true;
    console.log("FAIL");
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    break;
  }
  console.log("OK");
}

if (failed) {
  console.error("\n[local:golden:verify] FAILED — xem log trên.");
  process.exit(1);
}

console.log("\n[local:golden:verify] PASSED — môi trường local sạch.");
