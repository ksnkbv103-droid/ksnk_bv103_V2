import { describe, expect, it } from "vitest";
import {
  currentMeSlipStep,
  filterWaitingSetsForSlip,
  meQcDraftStorageKey,
  meTrangThaiBadge,
  parseMeQcDraft,
  serializeMeQcDraft,
  slipStatusLabel,
} from "./me-tiet-khuan-slip-ux";

const BATCH = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("meTrangThaiBadge", () => {
  it("đủ sáu nhãn tiếng Việt", () => {
    expect(meTrangThaiBadge("DANG_CHUAN_NAP").label).toBe("Đang nạp");
    expect(meTrangThaiBadge("DANG_TIET_KHUAN").label).toBe("Đang chạy");
    expect(meTrangThaiBadge("CHO_BI").label).toBe("Chờ BI");
    expect(meTrangThaiBadge("HOAN_THANH").label).toBe("Hoàn thành");
    expect(meTrangThaiBadge("QC_KHONG_DAT").label).toBe("Không đạt");
    expect(meTrangThaiBadge("THU_HOI").label).toBe("Thu hồi");
  });
});

describe("currentMeSlipStep", () => {
  it("đi từ chương trình tới nhả", () => {
    expect(currentMeSlipStep({ chuongTrinh: "", itemCount: 0, napLocked: false, qcOpen: false })).toBe(2);
    expect(currentMeSlipStep({ chuongTrinh: "134", itemCount: 0, napLocked: false, qcOpen: false })).toBe(3);
    expect(currentMeSlipStep({ chuongTrinh: "134", itemCount: 2, napLocked: false, qcOpen: false })).toBe(4);
    expect(currentMeSlipStep({ chuongTrinh: "134", itemCount: 2, napLocked: true, qcOpen: false })).toBe(5);
    expect(currentMeSlipStep({ chuongTrinh: "134", itemCount: 2, napLocked: true, qcOpen: true })).toBe(5);
    expect(currentMeSlipStep({ chuongTrinh: "134", itemCount: 2, napLocked: true, qcOpen: true, choBi: true })).toBe(6);
  });
});

describe("slipStatusLabel", () => {
  it("đang nạp trước khi chạy, chờ BI khi giữ", () => {
    expect(slipStatusLabel({ step: 3 })).toBe("Đang nạp");
    expect(slipStatusLabel({ step: 5 })).toBe("Đang chạy");
    expect(slipStatusLabel({ step: 6, choBi: true })).toBe("Chờ BI");
    expect(slipStatusLabel({ step: 6, ketQuaTest: true })).toBe("Hoàn thành");
  });
});

describe("filterWaitingSetsForSlip", () => {
  it("bỏ bộ khóa, bộ trong phiếu, bộ thuộc mẻ khác", () => {
    const rows = filterWaitingSetsForSlip(
      [
        { id: "a", ma_vach_qr: "QR-A" },
        { id: "b", ma_vach_qr: "QR-B", is_dong_bang: true },
        { id: "c", ma_vach_qr: "QR-C", lo_tiet_khuan_id: OTHER },
        { id: "d", ma_vach_qr: "QR-D" },
        { id: "e", ma_vach_qr: "QR-E", lo_tiet_khuan_id: BATCH },
        { id: "f", ma_vach_qr: "QR-F" },
      ],
      { inSlipIds: ["d"], inSlipCodes: ["QR-A"] },
    );
    expect(rows.map((r) => r.id)).toEqual(["f"]);
  });
});

describe("parseMeQcDraft", () => {
  it("giữ nháp hợp lệ theo id mẻ", () => {
    const raw = serializeMeQcDraft({
      chuongTrinh: "134 vải",
      nhietDo: "134",
      apSuat: "2",
      thoiGianChuKy: "4",
      thongSoVatLy: "DAT",
      ciNgoaiGoi: "KHONG_DAT",
      ciPcd: "DAT",
      trangThaiBi: "CHUA_CO",
    });
    expect(meQcDraftStorageKey("me-1")).toBe("bv103.me-qc-draft.me-1");
    expect(parseMeQcDraft(raw)?.ciNgoaiGoi).toBe("KHONG_DAT");
    expect(parseMeQcDraft("{")).toBeNull();
    expect(parseMeQcDraft(JSON.stringify({ thongSoVatLy: "MAYBE", trangThaiBi: "X" }))?.thongSoVatLy).toBe("");
  });
});
