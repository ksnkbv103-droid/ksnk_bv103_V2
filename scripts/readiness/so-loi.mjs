#!/usr/bin/env node
// Sổ lỗi sẵn sàng vận hành thử: nguồn điều hướng duy nhất cho đợt rà toàn project.
// Dùng: node scripts/readiness/so-loi.mjs status | next [n] | next --tay [n] | stats | report [--ghi|--kiem] | merge | set <ID> <TRANG_THAI> [commit] | ghi <ID> <truong> <giá trị> | tay <ID> <DAT|KHONG_DAT|CHUA> [ghi chú] | check
// Cổng luồng (CLAUDE.md «Luồng một con đường»): việc `tinh_nang` cần nguoi_dung + ma_dac_ta (bước 1) và phuong_an + phan_bien + duyet (bước 2–4) trước DANG_SUA; việc `loi` đi tắt, không bị chặn.
// Agent rà KHÔNG sửa so-loi.json; ghi mảng phát hiện vào scripts/readiness/inbox/<ten>.json, chat điều phối chạy `merge`.
import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readSpec } from "../lib/dac-ta.mjs";

const DIR = dirname(fileURLToPath(import.meta.url));
const FILE = process.env.SO_LOI_FILE || join(DIR, "so-loi.json"); // biến môi trường chỉ để thử trên bản sao
const INBOX = join(DIR, "inbox");
const MODULES = ["VST_GSC", "CSSD", "NKBV", "QLCV", "DAO_TAO", "QUAN_TRI", "NEN"];
const LOP = ["DOMAIN", "DB", "BACKEND", "FRONTEND", "UX", "TEST", "VAN_HANH"];
const MUC = ["NGHIEM_TRONG", "CAO", "TRUNG_BINH", "THAP"];
const TT = ["MOI", "DA_XAC_MINH", "LOI_GIA", "DANG_SUA", "DA_SUA", "HOAN", "CHO_PO"];
const TAY = ["CHUA", "DAT", "KHONG_DAT"]; // kịch bản tay trên giao diện; rỗng = dòng không cần thử tay
const LOP_TAY = new Set(["FRONTEND", "UX"]);
// Việc kế của một dòng đã xác minh: migration không giao slice-fixer, việc vận hành/prod chờ PO.
const viecKe = (r) => r.trang_thai === "MOI" ? "XÁC MINH (db-verify)" : r.lop === "DB" ? "SỬA (migration-author)" : r.lop === "VAN_HANH" ? "CHỜ PO (prod/vận hành)" : "SỬA (slice-fixer)";
const MO = new Set(["MOI", "DA_XAC_MINH", "DANG_SUA", "CHO_PO"]);
const PREFIX = { VST_GSC: "VST", CSSD: "CSSD", NKBV: "NKBV", QLCV: "QLCV", DAO_TAO: "DT", QUAN_TRI: "QT", NEN: "NEN" };
const LOAI = ["loi", "tinh_nang"];
const loaiOf = (r) => r.loai || "loi"; // dòng cũ không có trường `loai` = lỗi (đường tắt)
const TRUONG_GHI = ["nguoi_dung", "ma_dac_ta", "loai", "phuong_an", "phan_bien", "duyet"];
const REPO = join(DIR, "..", "..");
const BAO_CAO = process.env.SO_LOI_BAO_CAO || join(REPO, "docs/bo-tai-lieu/03-tien-do-thuc-trang.md"); // nơi `report --ghi` ghi; biến môi trường chỉ để thử
const MOC_DAU = "<!-- so-loi:report:begin -->";
const MOC_CUOI = "<!-- so-loi:report:end -->";
const THU_TU_MODULE = ["VST_GSC", "CSSD", "NKBV", "QLCV", "DAO_TAO"]; // một module một lúc (CLAUDE.md «Mục tiêu»)

