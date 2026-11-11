import { describe, expect, it } from "vitest";
import {
  examFormThongTinSchema,
  kyThiInputSchema,
  importMcqMatrixSchema,
  parseDaoTaoInput,
  setCauHoiActiveSchema,
  setKyThiGanSchema,
  updateCauHoiDaoTaoSchema,
  saveTraLoiInputSchema,
  traLoiSchema,
  updateMucDoThiThuSchema,
} from "./schemas";

const ID = "3f1c2b4a-9d8e-4f7a-8b6c-1a2b3c4d5e6f";

describe("traLoiSchema", () => {
  it("nhận đủ 4 loại câu trả lời hợp lệ", () => {
    expect(traLoiSchema.safeParse({ kind: "single", optionId: "a" }).success).toBe(true);
    expect(traLoiSchema.safeParse({ kind: "single", optionId: null }).success).toBe(true);
    expect(traLoiSchema.safeParse({ kind: "multi", optionIds: ["a", "b"] }).success).toBe(true);
    expect(
      traLoiSchema.safeParse({ kind: "true_false_cluster", byOptionId: { a: true, b: null } }).success,
    ).toBe(true);
    expect(traLoiSchema.safeParse({ kind: "order", orderedOptionIds: ["b", "a"] }).success).toBe(true);
  });

  it("từ chối thiếu byOptionId, loại lạ, mảng quá dài, id quá dài", () => {
    expect(traLoiSchema.safeParse({ kind: "true_false_cluster" }).success).toBe(false);
    expect(traLoiSchema.safeParse({ kind: "essay", text: "x" }).success).toBe(false);
    expect(
      traLoiSchema.safeParse({ kind: "multi", optionIds: Array.from({ length: 21 }, (_, i) => `o${i}`) })
        .success,
    ).toBe(false);
    expect(traLoiSchema.safeParse({ kind: "single", optionId: "x".repeat(65) }).success).toBe(false);
    const big = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`o${i}`, true]));
    expect(traLoiSchema.safeParse({ kind: "true_false_cluster", byOptionId: big }).success).toBe(false);
  });

  it("saveTraLoiInput: lanThiId/cauId phải là uuid, lỗi tiếng Việt", () => {
    expect(
      saveTraLoiInputSchema.safeParse({ lanThiId: ID, cauId: ID, traLoi: { kind: "single", optionId: "a" } })
        .success,
    ).toBe(true);
    expect(() =>
      parseDaoTaoInput(saveTraLoiInputSchema, {
        lanThiId: "abc",
        cauId: ID,
        traLoi: { kind: "single", optionId: "a" },
      }),
    ).toThrow("Mã định danh không hợp lệ.");
  });
});

describe("examFormThongTinSchema", () => {
  it("bắt buộc họ tên/khoa, cắt khoảng trắng, bỏ khóa lạ", () => {
    const r = parseDaoTaoInput(examFormThongTinSchema, {
      hoTen: "  Nguyễn Văn A ",
      khoaDonVi: "KSNK",
      email: "",
      la: "x".repeat(10_000),
    });
    expect(r).toEqual({ hoTen: "Nguyễn Văn A", khoaDonVi: "KSNK", email: "" });
    expect(() => parseDaoTaoInput(examFormThongTinSchema, { hoTen: " ", khoaDonVi: "K" })).toThrow(
      "Vui lòng nhập họ tên.",
    );
    expect(() =>
      parseDaoTaoInput(examFormThongTinSchema, { hoTen: "x".repeat(121), khoaDonVi: "K" }),
    ).toThrow("Họ tên tối đa 120 ký tự.");
  });
});

