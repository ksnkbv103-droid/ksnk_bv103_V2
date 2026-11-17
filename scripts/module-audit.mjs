// Rà vòng đời 10 bước: bằng chứng cơ học cho một module (không phán đoán, không sửa file).
// Dùng: node scripts/module-audit.mjs [module]   (không tham số = tóm tắt 5 module)
// Phần «hợp nhu cầu hay chưa» do /ra-soat (AI) chấm; script chỉ nói có/thiếu bằng chứng.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const MODULES = {
  "giam-sat": { src: ["giam-sat-vst", "giam-sat-chung", "giam-sat-hub"], mig: /vst|gsc|giam_sat|bang_kiem/i, road: /gi[aá]m s[aá]t|VST|GSC/i },
  cssd: { src: ["cssd-erp", "cssd-su-co"], mig: /cssd/i, road: /CSSD/ },
  nkbv: { src: ["giam-sat-nkbv"], mig: /nkbv|hai_/i, road: /NKBV/ },
  qlcv: { src: ["quan-ly-cong-viec"], mig: /qlcv|cong_viec/i, road: /QLCV/ },
  "dao-tao": { src: ["dao-tao"], mig: /dao_tao|exam|thi_/i, road: /Đào tạo|ĐT-|DT-/ },
};
const STEPS = ["Vấn đề", "Giải pháp", "Phạm vi MVP", "Yêu cầu/DoD", "Thiết kế", "Xây lát", "Kiểm chứng", "Chạy thử", "Phát hành/vận hành", "Đo & lặp"];

const walk = (d, acc = []) => {
  if (!existsSync(d)) return acc;
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    statSync(p).isDirectory() ? walk(p, acc) : acc.push(p);
  }
  return acc;
};
const count = (t, re) => (t.match(re) || []).length;
const sect = (t, n) => t.split(/^## /m).slice(1).find((s) => s.startsWith(`${n}.`)) ?? "";

function audit(m) {
  const cfg = MODULES[m];
  const page = `docs/modules/${m}/van-de-nguoi-dung.md`;
  const t = existsSync(page) ? readFileSync(page, "utf8") : "";
  const docs = walk(`docs/modules/${m}`).filter((f) => f !== page && f.endsWith(".md"));
  const srcFiles = cfg.src.flatMap((s) => walk(`src/modules/${s}`));
  const actions = srcFiles.filter((f) => /\.actions?\.ts$/.test(f) || /actions\/.+\.ts$/.test(f)).length;
  const specs = srcFiles.filter((f) => /\.spec\.tsx?$/.test(f)).length;
  const migs = walk("supabase/migrations").filter((f) => cfg.mig.test(f)).length;
  const road = existsSync("docs/core/handover-roadmap.md") ? readFileSync("docs/core/handover-roadmap.md", "utf8") : "";
  const roadLines = road.split("\n").filter((l) => /^\|/.test(l) && cfg.road.test(l)).length;
  const lead = t.match(/^Đầu mối:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const open = (n) => count(sect(t, n), /\[CẦN XÁC NHẬN\]/g);
  const s5 = sect(t, 5);
  const body = t.replace(/^>.*$/gm, ""); // bỏ dòng chú thích nhãn
  const real = /người dùng thật|người của tổ|chạy trên prod/i.test(body) && !/chưa phải người dùng thật/i.test(body);
  const rows = [
    [1, t ? (open(1) + open(3) ? `?` : "Có") : "Thiếu", `trang ${t ? "có" : "KHÔNG"}; đầu mối: ${lead || "—"}; mở mục 1,3: ${open(1) + open(3)}`],
    [2, t && sect(t, 4) ? (open(2) ? "?" : "Có") : "Thiếu", `mục 2,4 có; mở mục 2: ${open(2)}`],
    [3, roadLines ? "Có" : "Thiếu", `${roadLines} dòng bảng roadmap nhắc module`],
    [4, count(t, /\[SSOT\]/g) + docs.length ? "Có" : "Thiếu", `${count(t, /\[SSOT\]/g)} nhãn [SSOT]; ${docs.length} file docs/modules/${m}`],
    [5, srcFiles.length ? "?" : "Thiếu", `${srcFiles.length} file src (${cfg.src.join(",")}) — cần AI so với domain`],
    [6, actions || migs ? "Có" : "Thiếu", `${actions} action; ${migs} migration khớp tên`],
    [7, specs ? "Có" : "Thiếu", `${specs} spec`],
    [8, /K\d|kịch bản/i.test(sect(t, 6)) ? (real ? "Có" : "?") : "Thiếu", real ? "đã ghi người dùng thật" : "chưa thấy người dùng thật chạy thử"],
    [9, /phát hành|vận hành|deploy|prod/i.test(t) ? "?" : "Thiếu", "trang chưa nói rõ cách vận hành/hỗ trợ" + (/phát hành|vận hành/i.test(t) ? " (có nhắc)" : "")],
    [10, /\d/.test(s5) ? (/đã đo|đo được:|kết quả đo/i.test(t) ? "Có" : "?") : "Thiếu", "có ngưỡng ở mục 5; số đo thực tế " + (/đã đo|kết quả đo/i.test(t) ? "có" : "chưa")],
  ];
  return { m, rows, gaps: rows.filter((r) => r[1] === "Thiếu").map((r) => r[0]), unknown: rows.filter((r) => r[1] === "?").map((r) => r[0]) };
}

const arg = process.argv[2];
if (arg && !MODULES[arg]) {
  console.error(`module? ${Object.keys(MODULES).join(" | ")}`);
  process.exit(2);
}
for (const m of arg ? [arg] : Object.keys(MODULES)) {
  const r = audit(m);
  if (arg) {
    console.log(`# ${m} — bằng chứng cơ học 10 bước`);
    for (const [n, s, e] of r.rows) console.log(`${String(n).padStart(2)}. ${STEPS[n - 1].padEnd(19)} ${s.padEnd(5)} ${e}`);
    console.log(`Thiếu: ${r.gaps.join(",") || "—"} · Cần AI/PO chấm: ${r.unknown.join(",") || "—"}`);
  } else {
    console.log(`${m.padEnd(9)} thiếu: ${r.gaps.join(",") || "—"} · cần chấm: ${r.unknown.join(",") || "—"}`);
  }
}