const git = (a) => execFileSync("git", ["-C", DIR, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 });
// File đổi trong một commit: [{ st: A|M|D…, path }]; null nếu sha không còn. Có nhớ đệm vì stats gọi lại nhiều lần.
const cacheFiles = new Map();
const commitFiles = (sha) => {
  const s = String(sha).split(/[ ,]/)[0];
  if (!cacheFiles.has(s)) {
    let v = null;
    try { v = git(["show", "--name-status", "--format=", s]).split("\n").filter(Boolean).map((l) => { const [st, ...p] = l.split("\t"); return { st: st[0], path: p[p.length - 1] }; }); } catch { /* sha không còn */ }
    cacheFiles.set(s, v);
  }
  return cacheFiles.get(s);
};
// Commit có chạm spec/migration (bằng chứng tái hiện tự động) hay không.
const touchesTest = (sha) => (commitFiles(sha) ?? []).some((f) => /\.spec\.tsx?$|^supabase\/migrations\//.test(f.path));
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
  if (r.loai && !LOAI.includes(r.loai)) return `${where}: loai «${r.loai}» không hợp lệ (${LOAI.join("|")})`;
  // Cổng 1: việc tinh_nang vào sổ phải có vai người dùng và mã đặc tả; các trường bước 2–4 nếu có thì phải đúng dạng.
  if (r.loai === "tinh_nang") { const e = loiBuoc1(r); if (e.length) return `${where}: tinh_nang ${e.join("; ")}`; }
  const sai = TRUONG_GHI.filter((k) => r[k] !== undefined && r[k] !== "" && VALIDATE_TRUONG[k]?.(r[k]));
  if (sai.length) return `${where}: ${sai.map((k) => VALIDATE_TRUONG[k](r[k])).join("; ")}`;
  return null;
}
const key = (r) => `${r.module}|${String(r.bang_chung).trim().toLowerCase()}|${String(r.tieu_de).trim().toLowerCase()}`;

function nextId(rows, module) {
  const p = PREFIX[module];
  const n = rows.filter((r) => r.id?.startsWith(p + "-")).reduce((m, r) => Math.max(m, Number(r.id.split("-")[1]) || 0), 0);
  return `${p}-${String(n + 1).padStart(3, "0")}`;
}

// ── Cổng luồng: mỗi hàm trả chuỗi lỗi hoặc null. Trường là JSON có cấu trúc để máy kiểm được, không phải văn xuôi.
const co = (v) => String(v ?? "").trim() !== "";
const MA_DAC_TA = /^(?:R|T)\d+\.\d+[a-z]?$/;
const maDacTa = (v) => (Array.isArray(v) ? v : String(v ?? "").split(/[,\s]+/)).map((x) => String(x).trim()).filter(Boolean);
const loiNguoiDung = (v) => (co(v) ? null : "nguoi_dung rỗng (vai người dùng cần việc này)");
const loiMaDacTa = (v) => {
  const ds = maDacTa(v);
  if (!ds.length) return "ma_dac_ta rỗng (mã R/T trong đặc tả M01–M15)";
  const xau = ds.filter((m) => !MA_DAC_TA.test(m));
  if (xau.length) return `ma_dac_ta sai dạng: ${xau.join(", ")} (R1.12 / T3.01)`;
  const spec = readSpec();
  if (!spec) return null; // máy không có thư mục đặc tả: chỉ kiểm dạng mã
  const co_ = new Set(spec.map((r) => r.ma));
  const thieu = ds.filter((m) => !co_.has(m));
  return thieu.length ? `ma_dac_ta không có trong đặc tả: ${thieu.join(", ")}` : null;
};
const loiPhuongAn = (v) => {
  if (!Array.isArray(v) || v.length < 2) return "phuong_an phải là mảng ≥ 2 phương án [{ten, lam_sai}]";
  const i = v.findIndex((p) => !co(p?.ten) || !co(p?.lam_sai));
  return i >= 0 ? `phuong_an[${i}] thiếu ten hoặc lam_sai («điều gì làm phương án sai»)` : null;
};
const loiPhanBien = (v) => {
  if (v && co(v.khong_phan_doi)) return /\d/.test(String(v.khong_phan_doi)) ? null : "phan_bien.khong_phan_doi phải kèm số đo (có chữ số)";
  const d = v?.phan_doi;
  if (!Array.isArray(d) || !d.length) return "phan_bien phải có phan_doi[] (≥ 1 mục {y, bang_chung, tra_loi}) hoặc khong_phan_doi kèm số đo";
  const i = d.findIndex((x) => !co(x?.y) || !co(x?.bang_chung) || !co(x?.tra_loi));
  return i >= 0 ? `phan_bien.phan_doi[${i}] thiếu y, bang_chung hoặc tra_loi` : null;
};
const loiDuyet = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) && !Number.isNaN(Date.parse(v)) ? null : "duyet phải là ngày PO duyệt YYYY-MM-DD");
const VALIDATE_TRUONG = {
  nguoi_dung: loiNguoiDung, ma_dac_ta: loiMaDacTa, phuong_an: loiPhuongAn, phan_bien: loiPhanBien, duyet: loiDuyet,
  loai: (v) => (LOAI.includes(v) ? null : `loai phải là ${LOAI.join("|")}`),
};
// Bước 1 (nhận yêu cầu): luôn đòi với việc tinh_nang. Bước 2–4: đòi trước DANG_SUA.
const loiBuoc1 = (r) => [loiNguoiDung(r.nguoi_dung), loiMaDacTa(r.ma_dac_ta)].filter(Boolean);
const loiBuoc24 = (r) => [loiPhuongAn(r.phuong_an), loiPhanBien(r.phan_bien), loiDuyet(r.duyet)].filter(Boolean);
const cuaTinhNang = (r) => loaiOf(r) === "tinh_nang" && r.trang_thai !== "LOI_GIA";

