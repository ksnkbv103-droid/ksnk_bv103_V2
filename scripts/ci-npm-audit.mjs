#!/usr/bin/env node
/**
 * Honest npm audit for CI (ENG-CI-01).
 *
 * Modes (NPM_AUDIT_MODE):
 *   hard      — exit 1 when findings ≥ audit level (default: high)
 *   advisory  — always exit 0 for workflow soft jobs, but print SOFT/ADVISORY
 *               and write GitHub Step Summary so green checks cannot imply "clean"
 *
 * Env:
 *   NPM_AUDIT_LEVEL   — npm --audit-level (default: high)
 *   NPM_AUDIT_OMIT_DEV — "1" → --omit=dev (production-ish tree)
 */
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const mode = (process.env.NPM_AUDIT_MODE || "advisory").toLowerCase();
const level = (process.env.NPM_AUDIT_LEVEL || "high").toLowerCase();
const omitDev = process.env.NPM_AUDIT_OMIT_DEV === "1";

const args = ["audit", "--json", `--audit-level=${level}`];
if (omitDev) args.push("--omit=dev");

const run = spawnSync("npm", args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
let report = {};
try {
  report = JSON.parse(run.stdout || "{}");
} catch {
  console.error("[ci-npm-audit] Không parse được JSON từ npm audit.");
  if (run.stderr) process.stderr.write(run.stderr.slice(0, 4000));
  process.exit(mode === "hard" ? 1 : 0);
}

const meta = report.metadata?.vulnerabilities || {};
const counts = {
  critical: Number(meta.critical || 0),
  high: Number(meta.high || 0),
  moderate: Number(meta.moderate || 0),
  low: Number(meta.low || 0),
  info: Number(meta.info || 0),
  total: Number(meta.total || 0),
};

const rank = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const threshold = rank[level] ?? 3;
const atOrAbove =
  (threshold <= 4 ? counts.critical : 0) +
  (threshold <= 3 ? counts.high : 0) +
  (threshold <= 2 ? counts.moderate : 0) +
  (threshold <= 1 ? counts.low : 0) +
  (threshold <= 0 ? counts.info : 0);

const hasBlocking = atOrAbove > 0;
const npmExit = run.status ?? 1;

const banner = hasBlocking
  ? mode === "hard"
    ? "FAIL — findings at/above audit level (hard gate)"
    : "ADVISORY / SOFT — findings present; job intentionally soft (does not prove clean deps)"
  : "CLEAN — no findings at/above audit level";

console.log(`[ci-npm-audit] mode=${mode} level=${level} omitDev=${omitDev}`);
console.log(`[ci-npm-audit] counts:`, JSON.stringify(counts));
console.log(`[ci-npm-audit] ${banner}`);
console.log(
  `[ci-npm-audit] npm exit=${npmExit}; atOrAbove(${level})=${atOrAbove}` +
    (mode === "advisory" && hasBlocking
      ? " — exit 0 by design; see job name + Step Summary (not a silent greenwash)"
      : ""),
);

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const md = [
    `## NPM Audit (${mode})`,
    "",
    `| Field | Value |`,
    `|---|---|`,
    `| Mode | \`${mode}\` |`,
    `| Audit level | \`${level}\` |`,
    `| Omit dev | \`${omitDev}\` |`,
    `| Critical | ${counts.critical} |`,
    `| High | ${counts.high} |`,
    `| Moderate | ${counts.moderate} |`,
    `| Low | ${counts.low} |`,
    `| Total | ${counts.total} |`,
    `| Status | **${banner}** |`,
    "",
    mode === "advisory"
      ? "_Advisory job: soft by design (legacy deps e.g. exceljs). Does **not** block `verify`. A green check here with findings ≠ clean._"
      : "_Hard gate: workflow fails when findings meet audit level._",
    "",
  ].join("\n");
  appendFileSync(summaryPath, md);
}

if (mode === "hard" && hasBlocking) {
  process.exit(1);
}

process.exit(0);
