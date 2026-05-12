/**
 * Types cho MDM Gateway (façade gọi các action danh mục).
 * Tách riêng vì Next.js 16 cấm `"use server"` file export type/interface
 * (chỉ được export async function).
 */

export type MdmGatewayResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type {
  DanhMucStat,
  TrungTamDanhMucStatsPayload,
} from "../danh-muc/actions/danh-muc-hybrid.types";
