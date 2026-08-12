/**
 * Catalog cột bảng tổng BA — timeline trung tâm nhập liệu;
 * cửa sổ phân tích (Index/IWP/RIT/SBAP) xen giữa TC SSI và Khoa;
 * Kết luận + ghi chú ở cuối (một lần).
 */

import type { SyndromePanelId } from "./nkbv-specimen-syndrome";
import type { BaDayGridColumnDef } from "../components/NkbvBaDayGrid";

/** Cột thiết bị trên bảng chung (thứ tự: CVC → Vent → Foley). */
export const BA_MASTER_DEVICE_IDS = ["ct_cvc", "ct_vent", "ct_foley"] as const;

/** Cột kết luận / ghi chú — luôn đặt sau thiết bị. */
export const BA_MASTER_TAIL_IDS = [
  "ax_ket_luan",
  "ax_ghi_chu",
  "ax_gc",
  "ssi_ket_luan",
  "ssi_ghi_chu",
  "ssi_gc",
  "vae_ket_luan",
  "vae_ghi_chu",
  "master_ket_luan",
] as const;

const TAIL_ID_SET = new Set<string>(BA_MASTER_TAIL_IDS);

/** Cột window phân tích — hiện theo hội chứng đang mở (trước Khoa). */
export const BA_MASTER_WINDOW_IDS_BY_PANEL: Record<
  SyndromePanelId | "CLOSED",
  readonly string[]
> = {
  CLOSED: [],
  UTI: ["ax_index", "ax_ls", "ax_rit", "ax_sbap", "ax_ket_luan", "ax_ghi_chu"],
  PNEU: ["ax_index", "ax_ls", "ax_rit", "ax_sbap", "ax_ket_luan", "ax_ghi_chu"],
  BSI: ["ax_index", "ax_ls", "ax_rit", "ax_sbap", "ax_ket_luan", "ax_ghi_chu"],
  SSI: [
    "ssi_index",
    "ssi_sp",
    "ssi_panel_tc",
    "ssi_sbap",
    "ssi_ket_luan",
    "ssi_ghi_chu",
  ],
  VAE: ["vae_index", "vae_ep", "vae_ket_luan", "vae_ghi_chu"],
};

/** Cột CT phiên cũ — đã chuyển sang bảng chung, luôn lọc bỏ. */
const STRIP_FROM_PANEL = new Set([
  "ax_can_thiep",
  "master_ket_luan", // không nhúng lại từ panel
]);

export function filterPanelAnalysisColumns(
  columns: BaDayGridColumnDef[],
  panel: SyndromePanelId | null,
): BaDayGridColumnDef[] {
  const allow = new Set(
    BA_MASTER_WINDOW_IDS_BY_PANEL[panel || "CLOSED"] as readonly string[],
  );
  return columns.filter((c) => {
    if (STRIP_FROM_PANEL.has(c.id)) return false;
    if (!panel) return false;
    if (allow.has(c.id)) return true;
    if (panel === "SSI" && c.id.startsWith("ssi_")) return true;
    if (panel === "VAE" && c.id.startsWith("vae_")) return true;
    if (
      (panel === "UTI" || panel === "PNEU" || panel === "BSI") &&
      c.id.startsWith("ax_") &&
      c.id !== "ax_can_thiep"
    ) {
      return true;
    }
    return false;
  });
}

/**
 * Tách cột phân tích: cửa sổ (Index…SBAP) vs đuôi (Kết luận + ghi chú).
 * Tránh nhét Kết luận vào giữa / trùng cột master.
 */
export function splitBaAnalysisColumns(columns: BaDayGridColumnDef[]): {
  windowColumns: BaDayGridColumnDef[];
  tailColumns: BaDayGridColumnDef[];
} {
  const windowColumns: BaDayGridColumnDef[] = [];
  const tailColumns: BaDayGridColumnDef[] = [];
  for (const c of columns) {
    if (TAIL_ID_SET.has(c.id)) tailColumns.push(c);
    else windowColumns.push(c);
  }
  return { windowColumns, tailColumns };
}
