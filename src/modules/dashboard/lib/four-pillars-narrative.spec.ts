import { describe, expect, it } from "vitest";
import {
  buildFourPillarsNarratives,
  buildPillarANarrative,
  buildPillarBNarrative,
} from "./four-pillars-narrative";

describe("four-pillars-narrative", () => {
  it("Trụ A: thiếu VST/GSC → thiếu dữ liệu", () => {
    const a = buildPillarANarrative(null, null);
    expect(a.summary).toMatch(/Chưa đủ dữ liệu/);
    expect(a.reasons.length).toBeGreaterThan(0);
    expect(a.reasons.length).toBeLessThanOrEqual(3);
  });

  it("Trụ A: dưới 70% → cảnh báo", () => {
    expect(buildPillarANarrative(65, 90).summary).toMatch(/dưới ngưỡng/);
  });

  it("Trụ B: đỏ/đóng băng nổi bật", () => {
    const b = buildPillarBNarrative({
      available: true,
      san_luong_cap_phat: 12,
      red_alert_total: 2,
      frozen_total: 1,
      may_ready: 3,
      may_repairing: 0,
      so_me_ky: 4,
      ty_le_qc_dat_me: 90,
    });
    expect(b.summary).toMatch(/rủi ro/);
    expect(b.reasons.some((r) => r.includes("đỏ"))).toBe(true);
  });

  it("buildFourPillarsNarratives tách C KSNK vs máy", () => {
    const n = buildFourPillarsNarratives({
      tyLeVst: 90,
      tyLeGsc: 88,
      cssd: {
        available: true,
        san_luong_cap_phat: 5,
        red_alert_total: 0,
        frozen_total: 0,
        may_ready: 2,
        may_repairing: 1,
        so_me_ky: 1,
        ty_le_qc_dat_me: 100,
      },
      nkbv: { available: true, choXn: 3, tongPhieu: 10 },
      staff: { available: true, so_nv: 4, tong_phien_gs: 20, tong_co_hoi_vst: 100 },
    });
    expect(n.a.summary).toMatch(/ổn|VST/);
    expect(n.cKsnk.summary).toMatch(/NV KSNK/);
    expect(n.cMay.summary).toMatch(/Máy sẵn sàng/);
    expect(n.d.summary).toMatch(/chờ xác nhận/);
  });
});
