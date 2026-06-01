import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { importViSinhExcel } from "./giam-sat-nkbv-write.actions";
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
      .from("dm_khoa_phong")
      .select("id")
      .eq("is_active", true)
      .limit(1);
    
    khoaId = (khoaData as any)?.[0]?.id || "";

    // Clean old test records
    await sb.from("fact_nkbv_su_kien").delete().in("ma_benh_an", ["BA-TEST-SPEC-777", "BA-TEST-RIT-888"]);
    await sb.from("fact_nkbv_vi_sinh").delete().in("ma_benh_an", ["BA-TEST-SPEC-777", "BA-TEST-RIT-888"]);
    await sb.from("fact_nkbv_benh_an").delete().in("ma_benh_an", ["BA-TEST-SPEC-777", "BA-TEST-RIT-888"]);
  });

  afterAll(async () => {
    if (!sb) return;
    await sb.from("fact_nkbv_su_kien").delete().in("ma_benh_an", ["BA-TEST-SPEC-777", "BA-TEST-RIT-888"]);
    await sb.from("fact_nkbv_vi_sinh").delete().in("ma_benh_an", ["BA-TEST-SPEC-777", "BA-TEST-RIT-888"]);
    await sb.from("fact_nkbv_benh_an").delete().in("ma_benh_an", ["BA-TEST-SPEC-777", "BA-TEST-RIT-888"]);
  });

  it("successfully imports cấy positive LIS records, auto-creates stays and infection event records", async () => {
    const testRecords = [
      {
        ma_benh_nhan: "PID-TEST-SPEC-777",
        ma_benh_an: "BA-TEST-SPEC-777",
        ma_benh_pham: "BP-TEST-UTI",
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
    expect(result.createdCasesCount).toBe(2);

    // Verify stays created
    const { data: stayData } = await sb
      .from("fact_nkbv_benh_an")
      .select("*")
      .eq("ma_benh_an", "BA-TEST-SPEC-777")
      .single();
    
    const stay = stayData as any;
    expect(stay).not.toBeNull();
    expect(stay.ma_benh_nhan).toBe("PID-TEST-SPEC-777");
    expect(stay.ho_ten_benh_nhan).toBe("Trần UAT Nhập LIS");

    // Verify database inserts
    const { data: casesData } = await sb
      .from("fact_nkbv_su_kien")
      .select("ma_ca, vi_tri_nhiem_khuan, tac_nhan_vi_khuan, loai_nkbv_id")
      .eq("ma_benh_an", "BA-TEST-SPEC-777");

    const cases = casesData as any[] | null;
    expect(cases).not.toBeNull();
    expect(cases?.length).toBe(2);

    // 1. Urine record must match UTI / Đường tiết niệu
    const utiCase = cases?.find(c => c.vi_tri_nhiem_khuan === "Đường tiết niệu");
    expect(utiCase).toBeDefined();
    expect(utiCase?.tac_nhan_vi_khuan).toBe("Klebsiella pneumoniae");

    // 2. Blood record must match BSI / Máu
    const bsiCase = cases?.find(c => c.vi_tri_nhiem_khuan === "Máu");
    expect(bsiCase).toBeDefined();
    expect(bsiCase?.tac_nhan_vi_khuan).toBe("Staphylococcus aureus");
  });

  it("successfully merges duplicate positive LIS records falling under RIT 14-day window", async () => {
    // 1. Import a first record to create the event
    const recordsFirst = [
      {
        ma_benh_nhan: "PID-TEST-RIT-888",
        ma_benh_an: "BA-TEST-RIT-888",
        ma_benh_pham: "BP-TEST-RIT-01",
        ho_ten_benh_nhan: "Trần UAT Nhập LIS RIT",
        ngay_sinh: "1992-05-10",
        gioi_tinh: "Nữ",
        ngay_vao_vien: new Date("2026-05-10T08:00:00Z").toISOString(),
        ngay_lay_mau: new Date("2026-05-13T09:00:00Z").toISOString(),
        khoa_yeu_cau_id: khoaId || undefined,
        loai_benh_pham: "Urine (Nước tiểu)",
        tac_nhan: "Escherichia coli",
        so_luong: "10^5 CFU/ml"
      }
    ];

    const res1 = await importViSinhExcel(recordsFirst);
    expect(res1.success).toBe(true);
    expect(res1.count).toBe(1);
    expect(res1.createdCasesCount).toBe(1);

    // 2. Import a duplicate record for the same stay, same specimen type, 5 days later (within 14-day RIT)
    const recordsSecond = [
      {
        ma_benh_nhan: "PID-TEST-RIT-888",
        ma_benh_an: "BA-TEST-RIT-888",
        ma_benh_pham: "BP-TEST-RIT-02",
        ho_ten_benh_nhan: "Trần UAT Nhập LIS RIT",
        ngay_sinh: "1992-05-10",
        gioi_tinh: "Nữ",
        ngay_vao_vien: new Date("2026-05-10T08:00:00Z").toISOString(),
        ngay_lay_mau: new Date("2026-05-18T10:00:00Z").toISOString(),
        khoa_yeu_cau_id: khoaId || undefined,
        loai_benh_pham: "Urine (Nước tiểu)",
        tac_nhan: "Klebsiella pneumoniae",
        so_luong: "10^6 CFU/ml"
      }
    ];

    const res2 = await importViSinhExcel(recordsSecond);
    expect(res2.success).toBe(true);
    expect(res2.count).toBe(1);
    expect(res2.createdCasesCount).toBe(0); // 0 new cases created because it falls under RIT!

    // 3. Verify the existing event is updated and contains both pathogens
    const { data: casesData } = await sb
      .from("fact_nkbv_su_kien")
      .select("ma_ca, tac_nhan_vi_khuan, clinical_notes")
      .eq("ma_benh_an", "BA-TEST-RIT-888");

    expect(casesData).not.toBeNull();
    const cleanCases = casesData as any[];
    
    // There should be only 1 event created for this urine/stay
    const matchedCase = cleanCases.find(c => c.ma_ca.includes("BP-TEST-RIT-01"));
    expect(matchedCase).toBeDefined();
    
    // Pathogen must be merged/appended
    expect(matchedCase.tac_nhan_vi_khuan).toContain("Escherichia coli");
    expect(matchedCase.tac_nhan_vi_khuan).toContain("Klebsiella pneumoniae");
    expect(matchedCase.clinical_notes?.tom_tat_dien_bien).toContain("[RIT Gộp mẫu]");
  });
});
