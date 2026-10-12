// PreToolUse(Agent): chặn giao agent sai model / sai cách để không đốt hạn mức.
// Exit 2 + stderr = chặn và báo lý do cho Claude. Exit 0 = cho qua.
import { readFileSync } from "node:fs";

const PREMIUM = new Set(["opus", "fable"]);
const PREMIUM_OK_AGENTS = new Set(["migration-author"]);
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
    `Không giao ${model} cho agent «${type || "mặc định"}». Opus/Fable chỉ cho migration-author (migration/RPC khó). ` +
      "Việc khác: dùng agent ghim sẵn (slice-fixer, security-auditor, explore-module...) hoặc bỏ tham số model.",
  );
}
if (!PINNED_AGENTS.has(type) && model !== "haiku" && model !== "sonnet") {
  block(
    `Agent «${type || "mặc định"}» không có model ghim: đặt model là haiku (đọc/soát) hoặc sonnet (sửa), ` +
      "hoặc chọn agent trong .claude/agents.",
  );
}
process.exit(0);
