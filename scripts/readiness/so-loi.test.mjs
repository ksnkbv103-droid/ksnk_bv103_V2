// Kiểm cổng luồng và `report` của so-loi.mjs trên sổ giả (không đụng so-loi.json thật).
// Chạy: node --test scripts/readiness/so-loi.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "so-loi.mjs");
const dong = (id, extra) => ({ id, module: "NKBV", lop: "BACKEND", muc: "THAP", tieu_de: `việc ${id}`, bang_chung: "thử", lenh_kiem: "echo ok", trang_thai: "DA_XAC_MINH", nguon: "thu", commit: "", ghi_chu: "", ...extra });
const DU_BUOC_1 = { nguoi_dung: "Điều dưỡng KSNK", ma_dac_ta: ["R1.01"] };
const PHUONG_AN = [{ ten: "A", lam_sai: "nếu cỡ mẫu < 50" }, { ten: "B", lam_sai: "nếu khoa không có kế hoạch" }];
const PHAN_BIEN = { phan_doi: [{ y: "thiếu ca biên", bang_chung: "spec T1.02", tra_loi: "đã thêm ca biên" }] };

function dung(rows) {
  const d = mkdtempSync(join(tmpdir(), "so-loi-"));
  const env = { ...process.env, SO_LOI_FILE: join(d, "so-loi.json"), SO_LOI_BAO_CAO: join(d, "03.md") };
  writeFileSync(env.SO_LOI_FILE, JSON.stringify(rows, null, 2));
  writeFileSync(env.SO_LOI_BAO_CAO, "# 03\n\n<!-- so-loi:report:begin -->\n<!-- so-loi:report:end -->\n\nsau\n");
  const chay = (...a) => { const r = spawnSync(process.execPath, [SCRIPT, ...a], { env, encoding: "utf8" }); return { code: r.status, out: r.stdout, err: r.stderr }; };
  const doc = () => JSON.parse(readFileSync(env.SO_LOI_FILE, "utf8"));
  return { chay, doc, env };
}

test("check: tinh_nang thiếu bước 1 → thoát ≠ 0, nêu đúng ID và trường thiếu", () => {
  const s = dung([dong("NKBV-901", { loai: "tinh_nang", trang_thai: "MOI" })]);
  const r = s.chay("check");
  assert.notEqual(r.code, 0);
  assert.match(r.out, /Cổng luồng NKBV-901/);
  assert.match(r.out, /nguoi_dung/);
  assert.match(r.out, /ma_dac_ta/);
});

test("check: dòng `loi` (không có trường loai) không bị đòi trường luồng", () => {
  const s = dung([dong("NKBV-902", { trang_thai: "MOI" })]);
  const r = s.chay("check");
  assert.doesNotMatch(r.out, /Cổng luồng/);
});

test("set DANG_SUA: tinh_nang thiếu phan_bien → thoát ≠ 0 và sổ không đổi", () => {
  const s = dung([dong("NKBV-903", { loai: "tinh_nang", ...DU_BUOC_1, phuong_an: PHUONG_AN, duyet: "2026-11-19" })]);
  const r = s.chay("set", "NKBV-903", "DANG_SUA");
  assert.notEqual(r.code, 0);
  assert.match(r.err, /phan_bien/);
  assert.equal(s.doc()[0].trang_thai, "DA_XAC_MINH");
});

test("set DANG_SUA: tinh_nang thiếu phuong_an / lam_sai → chặn", () => {
  const s = dung([dong("NKBV-904", { loai: "tinh_nang", ...DU_BUOC_1, phuong_an: [{ ten: "A", lam_sai: "" }, { ten: "B", lam_sai: "x" }], phan_bien: PHAN_BIEN, duyet: "2026-11-19" })]);
  const r = s.chay("set", "NKBV-904", "DANG_SUA");
  assert.notEqual(r.code, 0);
  assert.match(r.err, /phuong_an\[0\]/);
});

test("ghi rồi set: đủ bước 1–4 thì DANG_SUA đi qua; khong_phan_doi phải kèm số đo", () => {
  const s = dung([dong("NKBV-905", { loai: "tinh_nang", ...DU_BUOC_1, phuong_an: PHUONG_AN, duyet: "2026-11-19" })]);
  assert.notEqual(s.chay("ghi", "NKBV-905", "phan_bien", JSON.stringify({ khong_phan_doi: "không thấy lỗi" })).code, 0); // thiếu số đo
  assert.equal(s.chay("ghi", "NKBV-905", "phan_bien", JSON.stringify({ khong_phan_doi: "đối chiếu 12/12 ca biên" })).code, 0);
  const r = s.chay("set", "NKBV-905", "DANG_SUA");
  assert.equal(r.code, 0, r.err);
  assert.equal(s.doc()[0].trang_thai, "DANG_SUA");
});

test("set DANG_SUA: việc `loi` đi tắt, không bị chặn", () => {
  const s = dung([dong("NKBV-906")]);
  assert.equal(s.chay("set", "NKBV-906", "DANG_SUA").code, 0);
});

test("ghi: ma_dac_ta sai dạng và duyet sai ngày bị từ chối", () => {
  const s = dung([dong("NKBV-907", { loai: "tinh_nang" })]);
  assert.notEqual(s.chay("ghi", "NKBV-907", "ma_dac_ta", "abc").code, 0);
  assert.notEqual(s.chay("ghi", "NKBV-907", "duyet", "19/11/2026").code, 0);
});

test("next: tinh_nang chỉ của một module một lúc, việc loi không bị lọc", () => {
  const s = dung([
    dong("NKBV-910", { loai: "tinh_nang", ...DU_BUOC_1 }),
    dong("CSSD-910", { module: "CSSD", loai: "tinh_nang", ...DU_BUOC_1 }),
    dong("QLCV-910", { module: "QLCV" }),
  ]);
  const r = s.chay("next", "20");
  assert.match(r.out, /CSSD-910/); // CSSD đứng trước NKBV trong thứ tự module
  assert.doesNotMatch(r.out, /NKBV-910/);
  assert.match(r.out, /QLCV-910/);
});

test("report --ghi rồi --kiem: khối trong 03 khớp `stats`; sổ đổi thì --kiem thoát ≠ 0", () => {
  const s = dung([dong("NKBV-920", { trang_thai: "MOI" }), dong("CSSD-920", { module: "CSSD", trang_thai: "DA_SUA", commit: "" })]);
  assert.equal(s.chay("report", "--ghi").code, 0);
  assert.equal(s.chay("report", "--kiem").code, 0);
  const khoi = readFileSync(s.env.SO_LOI_BAO_CAO, "utf8").match(/```text\n([\s\S]*?)\n```/)[1].split("\n");
  const stats = s.chay("stats").out.split("\n").filter(Boolean);
  assert.deepEqual(khoi, stats.slice(0, khoi.length), "các dòng tóm tắt trong 03 phải đúng bằng đầu ra của `stats`");
  assert.ok(khoi.some((l) => l.startsWith("Tuổi TB việc mở")) && khoi.some((l) => l.startsWith("Migration mỗi lát")) && khoi.some((l) => l.startsWith("Hàm định nghĩa lại 30 ngày")), "đủ 3 chỉ số luồng");
  assert.match(readFileSync(s.env.SO_LOI_BAO_CAO, "utf8"), /^# 03[\s\S]*sau\n$/); // phần ngoài dấu mốc không bị đụng
  assert.equal(s.chay("set", "NKBV-920", "LOI_GIA").code, 0);
  assert.notEqual(s.chay("report", "--kiem").code, 0);
});