// ── Số đo luồng (§10 #8): ba hàm tính từ git và migration, in cùng định nghĩa.
const ngayXuatHien = () => { // id → ngày (YYYY-MM-DD) commit đầu tiên đưa id vào sổ
  const first = new Map();
  try {
    let cur = "";
    for (const l of git(["log", "--reverse", "-p", "--format=@@C %cs", "--", FILE]).split("\n")) {
      if (l.startsWith("@@C ")) { cur = l.slice(4).trim(); continue; }
      const m = l.match(/^\+\s+"id": "([^"]+)"/);
      if (m && !first.has(m[1])) first.set(m[1], cur);
    }
  } catch { /* sổ không nằm trong git (bản sao thử) */ }
  return first;
};
const tuoiTrungBinhMo = (rows, homNay) => {
  const first = ngayXuatHien();
  const ds = rows.filter((r) => MO.has(r.trang_thai) && first.has(r.id)).map((r) => (Date.parse(homNay) - Date.parse(first.get(r.id))) / 864e5);
  const mo = rows.filter((r) => MO.has(r.trang_thai)).length;
  return ds.length ? `Tuổi TB việc mở: ${(ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(1).replace(".", ",")} ngày (${ds.length}/${mo} dòng mở có ngày; mốc = commit đầu đưa id vào so-loi.json)` : `Tuổi TB việc mở: không rõ (0/${mo} dòng mở có ngày trong git)`;
};
const migrationMoiLat = (rows) => {
  const lat = [...new Set(rows.filter((r) => r.trang_thai === "DA_SUA" && r.commit).map((r) => String(r.commit).split(/[ ,]/)[0]))];
  const dem = lat.map(commitFiles).filter(Boolean).map((fs) => fs.filter((f) => f.st === "A" && /^supabase\/migrations\/.+\.sql$/.test(f.path)).length);
  if (!dem.length) return "Migration mỗi lát: không rõ (không tra được commit DA_SUA)";
  return `Migration mỗi lát: TB ${(dem.reduce((a, b) => a + b, 0) / dem.length).toFixed(2).replace(".", ",")} · lớn nhất ${Math.max(...dem)} · lát có ≥ 1 migration ${dem.filter((n) => n > 0).length}/${dem.length} (file migration thêm mới trong mỗi commit DA_SUA, mỗi commit đếm một lần; trần plan ≤ 1)`;
};
const hamDinhNghiaLai = (homNay) => {
  const dir = join(REPO, "supabase/migrations");
  if (!existsSync(dir)) return "Hàm định nghĩa lại 30 ngày: không rõ (không có supabase/migrations)";
  const defs = new Map(); // tên hàm → [mốc 14 số của từng lần CREATE OR REPLACE FUNCTION]
  for (const f of readdirSync(dir).filter((n) => /^\d{14}_.*\.sql$/.test(n)).sort()) {
    for (const m of readFileSync(join(dir, f), "utf8").matchAll(/create\s+or\s+replace\s+function\s+(?:public\.)?"?(\w+)"?\s*\(/gi)) {
      const n = m[1].toLowerCase();
      defs.set(n, [...(defs.get(n) || []), f.slice(0, 14)]);
    }
  }
  const cat = new Date(Date.parse(homNay) - 30 * 864e5).toISOString().slice(0, 10).replace(/-/g, "") + "000000";
  let lan = 0; const ham = new Set();
  for (const [n, ts] of defs) ts.forEach((t, i) => { if (t >= cat && i > 0) { lan++; ham.add(n); } });
  const tong = [...defs.values()].reduce((a, v) => a + v.length, 0);
  return `Hàm định nghĩa lại 30 ngày: ${ham.size} hàm (${lan} lần) · tổng ${tong} lần định nghĩa cho ${defs.size} hàm (CREATE OR REPLACE FUNCTION trong supabase/migrations, từ ${cat.slice(0, 4)}-${cat.slice(4, 6)}-${cat.slice(6, 8)})`;
};

// Số liệu dùng chung cho `stats` và `report`: tóm tắt (dòng đầu) + đã sửa theo ngày (chỉ `stats` in).
function tinhStats(rows, homNay = new Date().toISOString().slice(0, 10)) {
  const cnt = (f) => rows.filter(f).length;
  const tom = [];
  tom.push(TT.map((t) => `${t} ${cnt((r) => r.trang_thai === t)}`).join(" · "));
  const closed = cnt((r) => ["DA_SUA", "LOI_GIA"].includes(r.trang_thai));
  tom.push(`Tỉ lệ lỗi giả: ${cnt((r) => r.trang_thai === "LOI_GIA")}/${closed} việc đã đóng`);
  tom.push(`Việc kế: xác minh ${cnt((r) => r.trang_thai === "MOI")} · sửa ${cnt((r) => r.trang_thai === "DA_XAC_MINH")} · chờ PO ${cnt((r) => r.trang_thai === "CHO_PO")}`);
  tom.push(`Kịch bản tay: ${TAY.map((t) => `${t} ${cnt((r) => r.test_tay === t)}`).join(" · ")}`);
  const fixed = rows.filter((x) => x.trang_thai === "DA_SUA" && x.commit);
  tom.push(`DA_SUA có test/migration trong commit: ${fixed.filter((x) => touchesTest(x.commit)).length}/${fixed.length}`);
  tom.push(tuoiTrungBinhMo(rows, homNay), migrationMoiLat(rows), hamDinhNghiaLai(homNay));
  const byDay = {};
  for (const r of fixed) {
    let d = "không rõ ngày";
    try { d = git(["show", "-s", "--format=%cs", r.commit]).trim() || d; } catch { /* sha không còn */ }
    (byDay[d] ||= []).push(r.id);
  }
  return { tom, ngay: Object.keys(byDay).sort().map((d) => `Đã sửa ${d}: ${byDay[d].length} (${byDay[d].join(", ")})`) };
}

// Mục tiến độ của 03: dòng đầu `status`, bảng module × mức, rồi đúng các dòng tóm tắt của `stats`.
function dungBaoCao(rows, homNay) {
  const { tom } = tinhStats(rows, homNay);
  const bang = [`| Module | ${MUC.join(" | ")} |`, `|---|${MUC.map(() => "---").join("|")}|`];
  for (const m of MODULES) bang.push(`| ${m} | ${MUC.map((u) => { const all = rows.filter((r) => r.module === m && r.muc === u && r.trang_thai !== "LOI_GIA"); return `${all.filter((r) => MO.has(r.trang_thai)).length}/${all.length}`; }).join(" | ")} |`);
  const dong1 = `Sổ lỗi: ${rows.length} dòng · mở ${rows.filter((r) => MO.has(r.trang_thai)).length} · đã sửa ${rows.filter((r) => r.trang_thai === "DA_SUA").length} · lỗi giả ${rows.filter((r) => r.trang_thai === "LOI_GIA").length} · hoãn ${rows.filter((r) => r.trang_thai === "HOAN").length}`;
  return [`${MOC_DAU}`, `Đo ngày ${homNay} bằng \`node scripts/readiness/so-loi.mjs report --ghi\`; sinh từ sổ, không sửa tay (kiểm: \`report --kiem\`). Mỗi ô là đang mở/tổng, không tính lỗi giả.`, "", dong1, "", ...bang, "", "```text", ...tom, "```", `${MOC_CUOI}`].join("\n");
}
const cat03 = () => { // [trước, khối, sau] hoặc null nếu 03 chưa có dấu mốc
  if (!existsSync(BAO_CAO)) return null;
  const t = readFileSync(BAO_CAO, "utf8");
  const a = t.indexOf(MOC_DAU), b = t.indexOf(MOC_CUOI);
  return a < 0 || b < a ? null : [t.slice(0, a), t.slice(a, b + MOC_CUOI.length), t.slice(b + MOC_CUOI.length)];
};
const boNgay = (khoi) => khoi.replace(/Đo ngày \d{4}-\d{2}-\d{2}/, "Đo ngày NGAY");

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
      const luong = Object.fromEntries(TRUONG_GHI.filter((k) => r[k] !== undefined && r[k] !== "").map((k) => [k, k === "ma_dac_ta" ? maDacTa(r[k]) : r[k]])); // trường cổng luồng chỉ ghi khi inbox có
      rows.push({ id: nextId(rows, r.module), module: r.module, lop: r.lop, muc: r.muc, tieu_de: r.tieu_de.trim(), bang_chung: r.bang_chung.trim(), lenh_kiem: r.lenh_kiem || "", trang_thai: r.trang_thai || "MOI", nguon: r.nguon || f.replace(/\.json$/, ""), commit: "", ghi_chu: r.ghi_chu || "", ...luong });
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
  // Cổng luồng: việc `tinh_nang` chưa đủ bước 1–4 thì không được làm (DANG_SUA) hay đóng (DA_SUA); việc `loi` đi tắt 1 → 5 → 6.
  if (["DANG_SUA", "DA_SUA"].includes(tt) && cuaTinhNang(r)) {
    const e = [...loiBuoc1(r), ...loiBuoc24(r)];
    if (e.length) die(`${id} (tinh_nang) chưa qua cổng luồng, không chuyển ${tt}:\n  - ${e.join("\n  - ")}\nĐiền bằng: so-loi.mjs ghi ${id} <truong> <giá trị>`);
  }
  // Tái hiện trước: không có lệnh kiểm thì chưa được coi là xác minh/sửa xong.
  if (["DA_XAC_MINH", "DA_SUA"].includes(tt) && !String(r.lenh_kiem || "").trim()) die(`${id}: lenh_kiem rỗng — ghi lệnh tái hiện/kiểm trước khi chuyển ${tt}`);
  if (tt === "DA_SUA" && !touchesTest(commit)) console.log(`CẢNH BÁO ${id}: commit ${commit} không chạm *.spec.ts hay supabase/migrations/ — chỉ kiểm tay?`);
  r.trang_thai = tt; if (commit) r.commit = commit;
  if (tt === "DA_SUA" && LOP_TAY.has(r.lop) && !r.test_tay) r.test_tay = "CHUA";
  save(rows); console.log(`${id} → ${tt}${commit ? " @" + commit : ""}`);
} else if (cmd === "ghi") {
  // Điền trường cổng luồng. phuong_an / phan_bien là JSON; ma_dac_ta là danh sách mã cách nhau bởi dấu phẩy/khoảng trắng.
  const [id, truong, ...giaTri] = args;
  const r = rows.find((x) => x.id === id) || die(`Không có ${id}`);
  if (!TRUONG_GHI.includes(truong)) die(`trường phải là ${TRUONG_GHI.join("|")}`);
  const tho = giaTri.join(" ").trim();
  if (!tho) die(`${truong}: thiếu giá trị`);
  let v = tho;
  if (truong === "phuong_an" || truong === "phan_bien") { try { v = JSON.parse(tho); } catch (e) { die(`${truong} phải là JSON hợp lệ (${e.message})`); } }
  if (truong === "ma_dac_ta") v = maDacTa(tho);
  const loi = VALIDATE_TRUONG[truong](v);
  if (loi) die(`${id}: ${loi}`);
  r[truong] = v;
  save(rows); console.log(`${id}.${truong} đã ghi`);
} else if (cmd === "tay") {
  const [id, kq, ...note] = args;
  const r = rows.find((x) => x.id === id) || die(`Không có ${id}`);
  if (!TAY.includes(kq)) die(`kết quả phải là ${TAY.join("|")}`);
  if (kq !== "CHUA" && !note.length) die("DAT/KHONG_DAT cần ghi chú: đã làm gì, thấy gì");
  r.test_tay = kq;
  if (note.length) r.ghi_chu = [r.ghi_chu, `Tay ${new Date().toISOString().slice(0, 10)} ${kq}: ${note.join(" ")}`].filter(Boolean).join(" | ");
  save(rows); console.log(`${id} test_tay → ${kq}`);
} else if (cmd === "next" && args[0] === "--tay") {
  const todo = rows.filter((r) => ["CHUA", "KHONG_DAT"].includes(r.test_tay));
  for (const r of todo.slice(0, Number(args[1]) || 100)) console.log(`${r.id}\t${r.test_tay}\t${r.muc}\t${r.tieu_de}`);
  console.log(`Kịch bản tay: còn ${todo.length} · đạt ${rows.filter((r) => r.test_tay === "DAT").length}`);
} else if (cmd === "next") {
  const n = Number(args[0]) || 10;
  // Một module tính năng một lúc: module có dòng tinh_nang đang DANG_SUA, không thì module sớm nhất (THU_TU_MODULE) còn tinh_nang mở. Lỗi (`loi`) không bị lọc.
  const tn = rows.filter((r) => cuaTinhNang(r) && MO.has(r.trang_thai));
  const dangLam = tn.find((r) => r.trang_thai === "DANG_SUA")?.module ?? THU_TU_MODULE.find((m) => tn.some((r) => r.module === m));
  const open = rows.filter((r) => ["DA_XAC_MINH", "MOI"].includes(r.trang_thai) && (loaiOf(r) === "loi" || r.module === dangLam))
    .sort((a, b) => MUC.indexOf(a.muc) - MUC.indexOf(b.muc) || (a.trang_thai === "DA_XAC_MINH" ? -1 : 1) || a.id.localeCompare(b.id));
  // Cột cuối = việc kế của dòng: MOI phải xác minh trước, DA_XAC_MINH mới được sửa; tinh_nang còn thiếu cổng thì ghi rõ thiếu gì.
  const thieuCong = (r) => (cuaTinhNang(r) ? [...loiBuoc1(r), ...loiBuoc24(r)].map((e) => e.split(/[ .[]/)[0]) : []);
  for (const r of open.slice(0, n)) { const t = thieuCong(r); console.log(`${r.id}\t${r.muc}\t${r.trang_thai}\t${r.lop}\t${r.tieu_de}\t${r.bang_chung}\t→ ${viecKe(r)}${loaiOf(r) === "tinh_nang" ? ` [tinh_nang${t.length ? ", thiếu " + t.join("/") : ""}]` : ""}`); }
  if (dangLam) console.log(`Tính năng: một module một lúc → ${dangLam}`);
  if (!open.length) console.log("Không còn việc MOI/DA_XAC_MINH.");
} else if (cmd === "stats") {
  // Số đo luồng: trạng thái, lỗi giả, tay, test/migration trong commit, 3 chỉ số luồng (tuổi việc mở · migration/lát · hàm định nghĩa lại), rồi số việc đã sửa theo ngày commit.
  const { tom, ngay } = tinhStats(rows);
  for (const l of [...tom, ...ngay]) console.log(l);
} else if (cmd === "report") {
  // `report` in khối; `--ghi` ghi vào giữa hai dấu mốc của 03 (nơi duy nhất); `--kiem` thoát ≠ 0 nếu khối trong 03 lệch sổ (bỏ qua dòng «Đo ngày»).
  const homNay = new Date().toISOString().slice(0, 10);
  const khoi = dungBaoCao(rows, homNay);
  const c = cat03();
  if (args[0] === "--ghi") {
    if (!c) die(`${BAO_CAO} chưa có hai dấu mốc ${MOC_DAU} … ${MOC_CUOI}`);
    writeFileSync(BAO_CAO, c[0] + khoi + c[2]);
    console.log(`report: đã ghi ${khoi.split("\n").length} dòng vào ${BAO_CAO}`);
  } else if (args[0] === "--kiem") {
    if (!c) die(`${BAO_CAO} chưa có hai dấu mốc ${MOC_DAU} … ${MOC_CUOI}`);
    if (boNgay(c[1]) !== boNgay(khoi)) die("report --kiem: khối trong 03 lệch sổ — chạy `so-loi.mjs report --ghi`");
    console.log("report --kiem: 03 khớp sổ");
  } else if (args[0]) die("report [--ghi|--kiem]");
  else console.log(khoi);
} else if (cmd === "check") {
  // Cổng: module chưa đạt nếu còn NGHIEM_TRONG/CAO đang mở.
  let fail = 0;
  for (const m of MODULES) {
    const blk = rows.filter((r) => r.module === m && MO.has(r.trang_thai) && ["NGHIEM_TRONG", "CAO"].includes(r.muc));
    console.log(`${m.padEnd(9)} ${blk.length ? "CHƯA ĐẠT (" + blk.map((r) => r.id).join(", ") + ")" : "không còn lỗi chặn"}`);
    fail += blk.length;
  }
  // Cổng luồng: `tinh_nang` thiếu bước 1 (nguoi_dung, ma_dac_ta) là lỗi mọi lúc; thiếu bước 2–4 là lỗi khi đã DANG_SUA/DA_SUA. `loai` ngoài enum là lỗi. Việc `loi` không bị đòi gì thêm.
  for (const r of rows) {
    const e = [];
    if (r.loai && !LOAI.includes(r.loai)) e.push(`loai «${r.loai}» không hợp lệ`);
    if (cuaTinhNang(r)) e.push(...loiBuoc1(r), ...(["DANG_SUA", "DA_SUA"].includes(r.trang_thai) ? loiBuoc24(r) : []));
    if (e.length) { console.log(`Cổng luồng ${r.id} (${loaiOf(r)}, ${r.trang_thai}): ${e.join("; ")}`); fail++; }
  }
  console.log(`Việc tinh_nang: ${rows.filter((r) => loaiOf(r) === "tinh_nang").length} · việc loi (đường tắt): ${rows.filter((r) => loaiOf(r) === "loi").length}`);
  const kd = rows.filter((r) => r.test_tay === "KHONG_DAT");
  if (kd.length) { console.log(`Kịch bản tay KHÔNG ĐẠT: ${kd.map((r) => r.id).join(", ")}`); fail += kd.length; }
  console.log(`Kịch bản tay chưa chạy: ${rows.filter((r) => r.test_tay === "CHUA").length} (xem next --tay)`);
  // HANDOFF chỉ trỏ đường; tiến độ nằm trong sổ. Quá 6000 byte là đang chép tiến độ.
  const handoff = join(DIR, "..", "..", "HANDOFF_APPKSNK.md");
  if (existsSync(handoff) && statSync(handoff).size > 6000) { console.log(`HANDOFF_APPKSNK.md ${statSync(handoff).size} byte > 6000: dời tiến độ vào ghi_chu của sổ`); fail++; }
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
} else die("Lệnh: status | next [n] | next --tay [n] | stats | report [--ghi|--kiem] | merge | set <ID> <TRANG_THAI> [commit] | ghi <ID> <truong> <giá trị> | tay <ID> <DAT|KHONG_DAT|CHUA> [ghi chú] | check");
