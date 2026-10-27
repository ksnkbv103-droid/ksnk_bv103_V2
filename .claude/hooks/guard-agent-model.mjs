// PreToolUse(Agent): chặn giao agent sai model / sai cách để không đốt hạn mức.
// Exit 2 + stderr = chặn và báo lý do cho Claude. Exit 0 = cho qua.
import { readFileSync } from "node:fs";

const PREMIUM = new Set(["opus", "fable"]);
const PREMIUM_OK_AGENTS = new Set(["migration-author", "review-bv103", "security-auditor"]);
const PINNED_AGENTS = new Set([
  "acceptance-ui", "db-verify", "explore-module", "intake-coach", "review-bv103",
  "test-writer", "verify-runner", "slice-fixer", "migration-author", "security-auditor",
]);

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0);
}
const ti = input.tool_input || {};
const type = String(ti.subagent_type || "").trim();
const model = String(ti.model || "").trim().toLowerCase();
const block = (msg) => {
  console.error(`[guard-agent-model] ${msg} Xem docs/core/skills-catalog.md §6 và CLAUDE.md «Ngân sách».`);
  process.exit(2);
};

if (PREMIUM.has(model) && !PREMIUM_OK_AGENTS.has(type)) {
  block(
    `Không giao ${model} cho agent «${type || "mặc định"}». Opus/Fable chỉ cho migration-author, review-bv103, security-auditor. ` +
      "Việc khác: dùng agent ghim sẵn (slice-fixer, security-auditor, explore-module...) hoặc bỏ tham số model.",
  );
}
if (!PINNED_AGENTS.has(type)) {
  block(
    `Agent «${type || "mặc định"}» bị chặn: general-purpose/Explore/Plan mang toàn bộ công cụ + MCP (~100k ngữ cảnh/lượt, gấp ~5 lần agent ghim). ` +
      "Dùng agent trong .claude/agents (explore-module đọc/tìm, slice-fixer sửa, review-bv103/security-auditor rà...).",
  );
}
process.exit(0);
