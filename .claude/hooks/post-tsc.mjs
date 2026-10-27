// PostToolUse(Edit|Write): sau khi sửa .ts/.tsx chạy `tsc --noEmit`; chỉ in khi lỗi (tối đa 30 dòng).
// Exit 2 + stderr = báo lỗi cho Claude. Exit 0 = im lặng.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0);
}
const file = String(input.tool_input?.file_path || "");
if (!/\.(ts|tsx)$/.test(file)) process.exit(0);

const r = spawnSync("npx", ["tsc", "--noEmit", "--pretty", "false"], {
  cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  encoding: "utf8",
  timeout: 90_000,
});
if (r.status === 0) process.exit(0);

const out = `${r.stdout || ""}${r.stderr || ""}`.trim().split("\n");
const shown = out.slice(0, 30).join("\n");
const more = out.length > 30 ? `\n… (+${out.length - 30} dòng)` : "";
console.error(`[post-tsc] tsc --noEmit lỗi sau khi sửa ${file}:\n${shown}${more}`);
process.exit(2);
