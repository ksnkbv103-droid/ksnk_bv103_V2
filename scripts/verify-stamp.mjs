// Dấu verify: sha256 của thay đổi code chưa commit (git diff HEAD + nội dung file chưa track).
// verify-changed.mjs ghi dấu khi PASS; .claude/hooks/stop-gate.mjs so dấu trước khi cho báo «xong».
// Code = src/, supabase/, scripts/ (trừ scripts/readiness/), không tính *.md. Lưu ở <git-dir>/verify-stamp (mỗi worktree riêng, không commit).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const isCode = (f) => /^(src|supabase|scripts)\//.test(f) && !/^scripts\/readiness\//.test(f) && !/\.md$/.test(f);

export function codeStamp(cwd = process.cwd()) {
  const git = (a) => spawnSync("git", a, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).stdout || "";
  const top = git(["rev-parse", "--show-toplevel"]).trim();
  if (!top) return { files: [], hash: null, path: null };
  const tracked = git(["diff", "--name-only", "HEAD"]).split("\n").filter(isCode);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(isCode);
  const files = [...tracked, ...untracked].sort();
  const path = join(resolve(top, git(["rev-parse", "--git-dir"]).trim()), "verify-stamp");
  if (!files.length) return { files, hash: null, path };
  const h = createHash("sha256");
  if (tracked.length) h.update(spawnSync("git", ["diff", "HEAD", "--", ...tracked], { cwd: top, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).stdout || "");
  for (const f of untracked) {
    h.update(`\0${f}\0`);
    try { h.update(readFileSync(join(top, f))); } catch { /* file vừa bị xóa */ }
  }
  return { files, hash: h.digest("hex"), path };
}

export const readStamp = (path) => (path && existsSync(path) ? readFileSync(path, "utf8").trim() : "");
export const writeStamp = ({ hash, path }) => { if (hash && path) writeFileSync(path, `${hash}\n`); };
