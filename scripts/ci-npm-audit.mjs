#!/usr/bin/env node
/**
 * Honest npm audit for CI (ENG-CI-01).
 *
 * Modes (NPM_AUDIT_MODE):
 *   hard      — exit 1 when findings ≥ audit level (default: high), or when scan itself fails
 *   advisory  — exit 0 for workflow soft jobs, but print SOFT/ADVISORY/SCAN_ERROR
 *               and write GitHub Step Summary so green checks cannot imply "clean"
 *
 * Env:
 *   NPM_AUDIT_LEVEL    — npm --audit-level (default: high)
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
const npmExit = run.status ?? 1;
const stdout = (run.stdout || "").trim();
const stderr = (run.stderr || "").trim();

/** @type {"ok"|"parse_error"|"spawn_error"|"npm_error"|"empty"} */
let scanStatus = "ok";
let report = null;
let parseError = null;

if (run.error) {
  scanStatus = "spawn_error";
} else if (!stdout) {
  scanStatus = "empty";
} else {
  try {
    report = JSON.parse(stdout);
  } catch (e) {
    scanStatus = "parse_error";
    parseError = e;
  }
}

if (scanStatus === "ok" && report && typeof report === "object") {
  // npm audit JSON may be an error object (registry/auth) without metadata.vulnerabilities
  if (report.error || (npmExit !== 0 && !report.metadata?.vulnerabilities && !report.vulnerabilities)) {
    scanStatus = "npm_error";
  }
}

const meta = report?.metadata?.vulnerabilities || {};
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
const scanFailed = scanStatus !== "ok";

let banner;
if (scanFailed) {
  banner =
    mode === "hard"
      ? `FAIL — npm audit scan error (${scanStatus}); cannot claim clean`
      : `SCAN_ERROR / UNKNOWN — npm audit did not produce a usable report (${scanStatus}); NOT clean`;
} else if (hasBlocking) {
  banner =
    mode === "hard"
      ? "FAIL — findings at/above audit level (hard gate)"
      : "ADVISORY / SOFT — findings present; job intentionally soft (does not prove clean deps)";
} else {
  banner = "CLEAN — no findings at/above audit level";
}

console.log(`[ci-npm-audit] mode=${mode} level=${level} omitDev=${omitDev}`);
console.log(`[ci-npm-audit] scanStatus=${scanStatus} npmExit=${npmExit}`);
console.log(`[ci-npm-audit] counts:`, JSON.stringify(counts));
console.log(`[ci-npm-audit] ${banner}`);
if (run.error) console.error("[ci-npm-audit] spawn error:", run.error.message);
if (parseError) console.error("[ci-npm-audit] parse error:", parseError.message);
if (report?.error) console.error("[ci-npm-audit] npm error payload:", JSON.stringify(report.error));
if (scanFailed && stderr) process.stderr.write(stderr.slice(0, 4000) + "\n");
if (!scanFailed) {
  console.log(
    `[ci-npm-audit] atOrAbove(${level})=${atOrAbove}` +
      (mode === "advisory" && hasBlocking
        ? " — exit 0 by design; see job name + Step Summary (not a silent greenwash)"
        : ""),
  );
}

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
    `| Scan status | \`${scanStatus}\` |`,
    `| Critical | ${counts.critical} |`,
    `| High | ${counts.high} |`,
    `| Moderate | ${counts.moderate} |`,
    `| Low | ${counts.low} |`,
    `| Total | ${counts.total} |`,
    `| Status | **${banner}** |`,
    "",
    scanFailed
      ? "_Scan did not complete — this must **never** be read as CLEAN._"
      : mode === "advisory"
        ? "_Advisory job: soft by design (legacy deps e.g. exceljs). Does **not** block `verify`. A green check here with findings ≠ clean._"
        : "_Hard gate: workflow fails when findings meet audit level or scan fails._",
    "",
  ].join("\n");
  appendFileSync(summaryPath, md);
}

// Hard: fail on findings OR on broken scan (honesty — unknown ≠ clean)
if (mode === "hard" && (hasBlocking || scanFailed)) {
  process.exit(1);
}

// Advisory: soft exit 0 even on scan error, but banner/summary already say SCAN_ERROR (not CLEAN)
process.exit(0);
