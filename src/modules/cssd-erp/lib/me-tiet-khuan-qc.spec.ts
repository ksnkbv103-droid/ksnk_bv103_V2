import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getSterilizerMethod, isSteamSterilizerProfile } from "../helpers/me-tiet-khuan-machine-kind";
import { evaluateMeQcRelease, formatMeMaLo, steamBiWeeklyReminder } from "./me-tiet-khuan-qc";
import { assertPackIssuable, isBlockingSterilizationIncident } from "@/lib/domain/cssd-pack-issuance";

const baseQc = {
  thongSoVatLy: "DAT",
  ciNgoaiGoi: "DAT",
  ciPcd: "DAT",
  trangThaiBi: "AM",
  nhietDo: "134",
  apSuat: "2.1",
  thoiGianChuKy: "20",
};

describe("getSterilizerMethod", () => {
  it("maps lookup codes and ignores machine name", () => {
    expect(getSterilizerMethod({ loai_may: { ma_loai_may: "LM_HOI_NUOC", ten_loai_may: "Plasma giả" } })).toBe("HOI_NUOC");
    expect(getSterilizerMethod({ ma_loai_may: "LM_PLASMA" })).toBe("PLASMA_H2O2");
    expect(getSterilizerMethod({ loai_thiet_bi: "LM_EO" })).toBe("EO");
    expect(getSterilizerMethod({ ten_thiet_bi: "Hấp hơi nước 134", loai_ten_hien_thi: "steam" })).toBeNull();
    expect(getSterilizerMethod({ ma_loai_may: "LM_GIAT_LA" })).toBeNull();
    expect(getSterilizerMethod({ ma_loai_may: "LM_DONG_GOI" })).toBeNull();
    expect(getSterilizerMethod({ ma_loai_may: "LM_TEST_BI" })).toBeNull();
    expect(isSteamSterilizerProfile({ ma_loai_may: "LM_PLASMA" })).toBe(false);
    expect(isSteamSterilizerProfile({ phuong_phap: "HOI_NUOC" })).toBe(true);
  });
});

describe("evaluateMeQcRelease", () => {
  it("rejects empty and CHUA_DANH_GIA", () => {
    const empty = evaluateMeQcRelease({ ...baseQc, thongSoVatLy: "", method: "HOI_NUOC" });
    expect(empty.ok).toBe(false);
    const pending = evaluateMeQcRelease({ ...baseQc, ciPcd: "CHUA_DANH_GIA", method: "HOI_NUOC" });
    expect(pending.ok).toBe(false);
  });

  it("any fail item makes the batch fail and BI chưa có stays null", () => {
    const fail = evaluateMeQcRelease({ ...baseQc, ciNgoaiGoi: "KHONG_DAT", trangThaiBi: "CHUA_CO", method: "HOI_NUOC" });
    expect(fail.ok).toBe(true);
    if (fail.ok) {
      expect(fail.decision.outcome).toBe("QC_KHONG_DAT");
      expect(fail.decision.ketQuaBi).toBeNull();
      expect(fail.decision.ketQuaCi).toBe(false);
    }
  });

  it("holds CHO_BI when BI is required and not yet read", () => {
    const plasma = evaluateMeQcRelease({ ...baseQc, trangThaiBi: "CHUA_CO", method: "PLASMA_H2O2", nhietDo: "", apSuat: "", thoiGianChuKy: "" });
    expect(plasma.ok).toBe(true);
    if (plasma.ok) expect(plasma.decision.outcome).toBe("CHO_BI");

    const implant = evaluateMeQcRelease({ ...baseQc, trangThaiBi: "CHUA_CO", method: "HOI_NUOC", coImplant: true });
    expect(implant.ok).toBe(true);
    if (implant.ok) expect(implant.decision.outcome).toBe("CHO_BI");
  });

  it("releases steam without implant when BI is not back yet", () => {
    const steam = evaluateMeQcRelease({ ...baseQc, trangThaiBi: "CHUA_CO", method: "HOI_NUOC", coImplant: false });
    expect(steam.ok).toBe(true);
    if (steam.ok) {
      expect(steam.decision.outcome).toBe("HOAN_THANH");
      expect(steam.decision.ketQuaBi).toBeNull();
    }
  });

  it("ME-01: DANG_U không chặn nhả hơi nước thường; vẫn CHO_BI khi BI bắt buộc", () => {
    const steam = evaluateMeQcRelease({ ...baseQc, trangThaiBi: "DANG_U", method: "HOI_NUOC", coImplant: false });
    expect(steam.ok && steam.decision.outcome).toBe("HOAN_THANH");
    const plasma = evaluateMeQcRelease({
      ...baseQc,
      trangThaiBi: "DANG_U",
      method: "PLASMA_H2O2",
      nhietDo: "",
      apSuat: "",
      thoiGianChuKy: "",
    });
    expect(plasma.ok && plasma.decision.outcome).toBe("CHO_BI");
  });

  it("ME-08: thông số lệch chuẩn catalog → QC_KHONG_DAT dù chọn Đạt vật lý", () => {
    const r = evaluateMeQcRelease({
      ...baseQc,
      nhietDo: "121",
      trangThaiBi: "AM",
      method: "HOI_NUOC",
      chuongTrinhChuan: { nhiet_do: "134", ap_suat: "2.1", thoi_gian_chu_ky: "18" },
    });
    expect(r.ok && r.decision.outcome).toBe("QC_KHONG_DAT");
  });

  it("BI dương is a fail, BI âm releases plasma", () => {
    const pos = evaluateMeQcRelease({ ...baseQc, trangThaiBi: "DUONG", method: "EO", nhietDo: "", apSuat: "", thoiGianChuKy: "" });
    expect(pos.ok && pos.decision.outcome).toBe("QC_KHONG_DAT");
    expect(pos.ok && pos.decision.bioFail).toBe(true);
    expect(pos.ok && pos.decision.ketQuaBi).toBe(false);

    const neg = evaluateMeQcRelease({ ...baseQc, trangThaiBi: "AM", method: "PLASMA_H2O2", nhietDo: "", apSuat: "", thoiGianChuKy: "" });
    expect(neg.ok && neg.decision.outcome).toBe("HOAN_THANH");
    expect(neg.ok && neg.decision.ketQuaBi).toBe(true);
  });
});

