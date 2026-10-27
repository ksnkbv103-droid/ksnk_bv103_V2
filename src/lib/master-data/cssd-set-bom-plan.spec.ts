import { describe, expect, it } from "vitest";
import type { SetReconcileLineInput } from "@/lib/domain/cssd-set-reconcile";
import { planSetBomWrites, prevalidateSetBomLines, type SetBomRow } from "./cssd-set-bom-plan";

const rows: SetBomRow[] = [
  { id: "ct-a", loai_dung_cu_id: "loai-a", so_luong: 2 },
  { id: "ct-b", loai_dung_cu_id: "loai-b", so_luong: 3 },
];

function line(p: Partial<SetReconcileLineInput>): SetReconcileLineInput {
  return { tenDungCuLe: "Kéo", soLuongChuan: 1, soLuongThucTe: 1, soLuongDem: 1, kind: "DOI_CHUAN", ...p };
}

describe("KD-1 C6 — DOI_LOAI gộp trước khi đổi loại", () => {
  it("đổi sang loại đã có trong bộ → cộng số lượng vào dòng đích, tắt dòng nguồn, không UPDATE loại", () => {
    const plan = planSetBomWrites(rows, [
      { kind: "DOI_LOAI", chiTietId: "ct-a", currentLoaiId: "loai-a", targetLoaiId: "loai-b", ten: "Kéo B", label: "Kéo" },
    ]);
    if (!plan.ok) throw new Error(plan.error);
    expect(plan.value).toEqual([
      { type: "deactivate", id: "ct-a" },
      { type: "update", id: "ct-b", patch: { so_luong: 5 } },
    ]);
  });

  it("đổi sang loại chưa có → đổi loại + tên trên dòng nguồn; xóa mềm ghi trước", () => {
    const plan = planSetBomWrites(rows, [
      { kind: "XOA", chiTietId: "ct-b", label: "B" },
      { kind: "DOI_LOAI", chiTietId: "ct-a", currentLoaiId: "loai-a", targetLoaiId: "loai-c", ten: "Kéo C", label: "Kéo" },
    ]);
    if (!plan.ok) throw new Error(plan.error);
    expect(plan.value[0]).toEqual({ type: "deactivate", id: "ct-b" });
    expect(plan.value[1]).toEqual({ type: "update", id: "ct-a", patch: { loai_dung_cu_id: "loai-c", ten: "Kéo C" } });
  });

  it("THEM_DONG trùng loại đang có → cộng số lượng, không chèn dòng mới", () => {
    const plan = planSetBomWrites(rows, [{ kind: "THEM", loaiId: "loai-a", ten: "Kéo", soLuong: 1, label: "Kéo" }]);
    if (!plan.ok) throw new Error(plan.error);
    expect(plan.value).toEqual([{ type: "update", id: "ct-a", patch: { so_luong: 3 } }]);
  });

  it("loại dòng đã đổi trong lúc chờ duyệt → từ chối", () => {
    const plan = planSetBomWrites(rows, [
      { kind: "DOI_LOAI", chiTietId: "ct-a", currentLoaiId: "loai-x", targetLoaiId: "loai-b", ten: "K", label: "Kéo" },
    ]);
    expect(plan.ok).toBe(false);
  });

  it("xóa mềm dòng giữ loại đích rồi đổi loại → hợp lệ (xóa mềm ghi trước)", () => {
    const plan = planSetBomWrites(rows, [
      { kind: "XOA", chiTietId: "ct-b", label: "B" },
      { kind: "DOI_LOAI", chiTietId: "ct-a", currentLoaiId: "loai-a", targetLoaiId: "loai-b", ten: "K", label: "A" },
    ]);
    expect(plan.ok).toBe(true);
  });

  it("dây chuyền đổi loại (B→C rồi A→B) → từ chối, tránh chạm unique index giữa chừng", () => {
    const plan = planSetBomWrites(rows, [
      { kind: "DOI_LOAI", chiTietId: "ct-b", currentLoaiId: "loai-b", targetLoaiId: "loai-c", ten: "C", label: "B" },
      { kind: "DOI_LOAI", chiTietId: "ct-a", currentLoaiId: "loai-a", targetLoaiId: "loai-b", ten: "B", label: "A" },
    ]);
    expect(plan.ok).toBe(false);
  });
});

describe("KD-1 C6 — kiểm trước khi ghi", () => {
  it("số lượng 0 / tên rỗng / thiếu dòng → lỗi", () => {
    expect(prevalidateSetBomLines([line({ kind: "DOI_CHUAN", chiTietId: "ct-a", soLuongChuanDeXuat: 0 })])).toMatch(/≥ 1/);
    expect(prevalidateSetBomLines([line({ kind: "THEM_DONG", loaiDungCuId: "loai-c", soLuongChuan: 0 })])).toMatch(/≥ 1/);
    expect(prevalidateSetBomLines([line({ kind: "THEM_DONG", loaiDungCuId: "loai-c", tenDungCuLe: " " })])).toMatch(
      /tên/,
    );
    expect(prevalidateSetBomLines([line({ kind: "XOA_DONG" })])).toMatch(/thiếu dòng/);
  });

  it("một dòng có hai đề nghị trong cùng phiếu → lỗi", () => {
    expect(
      prevalidateSetBomLines([
        line({ kind: "DOI_CHUAN", chiTietId: "ct-a", soLuongChuanDeXuat: 2 }),
        line({ kind: "XOA_DONG", chiTietId: "ct-a" }),
      ]),
    ).toMatch(/nhiều đề nghị/);
  });

  it("phiếu hợp lệ → null", () => {
    expect(
      prevalidateSetBomLines([
        line({ kind: "DOI_CHUAN", chiTietId: "ct-a", soLuongChuanDeXuat: 4 }),
        line({ kind: "THEM_DONG", loaiDungCuId: "loai-c", soLuongChuan: 1 }),
      ]),
    ).toBeNull();
  });
});
