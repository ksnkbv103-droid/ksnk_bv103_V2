import { describe, expect, it } from "vitest";
import {
  applyMoveSideChoice,
  applyReconcileDoorInference,
  applySetReconcileLineInference,
  buildKhoBoMoveLines,
  buildReplenishReconcileLines,
  buildTransferReconcileLines,
  clampTransferQtyInput,
  clampSignedKhoMove,
  buildCanKhoPrefill,
  fillLechVsChuanDelta,
  formatLechVsChuan,
  isCanKhoEligibleLine,
  isMoveOnlyKind,
  isPhysicalKind,
  lechVsChuan,
  INSTRUMENT_MOVE_TYPE_ID,
  INSTRUMENT_PHYSICAL_DOOR_ID,
  resolveInstrumentMoveSubmitTypeId,
  isSetReconcileDraftExpired,
  isReconcileCatalogMatched,
  lookupLoaiByMa,
  SET_RECONCILE_MOVE_ONLY_MESSAGE,
  SET_RECONCILE_TYPE_ID,
  validateInstrumentDoorLines,
  lookupLoaiByMaKhac,
  lookupLoaiForKhacField,
  uniqueKhacCatalog,
  buildKhacPickerOptions,
  needsBomApproval,
  physicalQuantity,
  rejectMoveOnlyKindsOnReconcile,
  summarizeSetReconcile,
  validateSetReconcileLines,
  type SetReconcileLineInput,
} from "./cssd-set-reconcile";

const base = (over: Partial<SetReconcileLineInput>): SetReconcileLineInput => ({
  chiTietId: "11111111-1111-1111-1111-111111111111",
  loaiDungCuId: "22222222-2222-2222-2222-222222222222",
  tenDungCuLe: "Kẹp",
  soLuongChuan: 12,
  soLuongThucTe: 12,
  soLuongDem: 12,
  kind: "KHOP",
  ...over,
});

