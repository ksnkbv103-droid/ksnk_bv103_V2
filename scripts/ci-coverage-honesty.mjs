#!/usr/bin/env node
/**
 * Post-coverage honesty banner (ENG-CI-01).
 * Reads Vitest/Istanbul coverage-summary.json when present and states clearly
 * that CI does NOT enforce a global % threshold on src/**.
 */
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const candidates = [
  join(root, "coverage", "coverage-summary.json"),
  join(root, "coverage", "coverage-final.json"),
];

function pct(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "n/a";
  return `${n.toFixed(1)}%`;
}

let lines = "n/a";
let statements = "n/a";
let functions = "n/a";
let branches = "n/a";
let source = "none";

const summaryPath = candidates[0];
if (existsSync(summaryPath)) {
  source = "coverage-summary.json";
  try {
    const j = JSON.parse(readFileSync(summaryPath, "utf8"));
    const total = j.total || {};
    lines = pct(total.lines?.pct);
    statements = pct(total.statements?.pct);
    functions = pct(total.functions?.pct);
    branches = pct(total.branches?.pct);
  } catch (e) {
    console.warn("[ci-coverage-honesty] parse summary failed:", e.message);
  }
} else if (existsSync(candidates[1])) {
  source = "coverage-final.json (totals not aggregated — run with json-summary reporter)";
}

const banner =
  "NO GLOBAL % GATE — include src/** is intentionally report-only (~pilot modules enforce via verify:cssd / engineering, not repo-wide 80%).";

console.log("[ci-coverage-honesty]", banner);
console.log(
  `[ci-coverage-honesty] source=${source} lines=${lines} statements=${statements} functions=${functions} branches=${branches}`,
);

const gh = process.env.GITHUB_STEP_SUMMARY;
if (gh) {
  appendFileSync(
    gh,
    [
      `## Coverage (report-only)`,
      "",
      banner,
      "",
      `| Metric | pct |`,
      `|---|---|`,
      `| Lines | ${lines} |`,
      `| Statements | ${statements} |`,
      `| Functions | ${functions} |`,
      `| Branches | ${branches} |`,
      `| Source | \`${source}\` |`,
      "",
      "_Step name must never claim ≥80% unless vitest `coverage.thresholds` is restored with a realistic include scope._",
      "",
    ].join("\n"),
  );
}

process.exit(0);
