/**
 * Domain 23 / CSSD-L07 / 17 §17.3 / M-23 — `used_clinically` chỉ qua sự kiện tường minh
 * (actor + timestamp). Không suy từ catalog / print CAP_PHAT / chỉ `ma_ca_mo_id`.
 */

import { WORKFLOW_STEPS } from "@/modules/cssd-erp/workflow/domain/cssd-stations";

export const CSSD_USED_CLINICALLY_SOURCES = ["CLINICAL", "MANUAL", "PM", "KHOA_NHAN"] as const;
export type CssdUsedClinicallySource = (typeof CSSD_USED_CLINICALLY_SOURCES)[number];

/** Whitelist trạm SC picker — 17 §17.3 (CAP_PHAT còn IN đến khi used). */
export const SC_PICKER_STATIONS = WORKFLOW_STEPS;

export type CssdUsedClinicallyState = {
  usedClinically: boolean;
  usedClinicallyAt: string | null;
  usedClinicallyBy: string | null;
  usedClinicallySource: CssdUsedClinicallySource | null;
  maCaMoId: string | null;
};

function asRecord(meta: unknown): Record<string, unknown> {
  return meta && typeof meta === "object" && !Array.isArray(meta)
    ? (meta as Record<string, unknown>)
    : {};
}

function readSource(raw: unknown): CssdUsedClinicallySource | null {
  const s = String(raw || "").trim().toUpperCase();
  return (CSSD_USED_CLINICALLY_SOURCES as readonly string[]).includes(s)
    ? (s as CssdUsedClinicallySource)
    : null;
}

/** Đọc cờ + audit từ metadata chu trình (không invent từ ma_ca_mo_id). */
export function parseUsedClinicallyFromMetadata(metadata: unknown): CssdUsedClinicallyState {
  const meta = asRecord(metadata);
  const at = String(meta.used_clinically_at || "").trim() || null;
  const by = String(meta.used_clinically_by || "").trim() || null;
  const flag = meta.used_clinically === true || String(meta.used_clinically || "").trim().toLowerCase() === "true";
  return {
    usedClinically: flag,
    usedClinicallyAt: at,
    usedClinicallyBy: by,
    usedClinicallySource: readSource(meta.used_clinically_source),
    maCaMoId: String(meta.ma_ca_mo_id || "").trim() || null,
  };
}

/**
 * Truth: đã ghi nhận dùng lâm sàng qua event (flag + actor + timestamp).
 * `ma_ca_mo_id` một mình **không** đủ (Domain 23 A — chống invent / C).
 */
export function isCssdCycleUsedClinically(input: {
  usedClinically?: boolean | null;
  usedClinicallyAt?: string | null;
  usedClinicallyBy?: string | null;
  metadata?: unknown;
  /** @deprecated Domain 23 — không dùng làm nguồn used. */
  maCaMoId?: string | null;
}): boolean {
  const fromMeta = input.metadata != null ? parseUsedClinicallyFromMetadata(input.metadata) : null;
  const flag = input.usedClinically ?? fromMeta?.usedClinically ?? false;
  const at = String(input.usedClinicallyAt ?? fromMeta?.usedClinicallyAt ?? "").trim();
  const by = String(input.usedClinicallyBy ?? fromMeta?.usedClinicallyBy ?? "").trim();
  return flag === true && at.length > 0 && by.length > 0;
}

/** Patch metadata sự kiện set used — bắt buộc actor + timestamp. */
export function buildUsedClinicallyMetadataPatch(input: {
  actor: string;
  at?: string | null;
  source: CssdUsedClinicallySource;
  maCaMoId?: string | null;
}): Record<string, unknown> {
  const actor = String(input.actor || "").trim();
  if (!actor) throw new Error("Thiếu actor khi ghi nhận used_clinically.");
  const at = String(input.at || "").trim() || new Date().toISOString();
  const patch: Record<string, unknown> = {
    used_clinically: true,
    used_clinically_at: at,
    used_clinically_by: actor,
    used_clinically_source: input.source,
  };
  const ca = String(input.maCaMoId || "").trim();
  if (ca) patch.ma_ca_mo_id = ca;
  return patch;
}

/** Fallback manual clear — vẫn là event tường minh (actor + timestamp clear audit). */
export function buildClearUsedClinicallyMetadataPatch(input: {
  actor: string;
  at?: string | null;
}): Record<string, unknown> {
  const actor = String(input.actor || "").trim();
  if (!actor) throw new Error("Thiếu actor khi gỡ used_clinically.");
  const at = String(input.at || "").trim() || new Date().toISOString();
  return {
    used_clinically: false,
    used_clinically_at: null,
    used_clinically_by: null,
    used_clinically_source: null,
    used_clinically_cleared_at: at,
    used_clinically_cleared_by: actor,
  };
}

export type ScPickerWorkflowCandidate = { id: string; ok: boolean };

/**
 * Gắn phiếu sự cố vào đúng chu trình picker (mở ∧ 6 trạm ∧ chưa dùng).
 * Luân chuyển không gắn chu trình. Không có chu trình mở → null (sổ tồn theo bộ, không khóa chu trình lệch).
 */
export function resolveScPickerWorkflowId(input: {
  explicitId?: string | null;
  candidates: ScPickerWorkflowCandidate[];
  circulation?: boolean;
}): { quyTrinhId: string | null; error: string | null } {
  if (input.circulation) return { quyTrinhId: null, error: null };
  const explicit = String(input.explicitId || "").trim();
  const open = input.candidates.filter((c) => c.ok && String(c.id || "").trim());
  if (explicit) {
    const hit = input.candidates.find((c) => c.id === explicit);
    if (!hit?.ok) {
      return {
        quyTrinhId: null,
        error: "Chu trình đã chọn không còn mở (đã dùng lâm sàng hoặc ngoài 6 trạm).",
      };
    }
    return { quyTrinhId: explicit, error: null };
  }
  if (open.length === 1) return { quyTrinhId: open[0].id, error: null };
  if (open.length > 1) {
    return {
      quyTrinhId: null,
      error: "Bộ này có nhiều chu trình đang mở — chọn đúng dòng trong danh sách.",
    };
  }
  return { quyTrinhId: null, error: null };
}

/** SC picker §17.3: chu trình mở ∧ tram ∈ 6 ∧ ¬used. */
export function passesScPickerWhitelist(input: {
  isActive?: boolean | null;
  tramHienTai?: string | null;
  metadata?: unknown;
  usedClinically?: boolean | null;
  usedClinicallyAt?: string | null;
  usedClinicallyBy?: string | null;
}): boolean {
  if (input.isActive !== true) return false;
  const tram = String(input.tramHienTai || "").trim().toUpperCase();
  if (!(SC_PICKER_STATIONS as readonly string[]).includes(tram)) return false;
  if (
    isCssdCycleUsedClinically({
      usedClinically: input.usedClinically,
      usedClinicallyAt: input.usedClinicallyAt,
      usedClinicallyBy: input.usedClinicallyBy,
      metadata: input.metadata,
    })
  ) {
    return false;
  }
  return true;
}
