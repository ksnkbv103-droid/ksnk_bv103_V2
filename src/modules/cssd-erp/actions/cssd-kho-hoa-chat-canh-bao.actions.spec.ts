import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * CSSD-033: tồn kho chỉ đổi lúc DUYỆT phiếu (`duyet_at = now()`), nên báo cáo Nhập–Xuất–Tồn và
 * lưu lượng 30 ngày phải lọc/gộp theo NGÀY HIỆU LỰC = `duyet_at`, phiếu cũ trước HC-C (duyet_at NULL)
 * lấy `created_at`. Mock dưới đây đánh giá thật `.eq/.in/.gte/.lt/.or` (cú pháp PostgREST rút gọn)
 * trên bảng giả, để kiểm ngữ nghĩa lọc chứ không so chuỗi.
 */

type Row = Record<string, unknown>;
type Pred = (r: Row) => boolean;
type Result = { data: Row[] | null; error: { message: string } | null };
type Builder = {
  select: (cols?: string) => Builder;
  eq: (col: string, val: unknown) => Builder;
  in: (col: string, vals: unknown[]) => Builder;
  gte: (col: string, val: string) => Builder;
  lt: (col: string, val: string) => Builder;
  or: (expr: string) => Builder;
  order: (col: string, opts?: unknown) => Builder;
  range: (from: number, to: number) => Builder;
  then: PromiseLike<Result>["then"];
};

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  table: [] as Array<Record<string, unknown>>,
}));

/** Tách theo dấu phẩy ngoài ngoặc: `a.is.null,and(b.gte.x,c.lt.y)` → 2 phần. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function cmp(col: string, op: string, val: string): Pred {
  return (r) => {
    const v = r[col];
    if (op === "is") return val === "null" ? v == null : v != null;
    if (v == null) return false; // SQL: so sánh với NULL không bao giờ đúng
    const a = Date.parse(String(v));
    const b = Date.parse(val);
    if (op === "gte") return a >= b;
    if (op === "lt") return a < b;
    throw new Error(`Toán tử chưa hỗ trợ trong mock: ${op}`);
  };
}

function parseTerm(t: string): Pred {
  if (t.startsWith("and(") && t.endsWith(")")) {
    const inner = splitTop(t.slice(4, -1)).map(parseTerm);
    return (r) => inner.every((p) => p(r));
  }
  const m = /^(\w+)\.(\w+)\.(.+)$/.exec(t);
  if (!m) throw new Error(`Cú pháp or() chưa hỗ trợ trong mock: ${t}`);
  return cmp(m[1], m[2], m[3]);
}

function makeBuilder(table: string): Builder {
  const preds: Pred[] = [];
  let cols: string[] | null = null;
  let window: [number, number] = [0, Number.MAX_SAFE_INTEGER];
  const run = (): Result => {
    if (table !== "cssd_fact_kho_hoa_chat_giao_dich") return { data: [], error: null };
    const hit = mocks.table.filter((r) => preds.every((p) => p(r))).slice(window[0], window[1] + 1);
    // Chỉ trả cột đã select — thiếu cột thì code thấy `undefined` như DB thật.
    const data = cols ? hit.map((r) => Object.fromEntries(cols!.map((c) => [c, r[c]]))) : hit;
    return { data, error: null };
  };
  const b: Builder = {
    select: (c) => {
      cols = c ? c.split(",").map((x) => x.trim()) : null;
      return b;
    },
    eq: (col, val) => {
      preds.push((r) => r[col] === val);
      return b;
    },
    in: (col, vals) => {
      preds.push((r) => vals.includes(r[col]));
      return b;
    },
    gte: (col, val) => {
      preds.push(cmp(col, "gte", val));
      return b;
    },
    lt: (col, val) => {
      preds.push(cmp(col, "lt", val));
      return b;
    },
    or: (expr) => {
      const terms = splitTop(expr).map(parseTerm);
      preds.push((r) => terms.some((p) => p(r)));
      return b;
    },
    order: () => b,
    range: (from, to) => {
      window = [from, to];
      return b;
    },
    then: (onFulfilled, onRejected) => Promise.resolve(run()).then(onFulfilled, onRejected),
  };
  return b;
}

vi.mock("@/lib/server-permission", () => ({ verifyPermission: mocks.verifyPermission }));
vi.mock("./cssd-action-common", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
  mapFkError: (m: string) => m,
}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({ from: (table: string) => makeBuilder(table) }),
}));

import { listLuuLuongKhoHoaChatAction, listSoKhoHoaChatDenNgayAction } from "./cssd-kho-hoa-chat-canh-bao.actions";

const DM1 = "11111111-1111-4111-8111-111111111111";
const DM2 = "22222222-2222-4222-8222-222222222222";
/** 2026-11-14 12:00 giờ VN → cửa sổ 30 ngày bắt đầu 2026-10-15 12:00 VN. */
const NOW = Date.parse("2026-11-14T05:00:00Z");

