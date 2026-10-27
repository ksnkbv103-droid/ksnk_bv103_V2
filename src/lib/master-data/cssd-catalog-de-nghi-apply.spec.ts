import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyCatalogDeNghiOverwrite,
  buildLoaiCatalogUpdatePatch,
  planCatalogBomWrites,
  prepareCatalogBomLines,
} from "./cssd-catalog-de-nghi-apply";
import {
  canClaimCatalogDeNghi,
  canRejectCatalogDeNghi,
} from "@/lib/domain/cssd-catalog-de-nghi";

describe("applyLoai kho dự phòng", () => {
  it("không ghi đè so_luong_kho_du_phong từ snapshot đề nghị", () => {
    const patch = buildLoaiCatalogUpdatePatch(
      {
        ten_loai: "Kéo Mayo",
        so_luong_kho_du_phong: 0,
        is_active: true,
      },
      "2026-09-25T00:00:00.000Z",
    );
    expect(patch.ten_loai).toBe("Kéo Mayo");
    expect(patch.is_active).toBe(true);
    expect(patch).not.toHaveProperty("so_luong_kho_du_phong");
  });
});

describe("S-C claim ordering (pure)", () => {
  it("FAILED không claim lại — tránh double CREATE/THEM_DONG", () => {
    expect(canClaimCatalogDeNghi("APPLY_FAILED")).toBe(false);
    expect(canRejectCatalogDeNghi("APPLY_FAILED")).toBe(true);
  });
});

// ---- KD-1 (N2): dòng thành phần mới ghi đúng specs, kiểm trước khi ghi ----
type Op = { table: string; method: string; payload?: unknown };

/** Mock supabase tối giản: ghi lại insert/update; select trả dữ liệu theo bảng. */
function mockSupabase(readData: Record<string, unknown[]>) {
  const ops: Op[] = [];
  const from = (table: string) => {
    let method = "select";
    let payload: unknown;
    const result = () =>
      method === "select"
        ? { data: readData[table] ?? [], error: null }
        : { data: [{ id: "x" }], error: null };
    const b: Record<string, unknown> = {
      select: () => b,
      insert: (p: unknown) => {
        method = "insert";
        payload = p;
        ops.push({ table, method, payload });
        return b;
      },
      update: (p: unknown) => {
        method = "update";
        payload = p;
        ops.push({ table, method, payload });
        return b;
      },
      eq: () => b,
      in: () => b,
      ilike: () => b,
      limit: () => b,
      maybeSingle: () => Promise.resolve(result()),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve(result()).then(res, rej),
    };
    return b;
  };
  return { client: { from } as unknown as SupabaseClient, ops };
}

const BO = "bo-1";
const LOAI_A = "loai-a";
const LOAI_B = "loai-b";

describe("KD-1 N2 — duyệt đề nghị thêm dòng thành phần", () => {
  it("thêm dòng mới: các trường chi tiết nằm trong specs, không ghi cột lạ", async () => {
    const { client, ops } = mockSupabase({ cssd_dm_bo_dung_cu_chi_tiet: [] });
    await applyCatalogDeNghiOverwrite(client, {
      kind: "BOM",
      targetId: BO,
      targetMa: "B1",
      payloadAfter: {
        lines: [
          {
            op: "UPSERT",
            loaiDungCuId: LOAI_A,
            maChiTiet: "dc-01",
            tenDungCuLe: "Kéo Mayo",
            soLuong: 2,
            maxSudsCount: 50,
            trongLuong: "12,5",
          },
        ],
      },
    });
    const inserts = ops.filter((o) => o.method === "insert");
    expect(inserts).toHaveLength(1);
    const row = inserts[0]!.payload as Record<string, unknown>;
    expect(row).not.toHaveProperty("max_suds_count");
    expect(row).not.toHaveProperty("trong_luong");
    expect(row).not.toHaveProperty("ma_chi_tiet");
    expect(row.specs).toEqual({ ma_chi_tiet: "DC-01", max_suds_count: 50, trong_luong: 12.5 });
    expect(row.ten_dung_cu_le).toBe("Kéo Mayo");
    expect(row.so_luong).toBe(2);
    expect(row.bo_dung_cu_id).toBe(BO);
  });

  it("cập nhật dòng có sẵn: gộp specs cũ, không ghi đè mất khóa", () => {
    const prep = prepareCatalogBomLines([
      { op: "UPSERT", chiTietId: "ct-1", loaiDungCuId: LOAI_A, tenDungCuLe: "Kẹp", soLuong: 3, maxSudsCount: 80 },
    ]);
    if (!prep.ok) throw new Error(prep.error);
    const plan = planCatalogBomWrites(
      BO,
      prep.lines,
      [{ id: "ct-1", loai_dung_cu_id: LOAI_A, is_active: true, specs: { ma_chi_tiet: "DC-OLD", ma_qr_mau: "Q" } }],
      "t",
      () => "DC-NEW",
    );
    if (!plan.ok) throw new Error(plan.error);
    expect(plan.writes).toHaveLength(1);
    const w = plan.writes[0]!;
    expect(w.type).toBe("update");
    if (w.type !== "update") return;
    expect(w.patch.specs).toEqual({ ma_chi_tiet: "DC-OLD", ma_qr_mau: "Q", max_suds_count: 80 });
  });

  it("số lượng 0 hoặc tên rỗng → từ chối, không ghi dòng nào (kể cả dòng hợp lệ trước đó)", async () => {
    for (const bad of [
      { op: "UPSERT" as const, loaiDungCuId: LOAI_B, tenDungCuLe: "Panh", soLuong: 0 },
      { op: "UPSERT" as const, loaiDungCuId: LOAI_B, tenDungCuLe: "  ", soLuong: 1 },
    ]) {
      const { client, ops } = mockSupabase({ cssd_dm_bo_dung_cu_chi_tiet: [] });
      await expect(
        applyCatalogDeNghiOverwrite(client, {
          kind: "BOM",
          targetId: BO,
          targetMa: "B1",
          payloadAfter: {
            lines: [{ op: "UPSERT", loaiDungCuId: LOAI_A, tenDungCuLe: "Kéo", soLuong: 1 }, bad],
          },
        }),
      ).rejects.toThrow(/Dòng 2/);
      expect(ops).toHaveLength(0);
    }
  });

  it("đổi loại dòng sang loại bộ đã có dòng active → từ chối trước khi ghi", () => {
    const prep = prepareCatalogBomLines([
      { op: "UPSERT", chiTietId: "ct-1", loaiDungCuId: LOAI_B, tenDungCuLe: "Kéo", soLuong: 1 },
    ]);
    if (!prep.ok) throw new Error(prep.error);
    const plan = planCatalogBomWrites(
      BO,
      prep.lines,
      [
        { id: "ct-1", loai_dung_cu_id: LOAI_A, is_active: true, specs: {} },
        { id: "ct-2", loai_dung_cu_id: LOAI_B, is_active: true, specs: {} },
      ],
      "t",
      () => "DC-NEW",
    );
    expect(plan.ok).toBe(false);
  });
});
