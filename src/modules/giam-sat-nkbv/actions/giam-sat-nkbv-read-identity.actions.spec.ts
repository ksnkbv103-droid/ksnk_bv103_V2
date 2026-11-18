import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * NKBV-034 — năm action đọc có họ tên / mã bệnh án / mã bệnh nhân phải chặn Hội đồng KSNK thuần
 * TRƯỚC mọi truy vấn (M03 cột BGĐ «Xa»; HĐ ≈ BGĐ là giả định chờ PO). Vai khác giữ nguyên hành vi cũ.
 * NKBV-032 đã chặn bốn action census: xem giam-sat-nkbv-list-scope.actions.spec.ts.
 */
const K1 = "11111111-1111-4111-8111-111111111111";
const K2 = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  restriction: { v: { kind: "all" } as { kind: string; khoaId?: string } },
  denied: { v: false },
  row: { v: null as Record<string, unknown> | null },
  inScope: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(async () => {}),
  verifyAnyPermission: vi.fn(async () => {}),
}));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvIdentityScope: async () => ({ restriction: mocks.restriction.v, identityDenied: mocks.denied.v }),
  getNkbvKhoaRestriction: async () => mocks.restriction.v,
  isNkbvBenhAnInScope: (...a: unknown[]) => mocks.inScope(...a),
  NKBV_OUT_OF_SCOPE_ERROR: "OUT_OF_SCOPE",
  NKBV_NO_KHOA_ERROR: "NO_KHOA_CHUNG",
}));
vi.mock("@/lib/supabase-server", () => {
  // Chuỗi truy vấn giả: mọi phương thức trả chính nó; await → rỗng; maybeSingle/single → mocks.row.
  const makeChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = new Proxy(
      {},
      {
        get(_t, prop) {
          if (typeof prop === "symbol") return undefined;
          if (prop === "then") return (res: (v: unknown) => void) => res({ data: [], error: null, count: 0 });
          if (prop === "maybeSingle" || prop === "single") {
            return () => Promise.resolve({ data: mocks.row.v, error: null });
          }
          if (prop === "eq") {
            return (...a: unknown[]) => {
              mocks.eq(...a);
              return chain;
            };
          }
          return () => chain;
        },
      },
    );
    return chain;
  };
  const client = {
    from: (table: string) => {
      mocks.from(table);
      return makeChain();
    },
    rpc: (name: string, args: unknown) => {
      mocks.rpc(name, args);
      return Promise.resolve({ data: { stay: null, lis: [], cases: [], devices: [], manual: [] }, error: null });
    },
  };
  return { createServerSupabaseUserClient: async () => client, createAdminSupabaseClient: () => client };
});

import { verifyPermission } from "@/lib/server-permission";
import { NKBV_HOI_DONG_IDENTITY_DENIED } from "../lib/nkbv-khoa-scope";
import {
  getGiamSatNkbvCaById,
  getNkbvBenhAnByMa,
  getNkbvBenhAnHub,
  listGiamSatNkbvCas,
  listNkbvMedicalRecords,
} from "./giam-sat-nkbv-read.actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.denied.v = false;
  mocks.restriction.v = { kind: "all" };
  mocks.row.v = null;
  mocks.inScope.mockResolvedValue(true);
});

describe("NKBV-034 Hội đồng KSNK thuần: năm action đọc có danh tính bị chặn trước mọi truy vấn", () => {
  beforeEach(() => {
    mocks.denied.v = true;
  });
  const chanTruocTruyVan = () => {
    expect(verifyPermission).toHaveBeenCalledWith("GIAM_SAT_NKBV", "view");
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.inScope).not.toHaveBeenCalled();
  };

  it("listGiamSatNkbvCas", async () => {
    expect(await listGiamSatNkbvCas({ page: 1 })).toEqual({
      success: false,
      error: NKBV_HOI_DONG_IDENTITY_DENIED,
      data: [],
      totalCount: 0,
    });
    chanTruocTruyVan();
  });

  it("getGiamSatNkbvCaById: không trả dòng có họ tên", async () => {
    mocks.row.v = { id: "c1", khoa_ghi_nhan_id: K1, ho_ten_benh_nhan: "Nguyen Van A", ma_benh_nhan: "BN1" };
    expect(await getGiamSatNkbvCaById("c1")).toEqual({ success: false, error: NKBV_HOI_DONG_IDENTITY_DENIED });
    chanTruocTruyVan();
  });

  it("listNkbvMedicalRecords", async () => {
    expect(await listNkbvMedicalRecords({ page: 1 })).toEqual({
      success: false,
      error: NKBV_HOI_DONG_IDENTITY_DENIED,
      data: [],
      totalCount: 0,
    });
    chanTruocTruyVan();
  });

  it("getNkbvBenhAnByMa", async () => {
    expect(await getNkbvBenhAnByMa("BA1")).toEqual({ success: false, error: NKBV_HOI_DONG_IDENTITY_DENIED });
    chanTruocTruyVan();
  });

  it("getNkbvBenhAnHub", async () => {
    expect(await getNkbvBenhAnHub("BA1")).toEqual({ success: false, error: NKBV_HOI_DONG_IDENTITY_DENIED });
    chanTruocTruyVan();
  });
});

