import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * VST-030 — sau RLS VST-023 (20261114170000) user client đọc v_gstt_giam_sat_chung_sessions_full trả 0 dòng cho Hội đồng
 * (và Hội đồng + vai không rộng). MDRO/RCA chỉ lấy cờ «đã giám sát» / số phiên / ngày từ view đó, nên phải đọc bằng admin
 * client (phạm vi khoa vẫn ép ở bước đọc người bệnh); bảng nkbv_* giữ nguyên client cũ (RLS NKBV là lớp chặn riêng).
 */
const GSC_VIEW = "v_gstt_giam_sat_chung_sessions_full";

const mocks = vi.hoisted(() => ({
  calls: [] as Array<{ client: "user" | "admin"; table: string; eq: Array<[string, unknown]> }>,
  gscRows: [] as Array<Record<string, unknown>>,
  identityDenied: false,
}));

vi.mock("@/lib/server-permission", () => ({ verifyAnyPermission: vi.fn(async () => {}) }));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvCensusAccess: async () => ({
    restriction: { kind: "khoa", khoaId: "K1" },
    viaGscOnly: false,
    identityDenied: mocks.identityDenied,
  }),
  NKBV_GSC_NO_KHOA_ERROR: "NO_KHOA",
}));
vi.mock("@/lib/supabase-server", () => {
  const stay = { ma_benh_an: "BA1", ma_benh_nhan: "P1", ho_ten_benh_nhan: "Bệnh nhân thử", ngay_vao_vien: "2026-11-01", khoa_dieu_tri_id: "K1" };
  const data = (client: "user" | "admin", table: string): Array<Record<string, unknown>> => {
    if (table === "nkbv_fact_benh_an") return [stay];
    if (table === "nkbv_fact_vi_sinh") return [{ ma_benh_an: "BA1", mdro_phenotype: null, ngay_lay_mau: "2026-11-10" }];
    // Mô phỏng RLS VST-023: user client không đọc được phiên GSC; admin client (service_role) đọc được.
    if (table === "v_gstt_giam_sat_chung_sessions_full") return client === "admin" ? mocks.gscRows : [];
    return [];
  };
  const makeClient = (client: "user" | "admin") => ({
    from: (table: string) => {
      const entry = { client, table, eq: [] as Array<[string, unknown]> };
      mocks.calls.push(entry);
      const chain: Record<string, unknown> = new Proxy(
        {},
        {
          get(_t, prop) {
            if (typeof prop === "symbol") return undefined;
            if (prop === "eq") return (col: string, val: unknown) => (entry.eq.push([col, val]), chain);
            if (prop === "then") return (res: (v: unknown) => void) => res({ data: data(client, table), error: null });
            return () => chain;
          },
        },
      );
      return chain;
    },
  });
  return {
    createServerSupabaseUserClient: async () => makeClient("user"),
    createAdminSupabaseClient: () => makeClient("admin"),
  };
});

import { GSC_BK_ISOLATION, GSC_BK_MDRO } from "../lib/nkbv-mdro";
import { listMdroInpatientsByKhoa } from "./giam-sat-nkbv-mdro.actions";
import { listNkbvPatientRcaByKhoa } from "./giam-sat-nkbv-rca.actions";

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.identityDenied = false;
  mocks.gscRows = [
    { ma_benh_an: "BA1", ma_nguoi_benh: "P1", loai_bang_kiem: GSC_BK_MDRO, ngay_giam_sat: "2026-11-12" },
    { ma_benh_an: "BA1", ma_nguoi_benh: "P1", loai_bang_kiem: GSC_BK_ISOLATION, ngay_giam_sat: "2026-11-13" },
  ];
});

const gscReads = () => mocks.calls.filter((c) => c.table === GSC_VIEW);

describe("VST-030: MDRO/RCA đọc phiên GSC bằng admin client", () => {
  it("listMdroInpatientsByKhoa: cờ giám sát/cách ly đúng, view GSC không đọc bằng user client", async () => {
    const res = await listMdroInpatientsByKhoa({ khoaId: "K1" });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.has_mdro_supervision).toBe(true);
    expect(res.data[0]?.has_isolation_checklist).toBe(true);
    expect(gscReads().length).toBeGreaterThan(0);
    expect(gscReads().every((c) => c.client === "admin")).toBe(true);
    // nkbv_* giữ nguyên client cũ (không viaGscOnly → user client).
    expect(mocks.calls.filter((c) => c.table.startsWith("nkbv_")).every((c) => c.client === "user")).toBe(true);
  });

  it("listNkbvPatientRcaByKhoa: số phiên GSC và ngày gần nhất đúng, view GSC không đọc bằng user client", async () => {
    const res = await listNkbvPatientRcaByKhoa({ khoaId: "K1" });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.gsc_session_count).toBe(2);
    expect(res.data[0]?.has_mdro_bk).toBe(true);
    expect(res.data[0]?.has_isolation_bk).toBe(true);
    expect(res.data[0]?.latest_gsc_ngay).toBe("2026-11-13");
    expect(gscReads().length).toBeGreaterThan(0);
    expect(gscReads().every((c) => c.client === "admin")).toBe(true);
    expect(mocks.calls.filter((c) => c.table.startsWith("nkbv_")).every((c) => c.client === "user")).toBe(true);
    // Admin client bỏ RLS nên phạm vi khoa phải do chính câu truy vấn ép.
    expect(gscReads().every((c) => c.eq.some(([col, val]) => col === "khoa_id" && val === "K1"))).toBe(true);
  });

  it("identityDenied (Hội đồng thuần, NKBV-032): dừng trước mọi truy vấn, không đọc view GSC bằng admin client", async () => {
    mocks.identityDenied = true;
    const rca = await listNkbvPatientRcaByKhoa({ khoaId: "K1" });
    const mdro = await listMdroInpatientsByKhoa({ khoaId: "K1" });
    expect(rca.success).toBe(false);
    expect(mdro.success).toBe(false);
    expect(mocks.calls).toHaveLength(0);
  });
});
