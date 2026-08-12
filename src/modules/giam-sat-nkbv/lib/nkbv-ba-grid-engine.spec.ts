import { describe, expect, it } from "vitest";
import {
  attributeWithinRit,
  buildGridColumns,
  clinicalCatalogForNghiNgo,
  computeBaGridSession,
  hospitalDayNumber,
  imagingCatalogForNghiNgo,
  splitMilestonesToGridRows,
  ssiDiagnosticCatalog,
  suggestNghiNgoFromIndex,
} from "./nkbv-ba-grid-engine";
import { calculateCdcMetrics } from "./nkbv-timeline-math";
import type { BaTimelineMilestone } from "./nkbv-ba-timeline-core";

describe("calculateCdcMetrics DOE/Index (PNEU grid)", () => {
  it("date-only symptom in IWP sets NSK earlier than imaging Index", () => {
    const m = calculateCdcMetrics({
      ngay_phat_hien: "2026-07-19",
      ngay_vao_vien: "2026-07-17",
      checklistType: "HAP",
      activeForm: { pneu_trigger: "IMAGING" },
      symptomDates: {
        has_chest_imaging_abnormal: "2026-07-19",
        has_rales_or_wheeze: "2026-07-17",
        fever_or_wbc_abnormal: "2026-07-17",
      },
      treatmentHistory: [],
      indexDateOverride: "2026-07-19",
    });
    expect(m.index_date).toBe("2026-07-19");
    expect(m.doe).toBe("2026-07-17");
    expect(m.rit_end).toBe("2026-07-30");
  });

  it("CULTURE trigger does not auto-shift Index to earlier imaging", () => {
    const m = calculateCdcMetrics({
      ngay_phat_hien: "2026-07-26",
      ngay_vao_vien: "2026-07-17",
      checklistType: "HAP",
      activeForm: { pneu_trigger: "CULTURE" },
      symptomDates: {
        has_chest_imaging_abnormal: "2026-07-19",
        has_purulent_sputum_symptom: "2026-07-24",
      },
      treatmentHistory: [],
    });
    expect(m.index_date).toBe("2026-07-26");
  });
});