describe("formatMeMaLo", () => {
  it("uses VN calendar and a short machine token", () => {
    const at = new Date("2026-09-03T17:30:00.000Z");
    expect(formatMeMaLo({ machineCode: "HM-01", at, seq: 2 })).toBe("HM01-040926-2");
    expect(formatMeMaLo({ machineCode: "  ", at, seq: 1 })).toBe("MAY-040926-1");
  });
});

describe("steamBiWeeklyReminder", () => {
  it("reminds only steam machines missing a BI inside 7 days", () => {
    const now = new Date("2026-09-24T00:00:00.000Z");
    expect(steamBiWeeklyReminder({ method: "EO", now })).toBeNull();
    expect(steamBiWeeklyReminder({ method: "HOI_NUOC", lastBiAt: null, now })).toMatch(/7 ngày/);
    expect(steamBiWeeklyReminder({ method: "HOI_NUOC", lastBiAt: "2026-09-20T00:00:00.000Z", now })).toBeNull();
    expect(steamBiWeeklyReminder({ method: "HOI_NUOC", lastBiAt: "2026-09-01T00:00:00.000Z", now })).toMatch(/7 ngày/);
  });
});

describe("assertPackIssuable batch release", () => {
  const pack = { tinh_trang: "BINH_THUONG", han_su_dung: "2026-12-01", todayYmd: "2026-09-04" };

  it("blocks CHO_BI, unfinished batches, and open sterilization incidents", () => {
    expect(assertPackIssuable({ ...pack, batchRelease: { trangThaiMe: "CHO_BI" } }).ok).toBe(false);
    expect(assertPackIssuable({ ...pack, batchRelease: { trangThaiMe: "DANG_TIET_KHUAN" } }).ok).toBe(false);
    expect(
      assertPackIssuable({
        ...pack,
        batchRelease: { trangThaiMe: "HOAN_THANH", hasOpenSterilizationIncident: true },
      }).ok,
    ).toBe(false);
    expect(assertPackIssuable({ ...pack, batchRelease: { trangThaiMe: "HOAN_THANH" } }).ok).toBe(true);
  });

  it("detects sterilization incidents OPEN or confirmed on the batch or set", () => {
    expect(
      isBlockingSterilizationIncident(
        {
          quy_trinh_id: "qt-1",
          attributes: {
            INCIDENT_TYPE_CODE: "PROCESS_STERILIZATION_FAIL",
            INCIDENT_STATUS: "OPEN",
          },
        },
        { quyTrinhId: "qt-1", loTietKhuanId: "me-1" },
      ),
    ).toBe(true);
    expect(
      isBlockingSterilizationIncident(
        {
          quy_trinh_id: "other",
          attributes: {
            LO_TIET_KHUAN_ID: "me-1",
            INCIDENT_GROUP: "PROCESS",
            INCIDENT_STATUS: "DA_XAC_NHAN",
          },
        },
        { quyTrinhId: "qt-1", loTietKhuanId: "me-1" },
      ),
    ).toBe(true);
    expect(
      isBlockingSterilizationIncident(
        { quy_trinh_id: "qt-1", attributes: { INCIDENT_GROUP: "INSTRUMENT", INCIDENT_STATUS: "OPEN" } },
        { quyTrinhId: "qt-1" },
      ),
    ).toBe(false);
  });

  it("does not block Kiểm bộ fail (PROCESS_QC_FAIL) without batch / TIET_KHUAN", () => {
    expect(
      isBlockingSterilizationIncident(
        {
          quy_trinh_id: "qt-1",
          attributes: {
            INCIDENT_TYPE_CODE: "PROCESS_QC_FAIL",
            INCIDENT_GROUP: "PROCESS",
            INCIDENT_STATUS: "OPEN",
          },
        },
        { quyTrinhId: "qt-1", loTietKhuanId: "me-1" },
      ),
    ).toBe(false);
  });

  it("blocks batch recall and TIET_KHUAN detection station", () => {
    expect(
      isBlockingSterilizationIncident(
        {
          quy_trinh_id: "qt-1",
          attributes: { BATCH_RECALL: "1", INCIDENT_STATUS: "OPEN" },
        },
        { quyTrinhId: "qt-1" },
      ),
    ).toBe(true);
    expect(
      isBlockingSterilizationIncident(
        {
          quy_trinh_id: "qt-1",
          ma_tram_phat_hien: "TIET_KHUAN",
          attributes: { INCIDENT_TYPE_CODE: "PROCESS_MISSTEP", INCIDENT_STATUS: "OPEN" },
        },
        { quyTrinhId: "qt-1" },
      ),
    ).toBe(true);
  });
});