let seq = 0;
function slip(over: Row): Row {
  seq += 1;
  return {
    id: `gd-${String(seq).padStart(4, "0")}`,
    dm_hoa_chat_id: DM1,
    loai_giao_dich: "NHAP",
    so_luong_co_dau: 10,
    ly_do_xuat: null,
    trang_thai: "DA_DUYET",
    is_active: true,
    created_at: "2026-11-01T03:00:00Z",
    duyet_at: "2026-11-01T04:00:00Z",
    ...over,
  };
}

describe("listLuuLuongKhoHoaChatAction: cửa sổ 30 ngày theo ngày duyệt (CSSD-033)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seq = 0;
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.table = [];
    vi.spyOn(Date, "now").mockReturnValue(NOW);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("phiếu lập từ 44 ngày trước nhưng mới duyệt 2 ngày trước vẫn tính vào lượng nhập 30 ngày", async () => {
    mocks.table = [
      slip({ so_luong_co_dau: 100, created_at: "2026-10-01T03:00:00Z", duyet_at: "2026-11-12T03:00:00Z" }),
    ];
    const r = await listLuuLuongKhoHoaChatAction();
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data).toEqual([{ dm_hoa_chat_id: DM1, nhap_30n: 100, xuat_su_dung_30n: 0 }]);
  });

  it("phiếu cũ trước HC-C (duyet_at NULL) lấy ngày lập: trong cửa sổ thì tính, ngoài cửa sổ thì không", async () => {
    mocks.table = [
      slip({ so_luong_co_dau: 50, created_at: "2026-11-01T03:00:00Z", duyet_at: null }),
      slip({ so_luong_co_dau: 7, created_at: "2026-09-01T03:00:00Z", duyet_at: null }),
    ];
    const r = await listLuuLuongKhoHoaChatAction();
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data).toEqual([{ dm_hoa_chat_id: DM1, nhap_30n: 50, xuat_su_dung_30n: 0 }]);
  });

  it("gộp đúng theo mặt hàng: xuất «Cấp sử dụng» tính, xuất hủy/hết hạn không tính, phiếu chờ duyệt và đã xóa bị loại", async () => {
    mocks.table = [
      slip({ so_luong_co_dau: 100, created_at: "2026-10-01T03:00:00Z", duyet_at: "2026-11-12T03:00:00Z" }),
      slip({ loai_giao_dich: "XUAT", so_luong_co_dau: -30, ly_do_xuat: "CAP_SU_DUNG", duyet_at: "2026-11-13T03:00:00Z" }),
      slip({ loai_giao_dich: "XUAT", so_luong_co_dau: -5, ly_do_xuat: null, duyet_at: null, created_at: "2026-11-13T03:00:00Z" }),
      slip({ loai_giao_dich: "XUAT", so_luong_co_dau: -20, ly_do_xuat: "HET_HAN_HUY", duyet_at: "2026-11-13T03:00:00Z" }),
      slip({ so_luong_co_dau: 999, trang_thai: "CHO_DUYET", duyet_at: null }),
      slip({ so_luong_co_dau: 888, is_active: false }),
      slip({ dm_hoa_chat_id: DM2, so_luong_co_dau: 4, duyet_at: "2026-11-10T03:00:00Z" }),
    ];
    const r = await listLuuLuongKhoHoaChatAction();
    expect(r.success).toBe(true);
    if (!r.success) return;
    const byDm = new Map(r.data.map((x) => [x.dm_hoa_chat_id, x]));
    expect(byDm.get(DM1)).toEqual({ dm_hoa_chat_id: DM1, nhap_30n: 100, xuat_su_dung_30n: 35 });
    expect(byDm.get(DM2)).toEqual({ dm_hoa_chat_id: DM2, nhap_30n: 4, xuat_su_dung_30n: 0 });
  });

  it("phiếu ngược (đảo phiếu xuất, CSSD-034) là NHẬP trên sổ nhưng không phải hàng mới về → không cộng vào nhap_30n", async () => {
    mocks.table = [
      slip({ so_luong_co_dau: 100, duyet_at: "2026-11-12T03:00:00Z" }),
      slip({ loai_giao_dich: "XUAT", so_luong_co_dau: -30, ly_do_xuat: "CAP_SU_DUNG", duyet_at: "2026-11-13T03:00:00Z" }),
      slip({ so_luong_co_dau: 30, phieu_goc_id: "gd-0002", duyet_at: "2026-11-13T05:00:00Z" }),
    ];
    const r = await listLuuLuongKhoHoaChatAction();
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.find((x) => x.dm_hoa_chat_id === DM1)?.nhap_30n).toBe(100);
  });

  it("CSSD-037: phiếu XUẤT gốc đã được đảo xong (phiếu ngược DA_DUYET) không cộng vào xuat_su_dung_30n", async () => {
    mocks.table = [
      slip({ so_luong_co_dau: 100, duyet_at: "2026-11-12T03:00:00Z" }),
      slip({ loai_giao_dich: "XUAT", so_luong_co_dau: -30, ly_do_xuat: "CAP_SU_DUNG", duyet_at: "2026-11-13T03:00:00Z" }),
      slip({ so_luong_co_dau: 30, phieu_goc_id: "gd-0002", duyet_at: "2026-11-13T05:00:00Z" }),
    ];
    const r = await listLuuLuongKhoHoaChatAction();
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data).toEqual([{ dm_hoa_chat_id: DM1, nhap_30n: 100, xuat_su_dung_30n: 0 }]);
  });

  it("CSSD-037: chỉ phiếu gốc đã đảo bị bỏ; phiếu XUẤT khác chưa đảo vẫn cộng", async () => {
    mocks.table = [
      slip({ loai_giao_dich: "XUAT", so_luong_co_dau: -30, ly_do_xuat: "CAP_SU_DUNG", duyet_at: "2026-11-13T03:00:00Z" }),
      slip({ loai_giao_dich: "XUAT", so_luong_co_dau: -8, ly_do_xuat: "CAP_SU_DUNG", duyet_at: "2026-11-13T04:00:00Z" }),
      slip({ so_luong_co_dau: 30, phieu_goc_id: "gd-0001", duyet_at: "2026-11-13T05:00:00Z" }),
    ];
    const r = await listLuuLuongKhoHoaChatAction();
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data).toEqual([{ dm_hoa_chat_id: DM1, nhap_30n: 0, xuat_su_dung_30n: 8 }]);
  });

  it("CSSD-037: phiếu ngược mới CHO_DUYET chưa tính là đảo xong → phiếu XUẤT gốc vẫn cộng", async () => {
    mocks.table = [
      slip({ loai_giao_dich: "XUAT", so_luong_co_dau: -30, ly_do_xuat: "CAP_SU_DUNG", duyet_at: "2026-11-13T03:00:00Z" }),
      slip({ so_luong_co_dau: 30, phieu_goc_id: "gd-0001", trang_thai: "CHO_DUYET", duyet_at: null, created_at: "2026-11-13T05:00:00Z" }),
    ];
    const r = await listLuuLuongKhoHoaChatAction();
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data).toEqual([{ dm_hoa_chat_id: DM1, nhap_30n: 0, xuat_su_dung_30n: 30 }]);
  });
});

