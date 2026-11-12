#!/usr/bin/env node
// Stop hook: chặn kết lượt (exit 2 + stderr) khi
//  (a) câu trả lời cuối thiếu khối 4 dòng («Lộ trình:»), hoặc
//  (b) câu trả lời cuối nói pass/xong/hoàn tất trong khi code chưa commit chưa qua `npm run verify:changed` (dấu verify không khớp).
// stop_hook_active=true (đã nhắc một lần trong lượt) → cho qua, không lặp.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let input = {};
try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { process.exit(0); }
if (input.stop_hook_active) process.exit(0);
const msg = String(input.last_assistant_message || "");
if (!msg.trim()) process.exit(0);

const errs = [];
if (!/Lộ trình:/.test(msg)) errs.push("Thiếu khối 4 dòng cuối trả lời (Lộ trình · Clear · Bước kế · Model) theo CLAUDE.md.");

if (/\b(pass|PASS)\b|xong|hoàn tất/i.test(msg)) {
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  try {
    const { codeStamp, readStamp } = await import(pathToFileURL(join(root, "scripts/verify-stamp.mjs")).href);
    const s = codeStamp(input.cwd || root);
    if (s.hash && readStamp(s.path) !== s.hash) {
      errs.push(`Báo pass/xong nhưng ${s.files.length} file code chưa commit chưa qua kiểm chứng (vd ${s.files.slice(0, 3).join(", ")}). Chạy \`npm run verify:changed\` rồi báo kết quả nguyên văn.`);
    }
  } catch { /* repo không có verify-stamp.mjs: bỏ qua phần (b) */ }
}

if (errs.length) {
  console.error(`[stop-gate] ${errs.join(" ")}`);
  process.exit(2);
}