describe("NKBV-034 vai khác không bị chặn (giữ hành vi cũ)", () => {
  it("listGiamSatNkbvCas: kind=all truy vấn v_nkbv_su_kien_full, không lọc khoa", async () => {
    const r = await listGiamSatNkbvCas({ page: 1 });
    expect(r.success).toBe(true);
    expect(mocks.from).toHaveBeenCalledWith("v_nkbv_su_kien_full");
    expect(mocks.eq.mock.calls.some((c) => c[0] === "khoa_ghi_nhan_id")).toBe(false);
  });

  it("listGiamSatNkbvCas: kind=khoa lọc khoa của mình", async () => {
    mocks.restriction.v = { kind: "khoa", khoaId: K1 };
    expect((await listGiamSatNkbvCas({ page: 1 })).success).toBe(true);
    expect(mocks.eq).toHaveBeenCalledWith("khoa_ghi_nhan_id", K1);
  });

  // gate-ok: NKBV-045 — kỳ vọng cũ «none → success []» là lỗi (báo «khoa chưa có ca» khi chưa gán khoa); đổi thành lỗi rõ, giữ số expect.
  it("listGiamSatNkbvCas và listNkbvMedicalRecords: kind=none báo lỗi NO_KHOA, không truy vấn", async () => {
    mocks.restriction.v = { kind: "none" };
    expect(await listGiamSatNkbvCas({ page: 1 })).toEqual({ success: false, error: "NO_KHOA_CHUNG", data: [], totalCount: 0 });
    expect(await listNkbvMedicalRecords({ page: 1 })).toEqual({ success: false, error: "NO_KHOA_CHUNG", data: [], totalCount: 0 });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("getGiamSatNkbvCaById: không có phiếu → 'Không tìm thấy phiếu NKBV'", async () => {
    expect(await getGiamSatNkbvCaById("c1")).toEqual({ success: false, error: "Không tìm thấy phiếu NKBV" });
    expect(mocks.from).toHaveBeenCalledWith("v_nkbv_su_kien_full");
  });

  it("getGiamSatNkbvCaById: kind=khoa, phiếu khoa khác → ngoài phạm vi", async () => {
    mocks.restriction.v = { kind: "khoa", khoaId: K1 };
    mocks.row.v = { id: "c1", khoa_ghi_nhan_id: K2, ho_ten_benh_nhan: "X" };
    expect(await getGiamSatNkbvCaById("c1")).toEqual({ success: false, error: "OUT_OF_SCOPE" });
  });

  it("getGiamSatNkbvCaById: kind=khoa, phiếu cùng khoa → trả dữ liệu", async () => {
    mocks.restriction.v = { kind: "khoa", khoaId: K1 };
    mocks.row.v = { id: "c1", khoa_ghi_nhan_id: K1 };
    expect((await getGiamSatNkbvCaById("c1")).success).toBe(true);
  });

  it("listNkbvMedicalRecords: truy vấn nkbv_fact_benh_an; kind=khoa lọc khoa điều trị", async () => {
    mocks.restriction.v = { kind: "khoa", khoaId: K1 };
    expect((await listNkbvMedicalRecords({ page: 1 })).success).toBe(true);
    expect(mocks.from).toHaveBeenCalledWith("nkbv_fact_benh_an");
    expect(mocks.eq).toHaveBeenCalledWith("khoa_dieu_tri_id", K1);
  });

  it("getNkbvBenhAnByMa: đưa restriction vào kiểm phạm vi; trong phạm vi → đọc nkbv_fact_benh_an", async () => {
    mocks.restriction.v = { kind: "khoa", khoaId: K1 };
    expect(await getNkbvBenhAnByMa("BA1")).toEqual({ success: false, error: "Không tìm thấy hồ sơ bệnh án" });
    expect(mocks.inScope).toHaveBeenCalledWith({ kind: "khoa", khoaId: K1 }, "BA1");
    expect(mocks.from).toHaveBeenCalledWith("nkbv_fact_benh_an");
  });

  it("getNkbvBenhAnByMa và getNkbvBenhAnHub: ngoài phạm vi → từ chối, không truy vấn", async () => {
    mocks.inScope.mockResolvedValue(false);
    expect(await getNkbvBenhAnByMa("BA1")).toEqual({ success: false, error: "OUT_OF_SCOPE" });
    expect(await getNkbvBenhAnHub("BA1")).toEqual({ success: false, error: "OUT_OF_SCOPE" });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("getNkbvBenhAnHub: trong phạm vi → gọi fn_nkbv_ba_hub với mã BA", async () => {
    expect(await getNkbvBenhAnHub("BA1")).toEqual({ success: false, error: "Không tìm thấy hồ sơ bệnh án" });
    expect(mocks.rpc).toHaveBeenCalledWith("fn_nkbv_ba_hub", { p_ma_benh_an: "BA1" });
  });
});
