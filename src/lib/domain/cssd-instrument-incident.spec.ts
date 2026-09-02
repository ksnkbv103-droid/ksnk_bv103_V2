import { describe, expect, it } from "vitest";
import {
  doorKindFromIncidentType,
  doiLoaiIsCatalogRename,
  formatLechVsChuan,
  lechVsChuan,
  mapInstrumentPresetToLedgerType,
  shouldDetachChiTietFromSet,
  suggestedLayKhoQty,
  suggestedTraKhoQty,
  validateInstrumentDoorLines,
  validateIssueQuantityAgainstThucTe,
  validateLayKhoQty,
  validateTraKhoQty,
} from "./cssd-instrument-incident";

describe("cssd-instrument-incident", () => {
  it("maps preset codes to ledger types", () => {
    expect(mapInstrumentPresetToLedgerType("INSTRUMENT_BROKEN")).toBe("BAO_HONG");
    expect(mapInstrumentPresetToLedgerType("INSTRUMENT_TRANSFER")).toBe("DIEU_CHUYEN");
    expect(mapInstrumentPresetToLedgerType("INSTRUMENT_RETURN")).toBe("NHAP_KHO");
    expect(mapInstrumentPresetToLedgerType("PROCESS_QC_FAIL")).toBeNull();
  });

  it("computes lệch vs chuẩn and clamps lấy/trả kho", () => {
    expect(lechVsChuan(12, 10)).toBe(2);
    expect(formatLechVsChuan(2)).toBe("Thiếu 2");
    expect(formatLechVsChuan(-2)).toBe("Thừa 2");
    expect(formatLechVsChuan(0)).toBe("Khớp chuẩn");
    expect(suggestedLayKhoQty(12, 10, 8)).toBe(2);
    expect(suggestedLayKhoQty(12, 10, 1)).toBe(1);
    expect(suggestedTraKhoQty(5, 7)).toBe(2);
    expect(validateLayKhoQty(2, 12, 10, 8)).toBeNull();
    expect(validateLayKhoQty(2, 12, 12, 8)).toMatch(/không thiếu/);
    expect(validateLayKhoQty(2, 12, 10, 0)).toMatch(/Kho dự phòng/);
    expect(validateTraKhoQty(2, 5, 7)).toBeNull();
    expect(validateTraKhoQty(1, 5, 5)).toMatch(/không thừa/);
  });

  it("detaches only when quantity covers entire chi tiết row", () => {
    expect(shouldDetachChiTietFromSet(1, 3)).toBe(false);
    expect(shouldDetachChiTietFromSet(3, 3)).toBe(true);
  });

  it("rejects quantity above thực tế", () => {
    expect(validateIssueQuantityAgainstThucTe(2, 1)).toMatch(/không được vượt/);
    expect(validateIssueQuantityAgainstThucTe(1, 2)).toBeNull();
  });

  it("blocks BOM mutations and catalog rename on the operational door", () => {
    expect(doorKindFromIncidentType("INSTRUMENT_REPLENISH")).toBe("LAY_KHO");
    expect(doorKindFromIncidentType("INSTRUMENT_RETURN")).toBe("TRA_KHO");
    expect(validateInstrumentDoorLines([{ kind: "THEM_DONG", hasBomLine: true }])).toMatch(/định mức/);
    expect(validateInstrumentDoorLines([{ kind: "XOA_DONG", hasBomLine: true }])).toMatch(/định mức/);
    expect(validateInstrumentDoorLines([{ kind: "DOI_CHUAN", hasBomLine: true }])).toMatch(/định mức/);
    expect(doiLoaiIsCatalogRename({ newMaLoai: "DC-NEW" })).toBe(true);
    expect(
      validateInstrumentDoorLines([
        {
          kind: "DOI_LOAI",
          hasBomLine: true,
          doiLoai: { currentLoaiDungCuId: "a", newMaLoai: "DC-NEW", catalogExists: true },
        },
      ]),
    ).toMatch(/mã gốc/);
    expect(
      validateInstrumentDoorLines([
        {
          kind: "DOI_LOAI",
          hasBomLine: true,
          doiLoai: { currentLoaiDungCuId: "a", targetLoaiDungCuId: "b", catalogExists: true },
        },
      ]),
    ).toBeNull();
    expect(
      validateInstrumentDoorLines([
        {
          kind: "DOI_LOAI",
          hasBomLine: true,
          doiLoai: { currentLoaiDungCuId: "a", targetLoaiDungCuId: "b", catalogExists: false },
        },
      ]),
    ).toMatch(/đã có trong danh mục/);
    expect(validateInstrumentDoorLines([{ kind: "LAY_KHO", hasBomLine: false }])).toMatch(/dòng chuẩn/);
    expect(validateInstrumentDoorLines([{ kind: "LAY_KHO", hasBomLine: true }])).toBeNull();
  });
});