describe("cssd-set-reconcile", () => {
  it("accepts all-matching lines", () => {
    expect(validateSetReconcileLines([base({})])).toBeNull();
    expect(needsBomApproval([base({})])).toBe(false);
  });

  it("blocks lowering count without Hỏng/Mất", () => {
    expect(validateSetReconcileLines([base({ soLuongDem: 10, kind: "KHOP" })])).toMatch(/Hỏng hoặc Mất/);
    expect(validateSetReconcileLines([base({ soLuongDem: 10, kind: "DOI_CHUAN", soLuongChuanDeXuat: 10 })])).toMatch(
      /Hỏng hoặc Mất/,
    );
  });

  it("computes physical qty for mixed lines", () => {
    const lines = [
      base({ soLuongDem: 10, kind: "MAT" }),
      base({ tenDungCuLe: "Kéo", soLuongThucTe: 3, soLuongDem: 2, kind: "HONG" }),
      base({ tenDungCuLe: "Khay", soLuongChuanDeXuat: 10, kind: "DOI_CHUAN" }),
    ];
    expect(validateSetReconcileLines(lines)).toBeNull();
    expect(physicalQuantity(lines[0])).toBe(2);
    expect(physicalQuantity(lines[1])).toBe(1);
    expect(needsBomApproval(lines)).toBe(true);
    expect(summarizeSetReconcile(lines)).toMatchObject({ mat: 2, hong: 1, doiChuan: 1 });
  });

  it("requires a new catalog code or a different type for DOI_LOAI", () => {
    expect(validateSetReconcileLines([base({ kind: "DOI_LOAI" })])).toMatch(/mã gốc|tên mới/);
    expect(validateSetReconcileLines([base({ kind: "DOI_LOAI", maLoai: "DC-KEP", maLoaiDeXuat: "DC-KEP" })])).toMatch(
      /tên mới|mã gốc/,
    );
    expect(
      validateSetReconcileLines([base({ kind: "DOI_LOAI", maLoai: "DC-KEP", tenDungCuLeDeXuat: "Kẹp mới" })]),
    ).toBeNull();
    const rename = base({ kind: "DOI_LOAI", maLoai: "DC-KEP", maLoaiDeXuat: "DC-KEO", tenDungCuLeDeXuat: "Kéo" });
    expect(validateSetReconcileLines([rename])).toBeNull();
    expect(needsBomApproval([rename])).toBe(true);
    const relink = base({
      kind: "DOI_LOAI",
      maLoai: "DC-KEP",
      maLoaiDeXuat: "DC-KEO",
      loaiDungCuIdDeXuat: "33333333-3333-3333-3333-333333333333",
    });
    expect(validateSetReconcileLines([relink])).toBeNull();
  });

  it("expires draft after TTL", () => {
    expect(isSetReconcileDraftExpired(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())).toBe(true);
    expect(isSetReconcileDraftExpired(new Date().toISOString())).toBe(false);
  });

  it("infers sai mã / bổ sung / điều chuyển from edits", () => {
    expect(applySetReconcileLineInference(base({ maLoai: "DC-KEP", maLoaiDeXuat: "DC-KEO" })).kind).toBe("DOI_LOAI");
    expect(applySetReconcileLineInference(base({ soLuongDem: 14 })).kind).toBe("BO_SUNG");
    expect(applySetReconcileLineInference(base({ soLuongDem: 10 })).kind).toBe("KHOP");
    expect(applySetReconcileLineInference(base({ soLuongDem: 10, kind: "HONG" })).kind).toBe("HONG");
    expect(applySetReconcileLineInference(base({ soLuongDem: 10, maQrDen: "B01.SET.02" })).kind).toBe("DIEU_CHUYEN");
    expect(isReconcileCatalogMatched(base({ maLoai: "FO170R", loaiDungCuId: "x" }), [], [])).toBe(true);
    expect(isReconcileCatalogMatched(base({ maLoai: "FO170R", loaiDungCuId: "" }), [{ ma: "FO170R" }], [])).toBe(true);
    expect(isReconcileCatalogMatched(base({ maLoai: "FO170R", loaiDungCuId: "" }), [], [])).toBe(false);
    expect(lookupLoaiByMa("KEO-01", [{ ma: "KEO-01" }, { ma: "KEO-02" }])?.ma).toBe("KEO-01");
    expect(lookupLoaiByMa("KEO", [{ ma: "KEO-01" }])?.ma).toBe("KEO-01");
    expect(lookupLoaiByMa("KEO", [{ ma: "KEO-01" }, { ma: "KEO-02" }])).toBeUndefined();
    expect(lookupLoaiByMaKhac("BV-12", [{ maKhac: "BV-12", ma: "KEO-01" }])?.ma).toBe("KEO-01");
    expect(lookupLoaiByMaKhac("BV", [{ maKhac: "BV-12", ma: "KEO-01" }])?.ma).toBe("KEO-01");
    expect(
      lookupLoaiForKhacField(
        "KEO-01",
        [{ ma: "KEO-01", ten: "Kéo" }],
        [{ maKhac: "BV-12", ma: "KEO-01", ten: "Kéo" }],
      )?.ten,
    ).toBe("Kéo");
    expect(
      lookupLoaiForKhacField(
        "BV-12",
        [{ ma: "KEO-01", ten: "Kéo" }],
        [{ maKhac: "BV-12", ma: "KEO-01", ten: "Kéo" }],
      )?.ten,
    ).toBe("Kéo");
    const picker = buildKhacPickerOptions(
      [
        { maKhac: "BV-12", ma: "KEO-01", ten: "Kéo" },
        { maKhac: "BV-12", ma: "KEO-01", ten: "Kéo" },
      ],
      [
        { ma: "KEO-01", ten: "Kéo" },
        { ma: "KEP-02", ten: "Kẹp" },
      ],
    );
    expect(uniqueKhacCatalog([{ maKhac: "BV-12" }, { maKhac: "bv-12" }, { maKhac: "BV-99" }])).toHaveLength(2);
    expect(picker.map((x) => x.id)).toEqual(["BV-12", "KEO-01", "KEP-02"]);
    expect(picker[0].groupLabel).toBe("Mã khắc đã có");
    expect(picker[1].groupLabel).toBe("Danh mục loại dụng cụ");
  });

  it("accepts điều chuyển when count drops and dest set is present", () => {
    const line = base({ soLuongDem: 10, kind: "DIEU_CHUYEN", maQrDen: "B01.SET.02" });
    expect(validateSetReconcileLines([line])).toBeNull();
    expect(physicalQuantity(line)).toBe(2);
    expect(summarizeSetReconcile([line]).dieuChuyen).toBe(2);
  });

  it("builds transfer lines that jump qty source → dest", () => {
    const lines = buildTransferReconcileLines(
      [
        { chiTietId: base({}).chiTietId, loaiDungCuId: base({}).loaiDungCuId, maLoai: "DC-KEP", tenDungCuLe: "Kẹp", soLuongChuan: 12, soLuongThucTe: 12 },
        { chiTietId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", loaiDungCuId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", maLoai: "DC-KEO", tenDungCuLe: "Kéo", soLuongChuan: 2, soLuongThucTe: 2 },
      ],
      [{ chiTietId: String(base({}).chiTietId), qty: 3 }],
      "B01.SET.02",
    );
    expect(lines[0]).toMatchObject({ kind: "DIEU_CHUYEN", soLuongDem: 9, maQrDen: "B01.SET.02" });
    expect(lines[1]).toMatchObject({ kind: "KHOP", soLuongDem: 2 });
    expect(validateInstrumentDoorLines("INSTRUMENT_TRANSFER", lines)).toBeNull();
    expect(validateInstrumentDoorLines("INSTRUMENT_TRANSFER", [base({})])).toMatch(/bộ đích/);
  });

  it("builds replenish lines from kho onto dest set", () => {
    const lines = buildReplenishReconcileLines(
      [{ chiTietId: base({}).chiTietId, loaiDungCuId: base({}).loaiDungCuId, tenDungCuLe: "Kẹp", soLuongChuan: 12, soLuongThucTe: 10 }],
      [
        { loaiDungCuId: String(base({}).loaiDungCuId), tenDungCuLe: "Kẹp", qty: 2 },
        { loaiDungCuId: "cccccccc-cccc-cccc-cccc-cccccccccccc", maLoai: "DC-MOI", tenDungCuLe: "Mới", qty: 1 },
      ],
    );
    expect(lines[0]).toMatchObject({ kind: "BO_SUNG", soLuongDem: 12 });
    expect(lines[1]).toMatchObject({ kind: "BO_SUNG", soLuongThucTe: 0, soLuongDem: 1, tenDungCuLe: "Mới" });
    expect(validateInstrumentDoorLines("INSTRUMENT_REPLENISH", lines)).toBeNull();
    expect(validateInstrumentDoorLines("INSTRUMENT_REPLENISH", [base({})])).toMatch(/kho vào bộ|về kho/);
  });

  it("builds signed kho ↔ bộ lines", () => {
    const lines = buildKhoBoMoveLines(
      [{ chiTietId: base({}).chiTietId, loaiDungCuId: base({}).loaiDungCuId, tenDungCuLe: "Kẹp", soLuongChuan: 12, soLuongThucTe: 10 }],
      [{ loaiDungCuId: String(base({}).loaiDungCuId), tenDungCuLe: "Kẹp", qty: -3 }],
    );
    expect(lines[0]).toMatchObject({ kind: "TRA_KHO", soLuongDem: 7 });
    expect(validateInstrumentDoorLines("INSTRUMENT_REPLENISH", lines)).toBeNull();
  });

  it("clamps transfer qty to available stock", () => {
    expect(clampTransferQtyInput("12", 3)).toBe("3");
    expect(clampTransferQtyInput("0", 5)).toBe("0");
    expect(clampTransferQtyInput("", 4)).toBe("");
    expect(clampTransferQtyInput("2", 0)).toBe("0");
    const overReturn = buildKhoBoMoveLines(
      [{ chiTietId: base({}).chiTietId, loaiDungCuId: base({}).loaiDungCuId, tenDungCuLe: "Kẹp", soLuongChuan: 12, soLuongThucTe: 10 }],
      [{ loaiDungCuId: String(base({}).loaiDungCuId), tenDungCuLe: "Kẹp", qty: -99 }],
    );
    expect(overReturn[0]).toMatchObject({ kind: "TRA_KHO", soLuongDem: 0 });
  });

  it("unifies move door: kho forces the other side to bộ", () => {
    expect(applyMoveSideChoice("bo", "bo", "left", "kho")).toEqual({ left: "kho", right: "bo" });
    expect(applyMoveSideChoice("kho", "bo", "left", "bo")).toEqual({ left: "bo", right: "bo" });
    expect(applyMoveSideChoice("bo", "bo", "right", "kho")).toEqual({ left: "bo", right: "kho" });
    const transfer = buildTransferReconcileLines(
      [{ chiTietId: base({}).chiTietId, loaiDungCuId: base({}).loaiDungCuId, tenDungCuLe: "Kẹp", soLuongChuan: 12, soLuongThucTe: 12 }],
      [{ chiTietId: String(base({}).chiTietId), qty: 2 }],
      "B01.SET.02",
    );
    expect(resolveInstrumentMoveSubmitTypeId(transfer)).toBe("INSTRUMENT_TRANSFER");
    expect(validateInstrumentDoorLines(INSTRUMENT_MOVE_TYPE_ID, transfer)).toBeNull();
    expect(validateInstrumentDoorLines(INSTRUMENT_MOVE_TYPE_ID, [base({})])).toMatch(/kho hoặc bộ/);
  });

  it("keeps rà soát off kho / điều chuyển", () => {
    expect(isPhysicalKind("HONG")).toBe(true);
    expect(isPhysicalKind("BO_SUNG")).toBe(false);
    expect(isMoveOnlyKind("TRA_KHO")).toBe(true);
    expect(isMoveOnlyKind("HONG")).toBe(false);
    expect(validateInstrumentDoorLines(SET_RECONCILE_TYPE_ID, [base({ soLuongDem: 14 })])).toBe(
      SET_RECONCILE_MOVE_ONLY_MESSAGE,
    );
    expect(
      validateInstrumentDoorLines(SET_RECONCILE_TYPE_ID, [
        base({ kind: "DIEU_CHUYEN", soLuongDem: 10, maQrDen: "B01.SET.02" }),
      ]),
    ).toBe(SET_RECONCILE_MOVE_ONLY_MESSAGE);
    expect(validateInstrumentDoorLines(SET_RECONCILE_TYPE_ID, [base({ kind: "BO_SUNG", soLuongDem: 14 })])).toBe(
      SET_RECONCILE_MOVE_ONLY_MESSAGE,
    );
    expect(validateInstrumentDoorLines(SET_RECONCILE_TYPE_ID, [base({ kind: "TRA_KHO", soLuongDem: 10 })])).toBe(
      SET_RECONCILE_MOVE_ONLY_MESSAGE,
    );
    expect(
      validateInstrumentDoorLines(INSTRUMENT_PHYSICAL_DOOR_ID, [
        base({ kind: "BO_SUNG", soLuongDem: 14 }),
      ]),
    ).toBe(SET_RECONCILE_MOVE_ONLY_MESSAGE);
    expect(
      validateInstrumentDoorLines("INSTRUMENT_BROKEN", [
        base({ kind: "DIEU_CHUYEN", soLuongDem: 10, maQrDen: "B01.SET.02" }),
      ]),
    ).toBe(SET_RECONCILE_MOVE_ONLY_MESSAGE);
    expect(rejectMoveOnlyKindsOnReconcile([base({ kind: "HONG", soLuongDem: 10 })])).toBeNull();
    expect(applyReconcileDoorInference(base({ soLuongDem: 14 })).kind).toBe("KHOP");
    expect(applyReconcileDoorInference(base({ soLuongDem: 10, maQrDen: "B01.SET.02" })).kind).toBe("KHOP");
    expect(applyReconcileDoorInference(base({ soLuongChuanDeXuat: 14 })).kind).toBe("DOI_CHUAN");
    expect(applyReconcileDoorInference(base({ maLoai: "DC-KEP", maLoaiDeXuat: "DC-KEO" })).kind).toBe("DOI_LOAI");
    expect(applyReconcileDoorInference(base({ tenDungCuLeDeXuat: "Kẹp mới" })).kind).toBe("DOI_LOAI");
    expect(applyReconcileDoorInference(base({ soLuongDem: 10, kind: "HONG" })).kind).toBe("HONG");
  });

  it("computes lệch vs chuẩn and prefills cân kho for selected lines", () => {
    const thieu = base({ soLuongChuan: 12, soLuongThucTe: 10, soLuongDem: 10 });
    const thua = base({
      chiTietId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      loaiDungCuId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      tenDungCuLe: "Kéo",
      soLuongChuan: 5,
      soLuongThucTe: 7,
      soLuongDem: 7,
    });
    const kho = [
      { id: String(thieu.loaiDungCuId), soLuongKho: 8 },
      { id: String(thua.loaiDungCuId), soLuongKho: 0 },
    ];
    expect(lechVsChuan(thieu)).toBe(2);
    expect(formatLechVsChuan(2)).toBe("Thiếu 2");
    expect(formatLechVsChuan(-2)).toBe("Thừa 2");
    expect(buildCanKhoPrefill({ maBo: "B01.SET.01", direction: "LAY_KHO", lines: [thieu], selectedKeys: [], khoStock: kho }).error).toMatch(
      /Chọn dụng cụ/,
    );
    const lay = buildCanKhoPrefill({
      maBo: "B01.SET.01",
      direction: "LAY_KHO",
      lines: [thieu, thua],
      selectedKeys: [String(thieu.chiTietId)],
      khoStock: kho,
    });
    expect(lay.prefill?.moves).toEqual([
      { loaiDungCuId: String(thieu.loaiDungCuId), maLoai: undefined, tenDungCuLe: "Kẹp", qty: 2 },
    ]);
    const tra = buildCanKhoPrefill({
      maBo: "B01.SET.01",
      direction: "TRA_KHO",
      lines: [thieu, thua],
      selectedKeys: [String(thua.chiTietId)],
      khoStock: kho,
    });
    expect(tra.prefill?.moves[0]).toMatchObject({ qty: -2, tenDungCuLe: "Kéo" });
    expect(
      buildCanKhoPrefill({
        maBo: "B01.SET.01",
        direction: "LAY_KHO",
        lines: [thieu],
        selectedKeys: [String(thieu.chiTietId)],
        khoStock: [{ id: String(thieu.loaiDungCuId), soLuongKho: 0 }],
      }).error,
    ).toMatch(/tồn kho/);
    expect(isCanKhoEligibleLine(base({ soLuongChuan: 12, soLuongThucTe: 10, kind: "HONG", soLuongDem: 8 }))).toBe(false);
    expect(fillLechVsChuanDelta([thieu, thua], kho)).toEqual({
      [String(thieu.loaiDungCuId)]: 2,
      [String(thua.loaiDungCuId)]: -2,
    });
    expect(clampSignedKhoMove(9, String(thieu.loaiDungCuId), 10, kho)).toBe(8);
    expect(clampSignedKhoMove(-99, String(thua.loaiDungCuId), 7, kho)).toBe(-7);
  });
});
