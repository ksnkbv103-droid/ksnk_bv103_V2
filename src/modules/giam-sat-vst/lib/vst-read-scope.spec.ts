import { describe, expect, it, vi } from "vitest";
import {
  applyVstHistoryReadScope,
  assertVstHistoryAccess,
  hasHospitalWideVstRead,
  vstSessionVisibleToActor,
} from "./vst-read-scope";

function mockQuery() {
  const q = {
    eq: vi.fn((...args: unknown[]) => {
      q.last = { type: "eq", args };
      return q;
    }),
    or: vi.fn((...args: unknown[]) => {
      q.last = { type: "or", args };
      return q;
    }),
    last: null as { type: string; args: unknown[] } | null,
  };
  return q;
}

describe("applyVstHistoryReadScope", () => {
  it("không lọc cho admin", () => {
    const q = mockQuery();
    const out = applyVstHistoryReadScope(q, {
      isAdmin: true,
      isNhanVienKsnk: false,
      isMangLuoiKsnk: false,
      actorKhoaId: "k1",
      actorNhanSuId: "ns1",
      roles: [],
      isGuestStatsOnly: false,
    });
    expect(out).toBe(q);
    expect(q.eq).not.toHaveBeenCalled();
    expect(q.or).not.toHaveBeenCalled();
  });

  it("khách thống kê: không trả dữ liệu lịch sử", () => {
    const q = mockQuery();
    applyVstHistoryReadScope(q, {
      isAdmin: false,
      isNhanVienKsnk: false,
      isMangLuoiKsnk: false,
      actorKhoaId: null,
      actorNhanSuId: null,
      roles: ["KHACH_THONG_KE_GSTT"],
      isGuestStatsOnly: true,
    });
    expect(q.eq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000");
  });

  it("mạng lưới: or giám sát viên + khoa", () => {
    const q = mockQuery();
    applyVstHistoryReadScope(q, {
      isAdmin: false,
      isNhanVienKsnk: false,
      isMangLuoiKsnk: true,
      actorKhoaId: "khoa-a",
      actorNhanSuId: "ns-a",
      roles: [],
      isGuestStatsOnly: false,
    });
    expect(q.or).toHaveBeenCalledWith("nguoi_giam_sat_id.eq.ns-a,khoa_id.eq.khoa-a");
  });
});

// @dac-ta M01 dòng 22 — CHU_NHIEM_KHOA = chủ nhiệm khoa KSNK (TK_KSNK): xem/xuất phiên, không giới hạn khoa (VST-026).
// @dac-ta R1.34 — BGĐ (HOI_DONG_KSNK) chỉ thấy số liệu ẩn danh; vai ĐDT/CN_KHOA lâm sàng chưa có trong RBAC (VST-028).
// gate-ok: VST-026 đảo kỳ vọng CNK từ «lọc khoa_id / 0 dòng khi chưa có khoa» sang «toàn viện» (CNK = TK_KSNK, M01 dòng 22); expect cũ được thay bằng expectNoFilter ở đúng các ca đó
describe("applyVstHistoryReadScope — vai không phải mạng lưới/KSNK (VST-014, VST-026)", () => {
  const base = {
    isAdmin: false,
    isNhanVienKsnk: false,
    isMangLuoiKsnk: false,
    isGuestStatsOnly: false,
    actorNhanSuId: "ns-a",
  };

  function expectNoFilter(q: ReturnType<typeof mockQuery>, out: unknown) {
    expect(out).toBe(q);
    expect(q.eq).not.toHaveBeenCalled();
    expect(q.or).not.toHaveBeenCalled();
  }

  it("CHU_NHIEM_KHOA (chủ nhiệm khoa KSNK): toàn viện, không lọc khoa", () => {
    const q = mockQuery();
    const out = applyVstHistoryReadScope(q, { ...base, actorKhoaId: "khoa-a", roles: ["CHU_NHIEM_KHOA"] });
    expectNoFilter(q, out);
  });

  it("CHU_NHIEM_KHOA chưa gắn khoa: vẫn toàn viện, không rơi về 0 dòng", () => {
    const q = mockQuery();
    const out = applyVstHistoryReadScope(q, { ...base, actorKhoaId: null, roles: ["CHU_NHIEM_KHOA"] });
    expectNoFilter(q, out);
  });

  it("CHU_NHIEM_KHOA kiêm HOI_DONG_KSNK: toàn viện", () => {
    const q = mockQuery();
    const out = applyVstHistoryReadScope(q, {
      ...base,
      actorKhoaId: "khoa-a",
      roles: ["CHU_NHIEM_KHOA", "HOI_DONG_KSNK"],
    });
    expectNoFilter(q, out);
  });

  it("CHU_NHIEM_KHOA kiêm MANG_LUOI_KSNK: toàn viện, không bị siết theo mạng lưới", () => {
    const q = mockQuery();
    const out = applyVstHistoryReadScope(q, {
      ...base,
      isMangLuoiKsnk: true,
      actorKhoaId: "khoa-a",
      roles: ["CHU_NHIEM_KHOA", "MANG_LUOI_KSNK"],
    });
    expectNoFilter(q, out);
  });

  it("HOI_DONG_KSNK: không đọc lịch sử có danh tính", () => {
    const q = mockQuery();
    applyVstHistoryReadScope(q, { ...base, actorKhoaId: "khoa-a", roles: ["HOI_DONG_KSNK"] });
    expect(q.eq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000");
  });

  it("HOI_DONG_KSNK kiêm NHAN_VIEN_KSNK: giữ toàn viện", () => {
    const q = mockQuery();
    applyVstHistoryReadScope(q, {
      ...base,
      isNhanVienKsnk: true,
      actorKhoaId: "khoa-a",
      roles: ["HOI_DONG_KSNK", "NHAN_VIEN_KSNK"],
    });
    expect(q.eq).not.toHaveBeenCalled();
  });
});

describe("assertVstHistoryAccess — HOI_DONG_KSNK (VST-014)", () => {
  it("từ chối vai chỉ có HOI_DONG_KSNK", () => {
    const out = assertVstHistoryAccess({
      isAdmin: false,
      isNhanVienKsnk: false,
      isMangLuoiKsnk: false,
      isGuestStatsOnly: false,
      actorKhoaId: "k",
      actorNhanSuId: "n",
      roles: ["HOI_DONG_KSNK"],
    });
    expect(out.ok).toBe(false);
  });

  it("cho phép vai HOI_DONG_KSNK kiêm CHU_NHIEM_KHOA (VST-026)", () => {
    const out = assertVstHistoryAccess({
      isAdmin: false,
      isNhanVienKsnk: false,
      isMangLuoiKsnk: false,
      isGuestStatsOnly: false,
      actorKhoaId: "k",
      actorNhanSuId: "n",
      roles: ["HOI_DONG_KSNK", "CHU_NHIEM_KHOA"],
    });
    expect(out).toEqual({ ok: true });
  });
});

// Vị từ dùng chung cho danh sách (applyVstHistoryReadScope) và chi tiết phiên (getVSTSessionDetail).
describe("hasHospitalWideVstRead (VST-026)", () => {
  const base = {
    isAdmin: false,
    isNhanVienKsnk: false,
    isMangLuoiKsnk: false,
    isGuestStatsOnly: false,
    actorKhoaId: "k",
    actorNhanSuId: "n",
    roles: [] as string[],
  };

  it.each([
    ["ADMIN", { isAdmin: true }, true],
    ["NHAN_VIEN_KSNK", { isNhanVienKsnk: true, roles: ["NHAN_VIEN_KSNK"] }, true],
    ["CHU_NHIEM_KHOA", { roles: ["CHU_NHIEM_KHOA"] }, true],
    ["CHU_NHIEM_KHOA + MANG_LUOI_KSNK", { isMangLuoiKsnk: true, roles: ["CHU_NHIEM_KHOA", "MANG_LUOI_KSNK"] }, true],
    ["MANG_LUOI_KSNK", { isMangLuoiKsnk: true, roles: ["MANG_LUOI_KSNK"] }, false],
    ["HOI_DONG_KSNK", { roles: ["HOI_DONG_KSNK"] }, false],
    ["không vai", {}, false],
  ])("%s → %s", (_ten, patch, expected) => {
    expect(hasHospitalWideVstRead({ ...base, ...patch })).toBe(expected);
  });
});

// Chi tiết phiên (getVSTSessionDetail) dùng cùng luật với danh sách. Trước VST-026 màn chi tiết có nhánh riêng
// «CNK chỉ thấy phiên khoa mình» mà spec của danh sách không bắt được; nay cả hai đi qua một hàm thuần.
describe("vstSessionVisibleToActor (VST-026)", () => {
  const base = {
    isAdmin: false,
    isNhanVienKsnk: false,
    isMangLuoiKsnk: false,
    isGuestStatsOnly: false,
    actorKhoaId: "khoa-a",
    actorNhanSuId: "ns-a",
    roles: [] as string[],
  };
  // Phiên của khoa khác, do người khác giám sát: chỉ vai đọc toàn viện mới thấy.
  const phienNgoai = { khoa_id: "khoa-b", nguoi_giam_sat_id: "ns-b" };

  it.each([
    ["ADMIN", { isAdmin: true }, true],
    ["NHAN_VIEN_KSNK", { isNhanVienKsnk: true, roles: ["NHAN_VIEN_KSNK"] }, true],
    ["CHU_NHIEM_KHOA", { roles: ["CHU_NHIEM_KHOA"] }, true],
    ["CHU_NHIEM_KHOA chưa gắn khoa", { actorKhoaId: null, roles: ["CHU_NHIEM_KHOA"] }, true],
    ["CHU_NHIEM_KHOA + MANG_LUOI_KSNK", { isMangLuoiKsnk: true, roles: ["CHU_NHIEM_KHOA", "MANG_LUOI_KSNK"] }, true],
    ["MANG_LUOI_KSNK", { isMangLuoiKsnk: true, roles: ["MANG_LUOI_KSNK"] }, false],
    ["HOI_DONG_KSNK", { roles: ["HOI_DONG_KSNK"] }, false],
    ["khách thống kê", { isGuestStatsOnly: true, roles: ["KHACH_THONG_KE_GSTT"] }, false],
    ["vai khác không thuộc mạng lưới (VST-028)", { roles: ["TO_TRUONG"] }, true],
  ])("phiên khoa khác + người khác: %s → %s", (_ten, patch, expected) => {
    expect(vstSessionVisibleToActor({ ...base, ...patch }, phienNgoai)).toBe(expected);
  });

  const mangLuoi = { ...base, isMangLuoiKsnk: true, roles: ["MANG_LUOI_KSNK"] };

  it("mạng lưới thấy phiên cùng khoa dù người khác giám sát", () => {
    expect(vstSessionVisibleToActor(mangLuoi, { khoa_id: "khoa-a", nguoi_giam_sat_id: "ns-b" })).toBe(true);
  });

  it("mạng lưới thấy phiên mình giám sát dù khác khoa", () => {
    expect(vstSessionVisibleToActor(mangLuoi, { khoa_id: "khoa-b", nguoi_giam_sat_id: "ns-a" })).toBe(true);
  });

  it("mạng lưới thiếu cả khoa lẫn nhân sự: không thấy phiên nào, kể cả phiên thiếu khoa/người (NULL = NULL là false như RLS)", () => {
    const khongDanhTinh = { ...mangLuoi, actorKhoaId: null, actorNhanSuId: null };
    expect(vstSessionVisibleToActor(khongDanhTinh, { khoa_id: null, nguoi_giam_sat_id: null })).toBe(false);
    expect(vstSessionVisibleToActor(khongDanhTinh, phienNgoai)).toBe(false);
  });
});

describe("assertVstHistoryAccess", () => {
  it("từ chối khách thống kê", () => {
    const out = assertVstHistoryAccess({
      isAdmin: false,
      isNhanVienKsnk: false,
      isMangLuoiKsnk: false,
      isGuestStatsOnly: true,
      actorKhoaId: null,
      actorNhanSuId: null,
      roles: ["KHACH_THONG_KE_GSTT"],
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toContain("khách");
  });

  it("cho phép nhân viên KSNK", () => {
    const out = assertVstHistoryAccess({
      isAdmin: false,
      isNhanVienKsnk: true,
      isMangLuoiKsnk: false,
      isGuestStatsOnly: false,
      actorKhoaId: null,
      actorNhanSuId: null,
      roles: [],
    });
    expect(out).toEqual({ ok: true });
  });
});
