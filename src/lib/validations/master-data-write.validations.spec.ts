import { describe, expect, it } from "vitest";
import {
  masterSoftDeleteManySchema,
  masterToggleSchema,
  masterUpsertSchema,
  parseOrFirstError,
} from "./master-data-write.validations";
import { allocateProceduralSetSchema, rbacMatrixSchema } from "./danh-muc-write.validations";
import {
  deleteMultipleTieuChisSchema,
  importTieuChisSchema,
  saveBangKiemSchema,
  saveTieuChiSchema,
} from "./bang-kiem-write.validations";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("master-data-write.validations", () => {
  it("upsert: tạo mới (id rỗng) và sửa (UUID) đều hợp lệ", () => {
    expect(parseOrFirstError(masterUpsertSchema, { tableName: "mdm_dm_khoa_phong", id: "", payload: { ten_khoa: "A" } }).ok).toBe(true);
    expect(parseOrFirstError(masterUpsertSchema, { tableName: "mdm_dm_khoa_phong", id: UUID, payload: { ten_khoa: "A" } }).ok).toBe(true);
  });

  it("upsert: từ chối id không phải UUID, payload rỗng, chuỗi quá dài", () => {
    const bad = (input: unknown) => parseOrFirstError(masterUpsertSchema, input);
    expect(bad({ tableName: "t", id: "abc", payload: { a: 1 } })).toMatchObject({ ok: false, error: "Mã bản ghi không hợp lệ." });
    expect(bad({ tableName: "t", id: "", payload: {} })).toMatchObject({ ok: false, error: "Chưa có dữ liệu để lưu." });
    expect(bad({ tableName: "t", id: "", payload: { ghi_chu: "x".repeat(4001) } }).ok).toBe(false);
    expect(bad({ tableName: "", id: "", payload: { a: 1 } }).ok).toBe(false);
    expect(bad({ tableName: "t", id: "", payload: "không phải object" }).ok).toBe(false);
  });

  it("toggle / xóa nhiều: kiểm kiểu và giới hạn lô", () => {
    expect(parseOrFirstError(masterToggleSchema, { tableName: "t", id: UUID, currentStatus: true }).ok).toBe(true);
    expect(parseOrFirstError(masterToggleSchema, { tableName: "t", id: UUID, currentStatus: "true" }).ok).toBe(false);
    expect(parseOrFirstError(masterSoftDeleteManySchema, { tableName: "t", ids: [] }).ok).toBe(false);
    expect(parseOrFirstError(masterSoftDeleteManySchema, { tableName: "t", ids: Array(201).fill(UUID) }).ok).toBe(false);
    expect(parseOrFirstError(masterSoftDeleteManySchema, { tableName: "t", ids: [UUID, "x"] }).ok).toBe(false);
    expect(parseOrFirstError(masterSoftDeleteManySchema, { tableName: "t", ids: [UUID] }).ok).toBe(true);
  });
});

describe("bang-kiem-write.validations", () => {
  it("bảng kiểm: mã và tên bắt buộc", () => {
    expect(parseOrFirstError(saveBangKiemSchema, { id: "", ma_bk: "", ten_bang_kiem: "Tên bảng" })).toMatchObject({ ok: false, error: "Nhập mã bảng kiểm." });
    expect(parseOrFirstError(saveBangKiemSchema, { id: "", ma_bk: "BK1", ten_bang_kiem: "" })).toMatchObject({ ok: false, error: "Nhập tên bảng kiểm." });
    expect(parseOrFirstError(saveBangKiemSchema, { id: UUID, ma_bk: "BK1", ten_bang_kiem: "Bảng kiểm VST", mo_ta: null }).ok).toBe(true);
  });

  it("tiêu chí: cần bảng kiểm cha hợp lệ và nội dung", () => {
    expect(parseOrFirstError(saveTieuChiSchema, { bangKiemId: "", noi_dung: "x" }).ok).toBe(false);
    expect(parseOrFirstError(saveTieuChiSchema, { bangKiemId: UUID, noi_dung: "" })).toMatchObject({ ok: false, error: "Nhập nội dung tiêu chí." });
    expect(parseOrFirstError(saveTieuChiSchema, { bangKiemId: UUID, noi_dung: "Rửa tay đủ 6 bước" }).ok).toBe(true);
  });

  it("nhập / xóa hàng loạt tiêu chí có trần", () => {
    expect(parseOrFirstError(importTieuChisSchema, { bangKiemId: UUID, newCriteria: Array(1001).fill({}) }).ok).toBe(false);
    expect(parseOrFirstError(importTieuChisSchema, { bangKiemId: UUID, newCriteria: [{ noi_dung: "a" }] }).ok).toBe(true);
    expect(parseOrFirstError(deleteMultipleTieuChisSchema, { ids: Array(501).fill("x") }).ok).toBe(false);
    expect(parseOrFirstError(deleteMultipleTieuChisSchema, { ids: ["tc-1", "tc-2"] }).ok).toBe(true);
  });
});

describe("danh-muc-write.validations", () => {
  const UUID2 = "22222222-2222-4222-8222-222222222222";

  it("ma trận RBAC: khóa và giá trị phải là UUID, không rỗng", () => {
    expect(parseOrFirstError(rbacMatrixSchema, { [UUID]: [UUID2] }).ok).toBe(true);
    expect(parseOrFirstError(rbacMatrixSchema, {}).ok).toBe(false);
    expect(parseOrFirstError(rbacMatrixSchema, { ADMIN: [UUID2] }).ok).toBe(false);
    expect(parseOrFirstError(rbacMatrixSchema, { [UUID]: ["x"] }).ok).toBe(false);
    expect(parseOrFirstError(rbacMatrixSchema, { [UUID]: Array(2001).fill(UUID2) }).ok).toBe(false);
  });

  it("phân bổ bộ dụng cụ: số lượng là số nguyên 0..100000", () => {
    const ok = { boDungCuId: UUID, khoaPhongId: UUID2, quantity: 3 };
    expect(parseOrFirstError(allocateProceduralSetSchema, ok).ok).toBe(true);
    expect(parseOrFirstError(allocateProceduralSetSchema, { ...ok, quantity: -1 }).ok).toBe(false);
    expect(parseOrFirstError(allocateProceduralSetSchema, { ...ok, quantity: 1.5 }).ok).toBe(false);
    expect(parseOrFirstError(allocateProceduralSetSchema, { ...ok, quantity: Number.NaN }).ok).toBe(false);
    expect(parseOrFirstError(allocateProceduralSetSchema, { ...ok, khoaPhongId: "" }).ok).toBe(false);
  });
});
