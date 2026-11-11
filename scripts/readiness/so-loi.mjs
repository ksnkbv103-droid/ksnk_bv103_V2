#!/usr/bin/env node
// Sổ lỗi sẵn sàng vận hành thử: nguồn điều hướng duy nhất cho đợt rà toàn project.
// Dùng: node scripts/readiness/so-loi.mjs status | next [n] | stats | merge | set <ID> <TRANG_THAI> [commit] | check
// Agent rà KHÔNG sửa so-loi.json; ghi mảng phát hiện vào scripts/readiness/inbox/<ten>.json, chat điều phối chạy `merge`.
import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const FILE = join(DIR, "so-loi.json");
const INBOX = join(DIR, "inbox");
const MODULES = ["VST_GSC", "CSSD", "NKBV", "QLCV", "DAO_TAO", "QUAN_TRI", "NEN"];
const LOP = ["DOMAIN", "DB", "BACKEND", "FRONTEND", "UX", "TEST", "VAN_HANH"];
const MUC = ["NGHIEM_TRONG", "CAO", "TRUNG_BINH", "THAP"];
const TT = ["MOI", "DA_XAC_MINH", "LOI_GIA", "DANG_SUA", "DA_SUA", "HOAN", "CHO_PO"];
const MO = new Set(["MOI", "DA_XAC_MINH", "DANG_SUA", "CHO_PO"]);
const PREFIX = { VST_GSC: "VST", CSSD: "CSSD", NKBV: "NKBV", QLCV: "QLCV", DAO_TAO: "DT", QUAN_TRI: "QT", NEN: "NEN" };

const load = () => (existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : []);
const save = (rows) => writeFileSync(FILE, JSON.stringify(rows, null, 2) + "\n");
const die = (m) => { console.error(m); process.exit(1); };

function validate(r, where) {
  const miss = ["module", "lop", "muc", "tieu_de", "bang_chung"].filter((k) => !String(r[k] ?? "").trim());
  if (miss.length) return `${where}: thiếu ${miss.join(", ")}`;
  if (!MODULES.includes(r.module)) return `${where}: module «${r.module}» không hợp lệ (${MODULES.join("|")})`;
  if (!LOP.includes(r.lop)) return `${where}: lop «${r.lop}» không hợp lệ (${LOP.join("|")})`;
  if (!MUC.includes(r.muc)) return `${where}: muc «${r.muc}» không hợp lệ (${MUC.join("|")})`;
  if (r.trang_thai && !TT.includes(r.trang_thai)) return `${where}: trang_thai «${r.trang_thai}» không hợp lệ`;
  return null;
}
const key = (r) => `${r.module}|${String(r.bang_chung).trim().toLowerCase()}|${String(r.tieu_de).trim().toLowerCase()}`;

function nextId(rows, module) {
  const p = PREFIX[module];
  const n = rows.filter((r) => r.id?.startsWith(p + "-")).reduce((m, r) => Math.max(m, Number(r.id.split("-")[1]) || 0), 0);
  return `${p}-${String(n + 1).padStart(3, "0")}`;
}

const [cmd, ...args] = process.argv.slice(2);
const rows = load();

