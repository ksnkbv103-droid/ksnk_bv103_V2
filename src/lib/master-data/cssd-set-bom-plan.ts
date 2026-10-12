/**
 * Lập kế hoạch áp phiếu rà soát bộ (thuần, không Supabase) — lát KD-1.
 * Mô phỏng toàn bộ dòng trên ảnh BOM hiện có; vi phạm luật 1 bộ × 1 loại active (D6),
 * số lượng, tên → lỗi TRƯỚC khi ghi bất cứ gì.
 */
import type { SetReconcileLineInput } from "@/lib/domain/cssd-set-reconcile";

export type SetBomRow = { id: string; loai_dung_cu_id: string | null; so_luong: number | null };

export type SetBomStep =
  | { kind: "CHUAN"; chiTietId: string; soLuong: number; label: string }
  | { kind: "XOA"; chiTietId: string; label: string }
  | { kind: "DOI_LOAI"; chiTietId: string; currentLoaiId: string; targetLoaiId: string; ten: string; label: string }
  | { kind: "THEM"; loaiId: string; ten: string; soLuong: number; label: string };

export type SetBomWrite =
  | { type: "deactivate"; id: string }
  | { type: "update"; id: string; patch: { so_luong?: number; loai_dung_cu_id?: string; ten?: string } }
  | { type: "insert"; loaiId: string; ten: string; soLuong: number };

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function intOf(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : NaN;
}

/** Kiểm từng dòng phiếu (không đọc DB): mã dòng, số lượng ≥ 1, tên, trùng dòng. */
export function prevalidateSetBomLines(lines: SetReconcileLineInput[]): string | null {
  const seen = new Set<string>();
  for (const line of lines) {
    const label = String(line.tenDungCuLe || "").trim() || "Dòng";
    const id = String(line.chiTietId || "").trim();
    if (line.kind === "DOI_CHUAN" || line.kind === "DOI_LOAI" || line.kind === "XOA_DONG") {
      if (!id) return `${label}: thiếu dòng thành phần.`;
      if (seen.has(id)) return `${label}: một dòng thành phần có nhiều đề nghị trong cùng phiếu.`;
      seen.add(id);
    }
    if (line.kind === "DOI_CHUAN" && !(intOf(line.soLuongChuanDeXuat) >= 1)) {
      return `${label}: số chuẩn đề nghị phải ≥ 1.`;
    }
    if (line.kind === "DOI_LOAI") {
      if (!String(line.loaiDungCuId || "").trim()) return `${label}: thiếu loại hiện tại.`;
      if (!String(line.maLoaiDeXuat || "").trim() && !String(line.loaiDungCuIdDeXuat || "").trim()) {
        return `${label}: thiếu mã loại đề nghị.`;
      }
    }
    if (line.kind === "THEM_DONG") {
      if (!String(line.loaiDungCuId || "").trim()) return `${label}: thêm dòng cần loại dụng cụ.`;
      if (!String(line.tenDungCuLe || "").trim()) return "Thêm dòng cần tên dụng cụ.";
      if (!(intOf(line.soLuongChuan) >= 1)) return `${label}: thêm dòng cần số chuẩn ≥ 1.`;
    }
  }
  return null;
}

type RowState = { loai: string; qty: number; active: boolean; ten?: string };

/**
 * Mô phỏng các bước trên ảnh dòng active của bộ, trả danh sách ghi theo thứ tự an toàn với
 * unique index `uq_cssd_bom_chi_tiet_bo_loai_active`: xóa mềm → sửa không đổi loại → đổi loại → thêm.
 * DOI_LOAI sang loại đã có dòng active: GỘP (cộng số lượng vào dòng đích, tắt dòng nguồn).
 */
export function planSetBomWrites(rows: SetBomRow[], steps: SetBomStep[]): Result<SetBomWrite[]> {
  const init = new Map<string, RowState>();
  for (const r of rows) {
    init.set(String(r.id), {
      loai: String(r.loai_dung_cu_id || "").trim(),
      qty: Math.max(0, intOf(r.so_luong) || 0),
      active: true,
    });
  }
  const state = new Map<string, RowState>([...init].map(([k, v]) => [k, { ...v }]));
  const added: { loaiId: string; ten: string; soLuong: number }[] = [];
  const holderOf = (loai: string, except?: string) => {
    for (const [id, s] of state) if (s.active && s.loai === loai && id !== except) return id;
    return null;
  };

  for (const st of steps) {
    if (st.kind === "THEM") {
      const holder = holderOf(st.loaiId);
      if (holder) state.get(holder)!.qty += st.soLuong;
      else {
        const prev = added.find((a) => a.loaiId === st.loaiId);
        if (prev) prev.soLuong += st.soLuong;
        else added.push({ loaiId: st.loaiId, ten: st.ten, soLuong: st.soLuong });
      }
      continue;
    }
    const row = state.get(st.chiTietId);
    if (!row?.active) return { ok: false, error: `${st.label}: dòng không còn trong bộ (đã đổi trong lúc chờ duyệt).` };
    if (st.kind === "CHUAN") row.qty = st.soLuong;
    else if (st.kind === "XOA") row.active = false;
    else {
      if (row.loai !== st.currentLoaiId) {
        return { ok: false, error: `${st.label}: loại của dòng đã đổi trong lúc chờ duyệt — lập phiếu mới.` };
      }
      if (st.targetLoaiId === row.loai) {
        row.ten = st.ten;
        continue;
      }
      const dest = holderOf(st.targetLoaiId, st.chiTietId);
      if (dest) {
        state.get(dest)!.qty += row.qty;
        row.active = false;
      } else if (added.some((a) => a.loaiId === st.targetLoaiId)) {
        return { ok: false, error: `${st.label}: loại đích đang được thêm mới trong cùng phiếu.` };
      } else {
        row.loai = st.targetLoaiId;
        row.ten = st.ten;
      }
    }
  }

  for (const a of added) {
    if (holderOf(a.loaiId)) return { ok: false, error: "Thêm dòng trùng loại đã có trong bộ." };
  }

  const deactivate: SetBomWrite[] = [];
  const sameLoai: SetBomWrite[] = [];
  const relink: SetBomWrite[] = [];
  for (const [id, s] of state) {
    const o = init.get(id)!;
    if (!s.active) {
      deactivate.push({ type: "deactivate", id });
      continue;
    }
    const patch: { so_luong?: number; loai_dung_cu_id?: string; ten?: string } = {};
    if (s.qty !== o.qty) patch.so_luong = s.qty;
    if (s.ten !== undefined) patch.ten = s.ten;
    if (s.loai !== o.loai) {
      patch.loai_dung_cu_id = s.loai;
      relink.push({ type: "update", id, patch });
    } else if (Object.keys(patch).length) {
      sameLoai.push({ type: "update", id, patch });
    }
  }
  // Đổi chéo loại giữa hai dòng: ghi tuần tự sẽ chạm unique index — chặn, tách hai phiếu.
  for (const w of relink) {
    if (w.type !== "update") continue;
    const target = w.patch.loai_dung_cu_id!;
    const prevHolder = [...init].find(([id, o]) => o.loai === target && state.get(id)!.active && id !== w.id);
    if (prevHolder) return { ok: false, error: "Phiếu đổi chéo loại giữa hai dòng — tách thành hai phiếu." };
  }
  return {
    ok: true,
    value: [
      ...deactivate,
      ...sameLoai,
      ...relink,
      ...added.map((a) => ({ type: "insert" as const, ...a })),
    ],
  };
}