describe("schema quản trị", () => {
  it("kyThiInput: giới hạn số câu, điểm đạt, hạn chứng chỉ", () => {
    const ok = { ten: "Kỳ 1", so_cau: 30, thoi_gian_phut: 45, diem_dat_pct: 80 };
    expect(kyThiInputSchema.safeParse(ok).success).toBe(true);
    expect(kyThiInputSchema.safeParse({ ...ok, so_cau: 0 }).success).toBe(false);
    expect(kyThiInputSchema.safeParse({ ...ok, diem_dat_pct: 150 }).success).toBe(false);
    expect(kyThiInputSchema.safeParse({ ...ok, han_chung_chi_thang: 61 }).success).toBe(false);
    expect(kyThiInputSchema.safeParse({ ...ok, ten: "" }).success).toBe(false);
  });

  it("updateMucDoThiThu: id uuid, số nguyên dương", () => {
    expect(updateMucDoThiThuSchema.safeParse({ id: ID, so_cau: 20, thoi_gian_phut: 30 }).success).toBe(true);
    expect(updateMucDoThiThuSchema.safeParse({ id: "x", so_cau: 20, thoi_gian_phut: 30 }).success).toBe(false);
    expect(updateMucDoThiThuSchema.safeParse({ id: ID, so_cau: 2.5, thoi_gian_phut: 30 }).success).toBe(false);
  });
});

describe("DT-003: schema action quản trị", () => {
  it("setKyThiGan: id phải là uuid, hạn 1..60 tháng", () => {
    expect(setKyThiGanSchema.safeParse({ kyThiId: ID, khoaPhongIds: [ID], hanChungChiThang: 12 }).success).toBe(true);
    expect(() => parseDaoTaoInput(setKyThiGanSchema, { kyThiId: "x" })).toThrow("Mã định danh không hợp lệ.");
    expect(() => parseDaoTaoInput(setKyThiGanSchema, { kyThiId: ID, nhanSuIds: ["x"] })).toThrow(
      "Mã định danh không hợp lệ.",
    );
    expect(() => parseDaoTaoInput(setKyThiGanSchema, { kyThiId: ID, hanChungChiThang: 99 })).toThrow(
      "Hạn chứng chỉ từ 1 đến 60 tháng.",
    );
  });

  it("setCauHoiActive: isActive phải là boolean", () => {
    expect(setCauHoiActiveSchema.safeParse({ cauHoiId: ID, isActive: false }).success).toBe(true);
    expect(() => parseDaoTaoInput(setCauHoiActiveSchema, { cauHoiId: ID, isActive: "true" })).toThrow(
      "Trạng thái kích hoạt không hợp lệ.",
    );
  });

  it("updateCauHoiDaoTao: bloom 1..5, loai enum, stem không rỗng", () => {
    const ok = { id: ID, stem: "Q", bloomLevel: 2, optionA: "a", optionB: "b", dapAnRaw: "A", loai: "single" };
    expect(updateCauHoiDaoTaoSchema.safeParse(ok).success).toBe(true);
    expect(() => parseDaoTaoInput(updateCauHoiDaoTaoSchema, { ...ok, bloomLevel: 9 })).toThrow("Mức Bloom từ 1 đến 5.");
    expect(() => parseDaoTaoInput(updateCauHoiDaoTaoSchema, { ...ok, loai: "x" })).toThrow("Loại câu hỏi không hợp lệ.");
    expect(() => parseDaoTaoInput(updateCauHoiDaoTaoSchema, { ...ok, stem: " " })).toThrow(
      "Vui lòng nhập nội dung câu hỏi.",
    );
  });

  it("importMcqMatrix: rows phải là mảng 2 chiều, giới hạn dòng", () => {
    expect(importMcqMatrixSchema.safeParse({ rows: [["a", 1]], dryRun: true }).success).toBe(true);
    expect(() => parseDaoTaoInput(importMcqMatrixSchema, { rows: "x" })).toThrow("Dữ liệu import không hợp lệ.");
    expect(() => parseDaoTaoInput(importMcqMatrixSchema, { rows: Array.from({ length: 20001 }, () => []) })).toThrow(
      "Import tối đa 20000 dòng.",
    );
  });
});