describe("listSoKhoHoaChatDenNgayAction: sổ đến hết ngày theo ngày duyệt (CSSD-033)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seq = 0;
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.table = [];
  });

  it("phiếu lập trước nhưng duyệt SAU ngày kết thúc không lọt vào báo cáo của kỳ đó", async () => {
    mocks.table = [
      slip({ created_at: "2026-11-05T03:00:00Z", duyet_at: "2026-11-12T03:00:00Z" }),
      slip({ created_at: "2026-11-05T03:00:00Z", duyet_at: "2026-11-08T03:00:00Z", so_luong_co_dau: 6 }),
    ];
    const r = await listSoKhoHoaChatDenNgayAction("2026-11-10");
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.map((x) => x.so_luong_co_dau)).toEqual([6]);
  });

  it("ngày gộp kỳ là ngày duyệt theo giờ VN, không phải ngày lập", async () => {
    mocks.table = [
      slip({ created_at: "2026-11-05T03:00:00Z", duyet_at: "2026-11-08T03:00:00Z" }),
      // 2026-11-10 16:30 UTC = 23:30 giờ VN ngày 10 → còn trong ngày kết thúc 10.
      slip({ created_at: "2026-09-01T03:00:00Z", duyet_at: "2026-11-10T16:30:00Z", so_luong_co_dau: 3 }),
    ];
    const r = await listSoKhoHoaChatDenNgayAction("2026-11-10");
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.map((x) => [x.so_luong_co_dau, x.ngay])).toEqual([
      [10, "2026-11-08"],
      [3, "2026-11-10"],
    ]);
  });

  it("mốc cuối ngày: duyệt đúng 00:00 giờ VN ngày kế tiếp thì chưa thuộc ngày kết thúc", async () => {
    mocks.table = [
      slip({ duyet_at: "2026-11-10T16:59:59Z", so_luong_co_dau: 1 }),
      slip({ duyet_at: "2026-11-10T17:00:00Z", so_luong_co_dau: 2 }),
    ];
    const r = await listSoKhoHoaChatDenNgayAction("2026-11-10");
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.map((x) => x.so_luong_co_dau)).toEqual([1]);
  });

  it("phiếu cũ trước HC-C (duyet_at NULL) lấy ngày lập cả khi lọc lẫn khi gộp kỳ", async () => {
    mocks.table = [
      // 2026-11-03 20:00 UTC = 03:00 giờ VN ngày 04.
      slip({ created_at: "2026-11-03T20:00:00Z", duyet_at: null, so_luong_co_dau: 8 }),
      slip({ created_at: "2026-11-12T03:00:00Z", duyet_at: null, so_luong_co_dau: 9 }),
    ];
    const r = await listSoKhoHoaChatDenNgayAction("2026-11-10");
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data).toEqual([
      { dm_hoa_chat_id: DM1, so_luong_co_dau: 8, ly_do_xuat: null, ngay: "2026-11-04" },
    ]);
  });

  it("chỉ lấy phiếu đã duyệt còn hiệu lực; ngày kết thúc sai định dạng thì báo lỗi", async () => {
    mocks.table = [
      slip({ so_luong_co_dau: 1 }),
      slip({ so_luong_co_dau: 2, trang_thai: "CHO_DUYET", duyet_at: null }),
      slip({ so_luong_co_dau: 3, trang_thai: "TU_CHOI", duyet_at: null }),
      slip({ so_luong_co_dau: 4, is_active: false }),
    ];
    const ok = await listSoKhoHoaChatDenNgayAction("2026-11-10");
    expect(ok.success).toBe(true);
    if (!ok.success) return;
    expect(ok.data.map((x) => x.so_luong_co_dau)).toEqual([1]);
    expect(await listSoKhoHoaChatDenNgayAction("10/11/2026")).toEqual({
      success: false,
      error: "Ngày kết thúc không hợp lệ.",
    });
  });
});