describe("nkbv-ba-grid-engine shift timeline", () => {
  it("bảng chung bắt đầu VV−2", () => {
    const cols = buildGridColumns({
      ngayVaoVien: "2026-08-10",
      ngayRaVien: "2026-08-12",
      evidenceDates: [],
    });
    expect(cols[0]?.date).toBe("2026-08-08");
    expect(cols.some((c) => c.date === "2026-08-12")).toBe(true);
  });

  it("split: device_foley/vent/cvc → deviceByDate, không vào LS", () => {
    const milestones: BaTimelineMilestone[] = [
      {
        id: "f1",
        date: "2026-08-01",
        kind: "SYMPTOM",
        title: "Foley",
        source: "MANUAL",
        criteriaKey: "device_foley",
        detail: null,
        majorType: "UTI",
        gate: null,
      },
      {
        id: "v1",
        date: "2026-08-02",
        kind: "SYMPTOM",
        title: "Vent",
        source: "MANUAL",
        criteriaKey: "device_ventilator",
        detail: null,
        majorType: "PNEU",
        gate: null,
      },
      {
        id: "c1",
        date: "2026-08-03",
        kind: "SYMPTOM",
        title: "CVC",
        source: "MANUAL",
        criteriaKey: "device_central_line",
        detail: null,
        majorType: "BSI",
        gate: null,
      },
    ];
    const split = splitMilestonesToGridRows(milestones);
    expect(split.deviceByDate.foley["2026-08-01"]?.[0]?.key).toBe("device_foley");
    expect(split.deviceByDate.vent["2026-08-02"]?.[0]?.key).toBe("device_ventilator");
    expect(split.deviceByDate.cvc["2026-08-03"]?.[0]?.key).toBe("device_central_line");
    expect(split.trieuChungLamSangByDate["2026-08-01"]).toBeUndefined();
    expect(
      clinicalCatalogForNghiNgo("UTI").some((c) => c.criteriaKey === "device_foley"),
    ).toBe(false);
  });

  it("dedupe CĐHA theo ngày|criteria_key (không theo id)", () => {
    const milestones: BaTimelineMilestone[] = [
      {
        id: "xq-old",
        date: "2026-08-01",
        kind: "IMAGING_CHEST",
        title: "XQ phổi cũ",
        source: "MANUAL",
        criteriaKey: "imaging_chest",
        detail: null,
        majorType: "PNEU",
        gate: null,
      },
      {
        id: "xq-new",
        date: "2026-08-01",
        kind: "IMAGING_CHEST",
        title: "XQ phổi mới",
        source: "MANUAL",
        criteriaKey: "imaging_chest",
        detail: null,
        majorType: "PNEU",
        gate: null,
      },
    ];
    const split = splitMilestonesToGridRows(milestones);
    expect(split.cdha).toHaveLength(1);
    expect(split.cdha[0]?.id).toBe("xq-new");
  });

  it("suggest Nghi ngờ from XN / CĐHA / TIEU_CHUAN", () => {
    expect(suggestNghiNgoFromIndex({ kind: "CDHA" })).toBe("PNEU");
    expect(suggestNghiNgoFromIndex({ kind: "XN", benh_pham: "Máu" })).toBe("BSI");
    expect(suggestNghiNgoFromIndex({ kind: "TIEU_CHUAN", criteriaKey: "rales" })).toBe("PNEU");
  });

  it("catalog: lâm sàng không chứa imaging; CĐHA chỉ hình ảnh TC", () => {
    const clin = clinicalCatalogForNghiNgo("PNEU");
    const img = imagingCatalogForNghiNgo("PNEU");
    expect(clin.every((c) => c.milestoneKind === "SYMPTOM")).toBe(true);
    expect(img.some((c) => c.criteriaKey === "imaging_chest")).toBe(true);
    expect(clin.some((c) => c.criteriaKey === "imaging_chest")).toBe(false);
  });

  it("TC chẩn đoán = catalog SSI; không lẫn vào lâm sàng PNEU", () => {
    const ssi = ssiDiagnosticCatalog();
    expect(ssi.some((c) => c.criteriaKey === "purulent_drainage")).toBe(true);
    expect(ssi.some((c) => c.criteriaKey === "procedure_surgery")).toBe(true);
    expect(clinicalCatalogForNghiNgo("PNEU").some((c) => c.criteriaKey === "purulent_drainage")).toBe(
      false,
    );
  });

  it("split: SSI criteria → hàng TC chẩn đoán; LS criteria → lâm sàng", () => {
    const milestones: BaTimelineMilestone[] = [
      {
        id: "m1",
        date: "2026-07-20",
        kind: "SYMPTOM",
        title: "Vết mổ chảy mủ",
        source: "MANUAL",
        criteriaKey: "purulent_drainage",
        detail: null,
        majorType: "SSI",
        gate: null,
      },
      {
        id: "m2",
        date: "2026-07-18",
        kind: "SYMPTOM",
        title: "Ran phổi",
        source: "MANUAL",
        criteriaKey: "rales",
        detail: null,
        majorType: "PNEU",
        gate: null,
      },
      {
        id: "m3",
        date: "2026-07-15",
        kind: "PROCEDURE_SURGERY",
        title: "Ngày phẫu thuật",
        source: "MANUAL",
        criteriaKey: "procedure_surgery",
        detail: null,
        majorType: "SSI",
        gate: null,
      },
      {
        id: "m4",
        date: "2026-07-19",
        kind: "NOTE",
        title: "Ghi chú BA",
        source: "MANUAL",
        detail: null,
        majorType: "OTHER",
        gate: null,
      },
    ];
    const split = splitMilestonesToGridRows(milestones);
    expect(split.tieuChuanChuyenBietByDate["2026-07-20"]?.[0]?.key).toBe("purulent_drainage");
    expect(split.trieuChungLamSangByDate["2026-07-18"]?.[0]?.key).toBe("rales");
    expect(split.surgeryByDate["2026-07-15"]?.[0]?.key).toBe("procedure_surgery");
    expect(split.notesByDate["2026-07-19"]).toBe("Ghi chú BA");
    expect(split.noteIdsByDate["2026-07-19"]).toBe("m4");
    expect(split.tieuChuanChuyenBietByDate["2026-07-15"]).toBeUndefined();
  });

  it("chưa đủ TC → vẫn tô RIT/SBAP (ứng viên), chưa attributed", () => {
    const session = computeBaGridSession({
      ngayVaoVien: "2026-07-17",
      xn: [],
      cdha: [
        {
          id: "xq-1",
          ngay: "2026-07-19",
          loai: "XQ",
          mo_ta_benh_ly: "XQ viêm phổi",
          tieu_chuan_key: "imaging_chest",
        },
      ],
      activeIndex: { kind: "CDHA", id: "xq-1", date: "2026-07-19" },
      nghiNgo: "PNEU",
      symptomDates: {},
      tieuChuanByDate: {},
      khoaByDate: {},
      canThiepDates: [],
    });
    expect(session.nsk).toBe("2026-07-19");
    expect(session.iwpDates.size).toBeGreaterThan(0);
    expect(session.ritDates.has("2026-07-19")).toBe(true);
    expect(session.ritDates.has("2026-08-01")).toBe(true);
    expect(session.sbapDates.size).toBeGreaterThan(0);
    expect(session.attributedXnIds).toEqual([]);
  });

  it("đủ TC (criteriaMetPreview) → tô RIT/SBAP", () => {
    const session = computeBaGridSession({
      ngayVaoVien: "2026-07-17",
      xn: [],
      cdha: [
        {
          id: "xq-1",
          ngay: "2026-07-19",
          loai: "XQ",
          mo_ta_benh_ly: "XQ viêm phổi",
          tieu_chuan_key: "imaging_chest",
        },
      ],
      activeIndex: { kind: "CDHA", id: "xq-1", date: "2026-07-19" },
      nghiNgo: "PNEU",
      symptomDates: {},
      tieuChuanByDate: {},
      khoaByDate: {},
      canThiepDates: [],
      criteriaMetPreview: true,
    });
    expect(session.ritDates.has("2026-07-19")).toBe(true);
    expect(session.ritDates.has("2026-08-01")).toBe(true);
    expect(session.sbapDates.size).toBeGreaterThan(0);
  });

  it("cột ngày session: neo VV−2 → ra viện (đồng bộ bảng chung)", () => {
    const session = computeBaGridSession({
      ngayVaoVien: "2026-07-17",
      ngayRaVien: "2026-07-20",
      xn: [],
      cdha: [
        {
          id: "xq-1",
          ngay: "2026-07-19",
          loai: "XQ",
          mo_ta_benh_ly: "XQ viêm phổi",
          tieu_chuan_key: "imaging_chest",
        },
      ],
      activeIndex: { kind: "CDHA", id: "xq-1", date: "2026-07-19" },
      nghiNgo: "PNEU",
      symptomDates: {},
      tieuChuanByDate: {},
      khoaByDate: {},
      canThiepDates: [],
    });
    expect(session.columns[0]?.date).toBe("2026-07-15"); // VV−2
    expect(session.columns[session.columns.length - 1]?.date).toBe("2026-07-20");
    expect(session.columns).toHaveLength(6);
  });

  it("bảng chung không Index: khung VV−2 → ra viện (không đuôi +3)", () => {
    const cols = buildGridColumns({
      ngayVaoVien: "2026-07-25",
      ngayRaVien: "2026-08-01",
      evidenceDates: ["2026-07-28"],
    });
    expect(cols[0]?.date).toBe("2026-07-23"); // VV−2
    expect(cols[cols.length - 1]?.date).toBe("2026-08-01"); // đúng ngày ra viện
    expect(cols[0]?.hd).toBeNull();
  });

  it("bảng chung đang nằm viện: kéo đến hôm nay", () => {
    const today = new Date().toISOString().slice(0, 10);
    const cols = buildGridColumns({
      ngayVaoVien: "2026-07-25",
      ngayRaVien: null,
      evidenceDates: ["2026-07-28"],
    });
    expect(cols[0]?.date).toBe("2026-07-23");
    expect(cols[cols.length - 1]?.date >= "2026-07-28").toBe(true);
    // BA demo trong quá khứ: end = max(evidence, today) — hôm nay luôn nằm trong khung
    expect(cols.some((c) => c.date === today) || cols[cols.length - 1].date === today).toBe(
      true,
    );
  });

  it("bằng chứng muộn hơn ra viện vẫn kéo khung tới bằng chứng", () => {
    const cols = buildGridColumns({
      ngayVaoVien: "2026-07-25",
      ngayRaVien: "2026-07-30",
      evidenceDates: ["2026-08-03"],
    });
    expect(cols[cols.length - 1]?.date).toBe("2026-08-03");
  });

  it("HD: VV = HD1; trước VV = null (không âm)", () => {
    expect(hospitalDayNumber("2026-07-17", "2026-07-17")).toBe(1);
    expect(hospitalDayNumber("2026-07-17", "2026-07-19")).toBe(3);
    expect(hospitalDayNumber("2026-07-17", "2026-07-12")).toBeNull();
    const cols = buildGridColumns({
      ngayVaoVien: "2026-07-17",
      evidenceDates: [],
      indexAnchor: { date: "2026-07-19", beforeDays: 7, afterDays: 14 },
    });
    const pre = cols.find((c) => c.date === "2026-07-12");
    const vv = cols.find((c) => c.date === "2026-07-17");
    expect(pre?.hd).toBeNull();
    expect(vv?.hd).toBe(1);
  });

  it("Index = triệu chứng chẩn đoán → Ngày X + IWP", () => {
    const session = computeBaGridSession({
      ngayVaoVien: "2026-07-17",
      xn: [],
      cdha: [],
      activeIndex: { kind: "TIEU_CHUAN", id: "tc-fever", date: "2026-07-18" },
      nghiNgo: "PNEU",
      symptomDates: {},
      tieuChuanByDate: {
        "2026-07-18": [{ key: "fever_or_wbc", label: "Sốt / WBC", id: "tc-fever" }],
      },
      khoaByDate: {},
      canThiepDates: [],
    });
    expect(session.indexDate).toBe("2026-07-18");
    expect(session.iwpDates.has("2026-07-15")).toBe(true);
    expect(session.iwpDates.has("2026-07-21")).toBe(true);
    expect(session.nsk).toBe("2026-07-18");
  });

  it("dịch chuyển Index CĐHA → XN: IWP/NSK đổi hết", () => {
    const base = {
      ngayVaoVien: "2026-07-17",
      xn: [
        {
          id: "xn-dorm",
          ngay: "2026-07-26",
          benh_pham: "Đờm",
          vi_khuan: "A. baumannii",
          source: "LIS" as const,
        },
      ],
      cdha: [
        {
          id: "xq-1",
          ngay: "2026-07-19",
          loai: "XQ",
          mo_ta_benh_ly: "XQ viêm phổi",
          tieu_chuan_key: "imaging_chest" as const,
        },
      ],
      nghiNgo: "PNEU" as const,
      symptomDates: {},
      tieuChuanByDate: {
        "2026-07-17": [{ key: "rales", label: "Rale", id: "tc-1" }],
      },
      khoaByDate: { "2026-07-17": "B11" },
      canThiepDates: ["2026-07-17", "2026-07-18", "2026-07-19"],
    };

    const a = computeBaGridSession({
      ...base,
      activeIndex: { kind: "CDHA", id: "xq-1", date: "2026-07-19" },
    });
    expect(a.indexDate).toBe("2026-07-19");
    expect(a.nsk).toBe("2026-07-17");

    const b = computeBaGridSession({
      ...base,
      activeIndex: { kind: "XN", id: "xn-dorm", date: "2026-07-26" },
    });
    expect(b.indexDate).toBe("2026-07-26");
    expect(b.iwpDates.has("2026-07-19")).toBe(false);
    expect(b.iwpDates.has("2026-07-26")).toBe(true);
    // NSK trong IWP mới — không giữ 17/7 ngoài cửa sổ
    expect(b.nsk).not.toBe("2026-07-17");
  });

  it("Index XQ chưa đủ TC → không kết luận HAI/PNU1/NSK", () => {
    const session = computeBaGridSession({
      ngayVaoVien: "2026-07-17",
      xn: [],
      cdha: [
        {
          id: "xq-1",
          ngay: "2026-07-19",
          loai: "XQ",
          mo_ta_benh_ly: "XQ",
          tieu_chuan_key: "imaging_chest",
        },
      ],
      activeIndex: { kind: "CDHA", id: "xq-1", date: "2026-07-19" },
      nghiNgo: "PNEU",
      symptomDates: {},
      tieuChuanByDate: {},
      khoaByDate: {},
      canThiepDates: [],
      ketLuanOverride: "NO_EVENT · thiếu triệu chứng hô hấp",
    });
    expect(session.ketLuan?.nkbv).toBe("THIEU_TC");
    expect(session.ketLuan?.trang_thai).toBe("khong_du_tc");
    expect(session.ketLuan?.summary).toBe("NO_EVENT · thiếu triệu chứng hô hấp");
    expect(session.ketLuan?.suggestedSummary).not.toMatch(/\bHAI\b|\bPOA\b|NSK /);
    expect(session.ketLuan?.loai_nk).toBe("đang phân tích");
  });

  it("đủ TC (criteriaMetPreview) → kết luận đầy đủ có NSK", () => {
    const session = computeBaGridSession({
      ngayVaoVien: "2026-07-17",
      xn: [],
      cdha: [
        {
          id: "xq-1",
          ngay: "2026-07-19",
          loai: "XQ",
          mo_ta_benh_ly: "XQ",
          tieu_chuan_key: "imaging_chest",
        },
      ],
      activeIndex: { kind: "CDHA", id: "xq-1", date: "2026-07-19" },
      nghiNgo: "PNEU",
      symptomDates: {},
      tieuChuanByDate: {
        "2026-07-19": [
          { key: "fever", label: "Sốt" },
          { key: "cough", label: "Ho" },
          { key: "rales", label: "Ran" },
        ],
      },
      khoaByDate: { "2026-07-19": "ICU" },
      canThiepDates: [],
      criteriaMetPreview: true,
    });
    expect(session.ketLuan?.nkbv).not.toBe("THIEU_TC");
    expect(session.ketLuan?.suggestedSummary).toMatch(/NSK /);
    expect(session.ketLuan?.trang_thai).toBe("nhap");
  });

  it("case ảnh PNEU: Index XQ → NSK sớm + quy kết đờm trong RIT", () => {
    const session = computeBaGridSession({
      ngayVaoVien: "2026-07-17",
      ngayRaVien: "2026-08-02",
      xn: [
        {
          id: "xn-dorm",
          ngay: "2026-07-26",
          benh_pham: "Đờm",
          vi_khuan: "A. baumannii",
          source: "LIS",
        },
      ],
      cdha: [
        {
          id: "xq-1",
          ngay: "2026-07-19",
          loai: "XQ",
          mo_ta_benh_ly: "XQ viêm phổi (rốn phổi)",
          tieu_chuan_key: "imaging_chest",
        },
      ],
      activeIndex: { kind: "CDHA", id: "xq-1", date: "2026-07-19" },
      nghiNgo: "PNEU",
      symptomDates: {},
      tieuChuanByDate: {
        "2026-07-17": [{ key: "rales", label: "BC 14,3, phổi có rale" }],
        "2026-07-18": [{ key: "dyspnea", label: "Rale nổ, khó thở" }],
        "2026-07-21": [{ key: "purulent_sputum", label: "Tăng tiết đờm đục" }],
      },
      khoaByDate: { "2026-07-17": "B11", "2026-07-18": "B11", "2026-07-19": "B11" },
      canThiepDates: [
        "2026-07-17",
        "2026-07-18",
        "2026-07-19",
        "2026-07-20",
        "2026-07-21",
        "2026-07-22",
      ],
      criteriaMetPreview: true,
    });

    expect(session.indexDate).toBe("2026-07-19");
    expect(session.nsk).toBe("2026-07-17");
    expect(session.ritDates.has("2026-07-17")).toBe(true);
    expect(session.attributedXnIds).toContain("xn-dorm");
    expect(session.ketLuan?.noi_xay_ra).toBe("B11");
  });

  it("attributeWithinRit skips Index id", () => {
    const r = attributeWithinRit({
      nsk: "2026-07-17",
      majorType: "PNEU",
      xn: [
        { id: "a", ngay: "2026-07-20", benh_pham: "Đờm", vi_khuan: "X", source: "LIS" },
      ],
      cdha: [],
      activeIndexId: "a",
    });
    expect(r.attributedXnIds).toEqual([]);
  });

  it("UTI catalog có voiding; imaging UTI rỗng", () => {
    const cat = clinicalCatalogForNghiNgo("UTI");
    expect(cat.some((c) => c.criteriaKey === "dysuria")).toBe(true);
    expect(cat.some((c) => c.criteriaKey === "urgency")).toBe(true);
    expect(cat.some((c) => c.criteriaKey === "frequency")).toBe(true);
    expect(cat.some((c) => c.criteriaKey === "fever")).toBe(true);
    expect(imagingCatalogForNghiNgo("UTI")).toHaveLength(0);
  });

  it("PNEU: thở máy 1 ngày → HAP (không VAP); liên quan xâm lấn = không", () => {
    const session = computeBaGridSession({
      ngayVaoVien: "2026-07-17",
      xn: [],
      cdha: [
        {
          id: "xq-1",
          ngay: "2026-07-20",
          loai: "XQ",
          mo_ta_benh_ly: "XQ",
          tieu_chuan_key: "imaging_chest",
        },
      ],
      activeIndex: { kind: "CDHA", id: "xq-1", date: "2026-07-20" },
      nghiNgo: "PNEU",
      symptomDates: {},
      tieuChuanByDate: {
        "2026-07-20": [{ key: "fever", label: "Sốt" }],
      },
      khoaByDate: { "2026-07-20": "B11" },
      canThiepDates: ["2026-07-20"],
      criteriaMetPreview: true,
    });
    expect(session.checklistType).toBe("HAP");
    expect(session.ketLuan?.lien_quan_xam_lan).toBe("khong");
    expect(session.ketLuan?.summary || "").not.toMatch(/VAP/i);
  });

  it("UTI session: Foley label + SBAP + sốt ∈ IWP → NSK", () => {
    const session = computeBaGridSession({
      ngayVaoVien: "2026-07-17",
      xn: [
        {
          id: "urine-1",
          ngay: "2026-07-20",
          benh_pham: "Nước tiểu",
          vi_khuan: "E. coli",
          so_luong: "10^5",
          source: "LIS",
        },
      ],
      cdha: [],
      activeIndex: { kind: "XN", id: "urine-1", date: "2026-07-20" },
      nghiNgo: "UTI",
      symptomDates: {},
      tieuChuanByDate: {
        "2026-07-19": [{ key: "fever", label: "Sốt" }],
      },
      trieuChungLamSangByDate: {
        "2026-07-19": [{ key: "fever", label: "Sốt" }],
      },
      khoaByDate: { "2026-07-19": "A1" },
      canThiepDates: ["2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20"],
      criteriaMetPreview: true,
      ketLuanOverride: "CAUTI_SUTI",
    });
    expect(session.canThiepLabel).toBe("Foley");
    expect(session.sbapLabel).toMatch(/UTI/i);
    expect(session.nsk).toBe("2026-07-19");
    expect(session.ketLuan?.summary).toContain("CAUTI_SUTI");
    expect(session.iwpDates.has("2026-07-20")).toBe(true);
  });

  it("progressive Index2: sốt cũ ngoài IWP không che sốt ∈ IWP mới → DOE ≠ Index", () => {
    // Index1 ~20 với sốt 18 (ngoài IWP Index2); Index2 = 30 với sốt 28 ∈ IWP
    const session = computeBaGridSession({
      ngayVaoVien: "2026-07-10",
      xn: [
        {
          id: "urine-2",
          ngay: "2026-07-30",
          benh_pham: "Nước tiểu",
          vi_khuan: "E. coli",
          so_luong: "10^5",
          source: "LIS",
        },
      ],
      cdha: [],
      activeIndex: { kind: "XN", id: "urine-2", date: "2026-07-30" },
      nghiNgo: "UTI",
      symptomDates: {},
      tieuChuanByDate: {
        "2026-07-18": [{ key: "fever", label: "Sốt lần 1" }],
        "2026-07-28": [{ key: "fever", label: "Sốt lần 2" }],
      },
      trieuChungLamSangByDate: {
        "2026-07-18": [{ key: "fever", label: "Sốt lần 1" }],
        "2026-07-28": [{ key: "fever", label: "Sốt lần 2" }],
      },
      khoaByDate: {},
      canThiepDates: [],
    });
    expect(session.indexDate).toBe("2026-07-30");
    expect(session.nsk).toBe("2026-07-28");
    expect(session.metrics?.doe).toBe("2026-07-28");
  });

  it("progressive: chỉ Index trong IWP (không TC lâm sàng) → DOE = Index", () => {
    const session = computeBaGridSession({
      ngayVaoVien: "2026-07-10",
      xn: [
        {
          id: "urine-2",
          ngay: "2026-07-30",
          benh_pham: "Nước tiểu",
          vi_khuan: "K.p",
          source: "LIS",
        },
      ],
      cdha: [],
      activeIndex: { kind: "XN", id: "urine-2", date: "2026-07-30" },
      nghiNgo: "UTI",
      symptomDates: {},
      tieuChuanByDate: {
        "2026-07-18": [{ key: "fever", label: "Sốt cũ ngoài IWP" }],
      },
      khoaByDate: {},
      canThiepDates: [],
    });
    expect(session.nsk).toBe("2026-07-30");
  });

  it("PNEU: key fever trên BA → DOE sớm hơn Index culture", () => {
    const session = computeBaGridSession({
      ngayVaoVien: "2026-07-10",
      xn: [
        {
          id: "sputum-1",
          ngay: "2026-07-25",
          benh_pham: "Đờm",
          vi_khuan: "K.p",
          source: "LIS",
        },
      ],
      cdha: [],
      activeIndex: { kind: "XN", id: "sputum-1", date: "2026-07-25" },
      nghiNgo: "PNEU",
      symptomDates: {},
      tieuChuanByDate: {
        "2026-07-22": [{ key: "fever", label: "Sốt" }],
      },
      khoaByDate: {},
      canThiepDates: [],
    });
    expect(session.nsk).toBe("2026-07-22");
  });
});
