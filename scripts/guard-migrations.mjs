#!/usr/bin/env node
// Hàng rào migration. Nguồn sự thật: supabase/PROD_HEAD (dòng 1 = version file mới nhất đã áp prod).
//  - Lint (npm run guard:migrations [-- --base <ref>]): so cây làm việc với <ref> (mặc định HEAD).
//      * file migration version <= PROD_HEAD bị sửa / đổi tên / xóa / thêm mới -> lỗi
//      * file mới version > PROD_HEAD thiếu dòng `-- ADR: <nội dung>` -> lỗi
//  - Hook (node scripts/guard-migrations.mjs --hook, PreToolUse Edit|Write|MultiEdit|Bash): đọc JSON stdin,
//    chặn (exit 2 + stderr) khi ghi/xóa/đổi tên file migration version <= PROD_HEAD.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = "supabase/migrations";
const FILE_RE = /(?:^|\/)supabase\/migrations\/(\d{14})_[^/]+\.sql$/;
const ADR_RE = /^--\s*ADR:\s*\S+/m;

function prodHead() {
  const p = join(ROOT, "supabase/PROD_HEAD");
  const first = readFileSync(p, "utf8").split("\n")[0].trim();
  if (!/^\d{14}$/.test(first)) throw new Error(`supabase/PROD_HEAD dòng 1 phải là 14 chữ số, thấy: «${first}»`);
  return first;
}
const versionOf = (path) => (FILE_RE.exec(path.replaceAll("\\", "/")) || [])[1] || null;

function hook(head) {
  let input = {};
  try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { process.exit(0); }
  const ti = input.tool_input || {};
  const hits = [];
  if (input.tool_name === "Bash") {
    const cmd = String(ti.command || "");
    const mutates = /\b(rm|mv|cp|tee|truncate|ln|install|dd)\b|sed\s+(-[a-zA-Z]*i|--in-place)|perl\s+-[a-zA-Z]*i|git\s+(rm|mv|checkout|restore|apply)|(^|[^>0-9])>{1,2}\s*\S*supabase\/migrations/.test(cmd);
    if (mutates) {
      for (const m of cmd.matchAll(/supabase\/migrations\/(\d{14})_[^\s'"`;|&)]*/g)) if (m[1] <= head) hits.push(m[0]);
    }
  } else {
    const fp = ti.file_path ? String(ti.file_path) : "";
    const v = versionOf(fp);
    if (v && v <= head) hits.push(relative(ROOT, resolve(fp)));
  }
  if (hits.length) {
    console.error(`[guard-migrations] CHẶN: ${hits.join(", ")} có version <= PROD_HEAD ${head} (đã áp prod, bất biến). Tạo migration mới (version > ${head}, có dòng «-- ADR:») thay vì sửa file cũ.`);
    process.exit(2);
  }
  process.exit(0);
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function lint(head, base) {
  const errs = [];
  const added = new Set();
  for (const line of git(["diff", "--name-status", "--no-renames", "-z", base, "--", DIR]).split("\0").reduce((a, t, i, arr) => {
    if (i % 2 === 0 && t) a.push(`${t}\t${arr[i + 1]}`);
    return a;
  }, [])) {
    const [st, path] = line.split("\t");
    const v = versionOf(path);
    if (!v) continue;
    if (st === "A") added.add(path);
    else if (v <= head) errs.push(`${st === "D" ? "xóa/đổi tên" : "sửa"} ${path} (version ${v} <= PROD_HEAD ${head})`);
  }
  for (const p of git(["ls-files", "-o", "--exclude-standard", "-z", "--", DIR]).split("\0").filter(Boolean)) if (versionOf(p)) added.add(p);
  for (const path of added) {
    const v = versionOf(path);
    if (v <= head) { errs.push(`thêm ${path} với version ${v} <= PROD_HEAD ${head} (phải > head)`); continue; }
    const file = join(ROOT, path);
    if (existsSync(file) && !ADR_RE.test(readFileSync(file, "utf8"))) errs.push(`${path} thiếu dòng «-- ADR: <nội dung>»`);
  }
  if (errs.length) {
    console.error(`[guard-migrations] FAIL (PROD_HEAD ${head}, base ${base}):\n- ${errs.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`[guard-migrations] OK (PROD_HEAD ${head}, base ${base})`);
}

let head;
try { head = prodHead(); } catch (e) { console.error(`[guard-migrations] ${e.message}`); process.exit(process.argv.includes("--hook") ? 2 : 1); }
if (process.argv.includes("--hook")) hook(head);
else {
  const i = process.argv.indexOf("--base");
  lint(head, i > 0 ? process.argv[i + 1] : "HEAD");
}