describe("release SQL", () => {
  it("does not stamp issuance time when releasing a batch", () => {
    const sql = readFileSync("supabase/migrations/20260925100000_cssd_me_s2_qc_release.sql", "utf8");
    const release = sql.slice(sql.indexOf("fn_cssd_me_chuyen_bo_kho_vo_khuan"), sql.indexOf("rpc_cssd_me_tao"));
    expect(release).not.toMatch(/thoi_gian_cap_phat\s*=/);
    expect(release).not.toMatch(/nguoi_cap_phat_id\s*=/);
    expect(release).toMatch(/tram_hien_tai_id = v_cap/);
  });
});

describe("ME-05 release HSD SQL", () => {
  it("uses batch end mốc and packaging days without coalesce 30", () => {
    const sql = readFileSync(
      "supabase/migrations/20261005145000_cssd_me05_hsd_bao_goi.sql",
      "utf8",
    );
    const fn = sql.slice(
      sql.indexOf("CREATE OR REPLACE FUNCTION public.fn_cssd_me_chuyen_bo_kho_vo_khuan"),
      sql.indexOf("COMMENT ON FUNCTION public.fn_cssd_me_chuyen_bo_kho_vo_khuan"),
    );
    expect(fn).toMatch(/coalesce\(m\.thoi_gian_ket_thuc, m\.tk_mo_form_qc_at\)/);
    expect(fn).toMatch(/thoi_gian_tiet_khuan = v_moc/);
    expect(fn).toMatch(/cssd_dm_loai_bao_goi/);
    expect(fn).not.toMatch(/coalesce\(src\.so_ngay,\s*30\)/);
    expect(fn).not.toMatch(/dm_loai_dung_cu/);
  });
});
