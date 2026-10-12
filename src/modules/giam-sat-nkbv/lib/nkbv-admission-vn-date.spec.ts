import { describe, expect, it } from "vitest";
import { addDays, haiPoaLabel, knownHaiPoa, poaOrHai } from "./nkbv-shared-timeline";
import { calculateCdcMetrics, isHaiSuspectByDay3Rule } from "./nkbv-timeline-math";
import { applyCh2PoaGate } from "./nkbv-rules-engine";
import { nkbvVnDateStartIso } from "./nkbv-ba-ngay";

/**
 * Lát NK-TZ — `nkbv_fact_benh_an.ngay_vao_vien` là timestamptz, import lưu `YYYY-MM-DDT00:00:00+07:00`
 * → Postgres trả `…(hôm trước)T17:00:00Z`. Ngày vào viện phải đọc theo ngày Việt Nam.
 */
describe("ngày vào viện lưu 17:00Z (00:00 VN) — đọc theo ngày VN", () => {
  const ADM_DB = "2026-08-09T17:00:00+00:00"; // = 10/08/2026 00:00 giờ VN (BA-TRIAL-01)

  it("DOE ngày thứ 2 (11/08) là POA, không phải HAI", () => {
    const r = poaOrHai(ADM_DB, "2026-08-11");
    expect(r.dayOfHospitalization).toBe(2);
    expect(r.haiStatus).toBe("POA");
  });

  it("DOE ngày thứ 3 (12/08) là HAI", () => {
    expect(poaOrHai(ADM_DB, "2026-08-12").haiStatus).toBe("HAI");
  });

  it("calculateCdcMetrics: ngày nằm viện tính từ ngày VN", () => {
    const m = calculateCdcMetrics({
      ngay_phat_hien: "2026-08-11",
      ngay_vao_vien: ADM_DB,
      checklistType: "BSI",
      activeForm: { has_fever: true },
      symptomDates: { has_fever: "2026-08-11" },
      treatmentHistory: [],
    });
    expect(m.doe).toBe("2026-08-11");
    expect(m.dayOfHospitalization).toBe(2);
    expect(m.haiStatus).toBe("POA");
  });

  it("cổng LIS day-3 và cổng POA server dùng cùng ngày VN", () => {
    expect(isHaiSuspectByDay3Rule(ADM_DB, "2026-08-11T01:00:00Z")).toBe(false);
    const gated = applyCh2PoaGate(
      { ngay_vao_vien: ADM_DB, calculated_doe: "2026-08-11" },
      { is_positive: true, classification: "LCBI", reason: "" },
    );
    expect(gated.classification).toBe("POA");
  });

  it("định dạng lưu của import (+07:00) đọc lại đúng ngày", () => {
    const stored = nkbvVnDateStartIso("2026-08-10");
    expect(stored).toBe("2026-08-10T00:00:00+07:00");
    expect(nkbvVnDateStartIso(ADM_DB)).toBe("2026-08-10T00:00:00+07:00");
    expect(poaOrHai(stored, "2026-08-11").haiStatus).toBe("POA");
  });
});

describe("poaOrHai thiếu ngày → CHUA_XAC_DINH (không POA im lặng)", () => {
  it("thiếu ngày vào viện", () => {
    const r = poaOrHai("", "2026-08-11");
    expect(r.haiStatus).toBe("CHUA_XAC_DINH");
    expect(knownHaiPoa(r.haiStatus)).toBeUndefined();
    expect(haiPoaLabel(r.haiStatus)).toMatch(/Chưa xác định/);
  });

  it("thiếu DOE", () => {
    expect(poaOrHai("2026-08-10", "").haiStatus).toBe("CHUA_XAC_DINH");
  });
});

describe("addDays theo UTC", () => {
  it("cộng/trừ qua ranh tháng/năm", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("không hợp lệ", 1)).toBe("");
  });
});
