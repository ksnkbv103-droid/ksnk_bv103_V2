import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { importViSinhExcel } from "./giam-sat-nkbv-import.actions";
import { createClient } from "@supabase/supabase-js";

// Mock Next.js and permission modules to allow running action outside next-server
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  unstable_cache: (fn: any) => fn,
}));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: () => undefined,
    set: () => {},
  }),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(async () => {}),
  verifyPermissions: vi.fn(async () => {}),
  hasRBACAdminSupervisionBypass: vi.fn(async () => true),
}));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const hasIntegrationDb = Boolean(url && serviceKey);

describe.skipIf(!hasIntegrationDb)("importViSinhExcel and automatic case creation tests", () => {
  let sb: ReturnType<typeof createClient>;
  let khoaId = "";

  beforeAll(async () => {
    sb = createClient(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Query active department
    const { data: khoaData } = await sb
      .from("mdm_dm_khoa_phong")
      .select("id")
      .eq("is_active", true)
      .limit(1);
    
    khoaId = (khoaData as any)?.[0]?.id || "";

    // Clean old test records
    await sb.from("nkbv_fact_su_kien").delete().in("ma_benh_an", ["BA-TEST-SPEC-777", "BA-TEST-RIT-888"]);
    await sb.from("nkbv_fact_vi_sinh").delete().in("ma_benh_an", ["BA-TEST-SPEC-777", "BA-TEST-RIT-888"]);
    await sb.from("nkbv_fact_benh_an").delete().in("ma_benh_an", ["BA-TEST-SPEC-777", "BA-TEST-RIT-888"]);
  });

  afterAll(async () => {
    if (!sb) return;
    await sb.from("nkbv_fact_su_kien").delete().in("ma_benh_an", ["BA-TEST-SPEC-777", "BA-TEST-RIT-888"]);
    await sb.from("nkbv_fact_vi_sinh").delete().in("ma_benh_an", ["BA-TEST-SPEC-777", "BA-TEST-RIT-888"]);
    await sb.from("nkbv_fact_benh_an").delete().in("ma_benh_an", ["BA-TEST-SPEC-777", "BA-TEST-RIT-888"]);
  });

  it("successfully imports cấy positive LIS records, auto-creates stays and infection event records", async () => {
    const testRecords = [
      {
        ma_benh_nhan: "PID-TEST-SPEC-777",
        ma_benh_an: "BA-TEST-SPEC-777",
        ma_benh_pham: "BP-TEST-UTI",
        ma_xet_nghiem: "XN-TEST-SPEC-UTI-777",
        ket_qua: "DUONG_TINH" as const,
        ho_ten_benh_nhan: "Trần UAT Nhập LIS",
        ngay_sinh: "1992-05-10",
        gioi_tinh: "Nữ",
        ngay_vao_vien: new Date("2026-05-10T08:00:00Z").toISOString(),
        ngay_lay_mau: new Date("2026-05-13T09:00:00Z").toISOString(),
        khoa_yeu_cau_id: khoaId || undefined,
        loai_benh_pham: "Urine (Nước tiểu)",
        tac_nhan: "Klebsiella pneumoniae"
      },
      {
        ma_benh_nhan: "PID-TEST-SPEC-777",
        ma_benh_an: "BA-TEST-SPEC-777",
        ma_benh_pham: "BP-TEST-BSI",
        ma_xet_nghiem: "XN-TEST-SPEC-BSI-777",
        ket_qua: "DUONG_TINH" as const,
        ho_ten_benh_nhan: "Trần UAT Nhập LIS",
        ngay_sinh: "1992-05-10",
        gioi_tinh: "Nữ",
        ngay_vao_vien: new Date("2026-05-10T08:00:00Z").toISOString(),
        ngay_lay_mau: new Date("2026-05-15T10:00:00Z").toISOString(),
        khoa_yeu_cau_id: khoaId || undefined,
        loai_benh_pham: "Cấy máu (Blood)",
        tac_nhan: "Staphylococcus aureus"
      }
    ];

    const result = await importViSinhExcel(testRecords);
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(result.createdCasesCount).toBe(0); // kho vi sinh không spawn phiếu điều tra

    const { data: stayData } = await sb
      .from("nkbv_fact_benh_an")
      .select("*")
      .eq("ma_benh_an", "BA-TEST-SPEC-777")
      .single();

    const stay = stayData as any;
    expect(stay).not.toBeNull();
    expect(stay.ma_benh_nhan).toBe("PID-TEST-SPEC-777");

    const { data: lisData } = await sb
      .from("nkbv_fact_vi_sinh")
      .select("ma_xet_nghiem, loai_benh_pham, tac_nhan")
      .eq("ma_benh_an", "BA-TEST-SPEC-777")
      .eq("is_active", true);

    const lis = (lisData || []) as Array<{ tac_nhan: string | null }>;
    expect(lis.length).toBe(2);
    expect(lis.some((r) => r.tac_nhan === "Klebsiella pneumoniae")).toBe(true);
    expect(lis.some((r) => r.tac_nhan === "Staphylococcus aureus")).toBe(true);

    const { data: casesData } = await sb
      .from("nkbv_fact_su_kien")
      .select("id")
      .eq("ma_benh_an", "BA-TEST-SPEC-777");
    expect(casesData?.length ?? 0).toBe(0);
  });

  it("does not spawn HAI cases on second LIS import (store-only)", async () => {
    const recordsFirst = [
      {
        ma_benh_nhan: "PID-TEST-RIT-888",
        ma_benh_an: "BA-TEST-RIT-888",
        ma_benh_pham: "BP-TEST-RIT-01",
        ma_xet_nghiem: "XN-TEST-RIT-01",
        ket_qua: "DUONG_TINH" as const,
        ho_ten_benh_nhan: "Trần UAT Nhập LIS RIT",
        ngay_sinh: "1992-05-10",
        gioi_tinh: "Nữ",
        ngay_vao_vien: new Date("2026-05-10T08:00:00Z").toISOString(),
        ngay_lay_mau: new Date("2026-05-13T09:00:00Z").toISOString(),
        khoa_yeu_cau_id: khoaId || undefined,
        loai_benh_pham: "Urine (Nước tiểu)",
        tac_nhan: "Escherichia coli",
        so_luong: "10^5 CFU/ml",
      },
    ];

    const res1 = await importViSinhExcel(recordsFirst);
    expect(res1.success).toBe(true);
    expect(res1.count).toBe(1);
    expect(res1.createdCasesCount).toBe(0);

    const recordsSecond = [
      {
        ma_benh_nhan: "PID-TEST-RIT-888",
        ma_benh_an: "BA-TEST-RIT-888",
        ma_benh_pham: "BP-TEST-RIT-02",
        ma_xet_nghiem: "XN-TEST-RIT-02",
        ket_qua: "DUONG_TINH" as const,
        ho_ten_benh_nhan: "Trần UAT Nhập LIS RIT",
        ngay_sinh: "1992-05-10",
        gioi_tinh: "Nữ",
        ngay_vao_vien: new Date("2026-05-10T08:00:00Z").toISOString(),
        ngay_lay_mau: new Date("2026-05-18T10:00:00Z").toISOString(),
        khoa_yeu_cau_id: khoaId || undefined,
        loai_benh_pham: "Urine (Nước tiểu)",
        tac_nhan: "Klebsiella pneumoniae",
        so_luong: "10^6 CFU/ml",
      },
    ];

    const res2 = await importViSinhExcel(recordsSecond);
    expect(res2.success).toBe(true);
    expect(res2.count).toBe(1);
    expect(res2.createdCasesCount).toBe(0);

    const { data: lisData } = await sb
      .from("nkbv_fact_vi_sinh")
      .select("ma_xet_nghiem, tac_nhan")
      .eq("ma_benh_an", "BA-TEST-RIT-888")
      .eq("is_active", true);
    expect(lisData?.length).toBe(2);

    const { data: casesData } = await sb
      .from("nkbv_fact_su_kien")
      .select("id")
      .eq("ma_benh_an", "BA-TEST-RIT-888");
    expect(casesData?.length ?? 0).toBe(0);
  });
});