if (cmd === "merge") {
  if (!existsSync(INBOX)) die("Không có thư mục inbox.");
  const seen = new Set(rows.map(key));
  let added = 0, dup = 0; const errs = [];
  for (const f of readdirSync(INBOX).filter((x) => x.endsWith(".json"))) {
    let items;
    try { items = JSON.parse(readFileSync(join(INBOX, f), "utf8")); } catch (e) { errs.push(`${f}: JSON hỏng (${e.message})`); continue; }
    if (!Array.isArray(items)) { errs.push(`${f}: phải là mảng`); continue; }
    const bad = items.map((r, i) => validate(r, `${f}[${i}]`)).filter(Boolean);
    if (bad.length) { errs.push(...bad); continue; }
    for (const r of items) {
      if (seen.has(key(r))) { dup++; continue; }
      seen.add(key(r));
      rows.push({ id: nextId(rows, r.module), module: r.module, lop: r.lop, muc: r.muc, tieu_de: r.tieu_de.trim(), bang_chung: r.bang_chung.trim(), lenh_kiem: r.lenh_kiem || "", trang_thai: r.trang_thai || "MOI", nguon: r.nguon || f.replace(/\.json$/, ""), commit: "", ghi_chu: r.ghi_chu || "" });
      added++;
    }
    unlinkSync(join(INBOX, f));
  }
  save(rows);
  console.log(`merge: thêm ${added}, trùng bỏ ${dup}, lỗi ${errs.length}`);
  if (errs.length) die(errs.join("\n"));
} else if (cmd === "set") {
  const [id, tt, commit] = args;
  const r = rows.find((x) => x.id === id) || die(`Không có ${id}`);
  if (!TT.includes(tt)) die(`trang_thai phải là ${TT.join("|")}`);
  if (tt === "DA_SUA" && !commit) die("DA_SUA cần kèm commit SHA");
  r.trang_thai = tt; if (commit) r.commit = commit;
  save(rows); console.log(`${id} → ${tt}${commit ? " @" + commit : ""}`);
} else if (cmd === "next") {
  const n = Number(args[0]) || 10;
  const open = rows.filter((r) => ["DA_XAC_MINH", "MOI"].includes(r.trang_thai))
    .sort((a, b) => MUC.indexOf(a.muc) - MUC.indexOf(b.muc) || (a.trang_thai === "DA_XAC_MINH" ? -1 : 1) || a.id.localeCompare(b.id));
  // Cột cuối = việc kế của dòng: MOI phải xác minh trước, DA_XAC_MINH mới được sửa.
  for (const r of open.slice(0, n)) console.log(`${r.id}\t${r.muc}\t${r.trang_thai}\t${r.lop}\t${r.tieu_de}\t${r.bang_chung}\t→ ${r.trang_thai === "MOI" ? "XÁC MINH (db-verify)" : "SỬA (slice-fixer)"}`);
  if (!open.length) console.log("Không còn việc MOI/DA_XAC_MINH.");
} else if (cmd === "stats") {
  // Số đo luồng: đếm theo trạng thái, tỉ lệ lỗi giả, số việc đã sửa theo ngày commit.
  const cnt = (f) => rows.filter(f).length;
  console.log(TT.map((t) => `${t} ${cnt((r) => r.trang_thai === t)}`).join(" · "));
  const closed = cnt((r) => ["DA_SUA", "LOI_GIA"].includes(r.trang_thai));
  console.log(`Tỉ lệ lỗi giả: ${cnt((r) => r.trang_thai === "LOI_GIA")}/${closed} việc đã đóng`);
  console.log(`Việc kế: xác minh ${cnt((r) => r.trang_thai === "MOI")} · sửa ${cnt((r) => r.trang_thai === "DA_XAC_MINH")} · chờ PO ${cnt((r) => r.trang_thai === "CHO_PO")}`);
  const byDay = {};
  for (const r of rows.filter((x) => x.trang_thai === "DA_SUA" && x.commit)) {
    let d = "không rõ ngày";
    try { d = execFileSync("git", ["-C", DIR, "show", "-s", "--format=%cs", r.commit], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || d; } catch { /* sha không còn */ }
    (byDay[d] ||= []).push(r.id);
  }
  for (const d of Object.keys(byDay).sort()) console.log(`Đã sửa ${d}: ${byDay[d].length} (${byDay[d].join(", ")})`);
} else if (cmd === "check") {
  // Cổng: module chưa đạt nếu còn NGHIEM_TRONG/CAO đang mở.
  let fail = 0;
  for (const m of MODULES) {
    const blk = rows.filter((r) => r.module === m && MO.has(r.trang_thai) && ["NGHIEM_TRONG", "CAO"].includes(r.muc));
    console.log(`${m.padEnd(9)} ${blk.length ? "CHƯA ĐẠT (" + blk.map((r) => r.id).join(", ") + ")" : "không còn lỗi chặn"}`);
    fail += blk.length;
  }
  process.exit(fail ? 1 : 0);
} else if (cmd === "status" || !cmd) {
  console.log(`Sổ lỗi: ${rows.length} dòng · mở ${rows.filter((r) => MO.has(r.trang_thai)).length} · đã sửa ${rows.filter((r) => r.trang_thai === "DA_SUA").length} · lỗi giả ${rows.filter((r) => r.trang_thai === "LOI_GIA").length} · hoãn ${rows.filter((r) => r.trang_thai === "HOAN").length}`);
  console.log(`${"Module".padEnd(9)} ${MUC.map((x) => x.padStart(13)).join("")}   (đang mở/tổng)`);
  for (const m of MODULES) {
    const cells = MUC.map((u) => {
      const all = rows.filter((r) => r.module === m && r.muc === u && r.trang_thai !== "LOI_GIA");
      return `${all.filter((r) => MO.has(r.trang_thai)).length}/${all.length}`.padStart(13);
    });
    console.log(`${m.padEnd(9)} ${cells.join("")}`);
  }
  const po = rows.filter((r) => r.trang_thai === "CHO_PO");
  if (po.length) { console.log("\nChờ PO:"); for (const r of po) console.log(`  ${r.id} ${r.tieu_de}`); }
} else die("Lệnh: status | next [n] | stats | merge | set <ID> <TRANG_THAI> [commit] | check");
