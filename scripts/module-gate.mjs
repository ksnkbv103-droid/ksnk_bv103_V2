// Cổng module: đọc docs/modules/<m>/van-de-nguoi-dung.md, in trạng thái + việc được phép.
// Dùng: node scripts/module-gate.mjs [module]   (không tham số = bảng 5 module)
// Exit 1 khi module có tham số vi phạm: thiếu trang, thiếu trạng thái, trạng thái XÂY mà chưa có đầu mối
// hoặc còn [CẦN XÁC NHẬN] ở mục 1, 2, 5.
import { existsSync, readFileSync } from "node:fs";

const MODULES = ["giam-sat", "cssd", "nkbv", "qlcv", "dao-tao"];
const STATES = ["KHÁM_PHÁ", "XÁC_NHẬN", "XÂY", "CHẠY_THỬ", "ỔN_ĐỊNH", "ĐÓNG_BĂNG"];
const ALLOWED = {
  KHÁM_PHÁ: "chỉ thu thập (phỏng vấn, kịch bản tay); không mở lát tính năng",
  XÁC_NHẬN: "chỉ thu thập + chốt ngưỡng mục 5; không mở lát tính năng",
  XÂY: "chỉ lát đã duyệt ở roadmap §5; spec đóng băng",
  CHẠY_THỬ: "chỉ sửa lỗi người dùng báo / lộ dữ liệu",
  ỔN_ĐỊNH: "lát L2 (RLS, nguyên tử, prod)",
  ĐÓNG_BĂNG: "không làm gì",
};
const NEED_EVIDENCE = ["1", "2", "5"]; // mục phải hết [CẦN XÁC NHẬN] khi vào XÂY

function check(m) {
  const file = `docs/modules/${m}/van-de-nguoi-dung.md`;
  if (!existsSync(file)) return { m, errors: [`thiếu ${file}`], state: "—", lead: "—", open: "—", allowed: "—" };
  const text = readFileSync(file, "utf8");
  const state = text.match(/^Trạng thái:\s*(\S+)/m)?.[1];
  const lead = text.match(/^Đầu mối:\s*(.+)$/m)?.[1]?.trim();
  const errors = [];
  if (!STATES.includes(state)) errors.push(`dòng «Trạng thái:» thiếu/sai (${STATES.join("|")})`);
  if (!lead) errors.push("thiếu dòng «Đầu mối:»");
  const open = (text.match(/\[CẦN XÁC NHẬN\]/g) || []).length;
  const sections = text.split(/^## /m).slice(1);
  const openAt = (n) => (sections.find((s) => s.startsWith(`${n}.`))?.match(/\[CẦN XÁC NHẬN\]/g) || []).length;
  if (state === "XÂY") {
    if (/CHƯA CÓ/i.test(lead || "")) errors.push(`trạng thái ${state} cần đầu mối có tên`);
    for (const n of NEED_EVIDENCE) if (openAt(n)) errors.push(`mục ${n} còn ${openAt(n)} [CẦN XÁC NHẬN]`);
  }
  return { m, state: state ?? "?", lead: lead ?? "?", open, allowed: ALLOWED[state] ?? "?", errors };
}

const arg = process.argv[2];
const list = arg ? [arg] : MODULES;
if (arg && !MODULES.includes(arg)) {
  console.error(`module? ${MODULES.join(" | ")}`);
  process.exit(2);
}
let bad = 0;
for (const m of list) {
  const r = check(m);
  console.log(`${r.m.padEnd(9)} ${String(r.state).padEnd(10)} đầu mối: ${r.lead} · mở: ${r.open} · được phép: ${r.allowed}`);
  for (const e of r.errors) console.log(`  ! ${e}`);
  if (arg && r.errors.length) bad = 1;
}
process.exit(bad);
