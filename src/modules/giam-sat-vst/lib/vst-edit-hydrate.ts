import { ACTIONS, MOMENTS, isVstMissedAction, type ActionType, type MomentType } from "./vst-constants";
import {
  createDefaultVSTFormPersons,
  createNewOpp,
  VST_MAX_PERSONS_NEW,
  type VSTFormPerson,
} from "./vst-form-model";

export type VstHydrateObservation = {
  id?: string;
  nhan_vien_id?: string | null;
  ten_nhan_vien_ngoai?: string | null;
  nghe_nghiep_id?: string | null;
  hanh_dong?: string | null;
  thoi_diem?: string | null;
  dung_ky_thuat?: boolean | null;
  du_thoi_gian?: boolean | null;
  co_deo_gang?: boolean | null;
};

/** Tách thời điểm đã lưu — không cắt (VST-02). */
export function splitMomentsNoTrim(raw: unknown): MomentType[] {
  const tokens = String(raw ?? "")
    .split(/\s*,\s*/g)
    .map((x) => x.trim())
    .filter(Boolean);
  return tokens.map((t) => MOMENTS.find((m) => m === t)).filter(Boolean) as MomentType[];
}

function parseAction(hanhDong: unknown): ActionType | null {
  const v = String(hanhDong ?? "").trim();
  if (!v) return null;
  return (ACTIONS as readonly string[]).includes(v) ? (v as ActionType) : null;
}

/**
 * Nạp form sửa: đủ mọi người (không slice 3), đủ mọi thời điểm (không cắt).
 * Trả thêm số người legacy >3 để UI cảnh báo.
 */
export function hydrateVstPersonsFromObservations(
  observations: VstHydrateObservation[],
): { persons: VSTFormPerson[]; legacyPersonCount: number | null } {
  const byPerson = new Map<
    string,
    {
      nhan_vien_id: string;
      ten_manual: string;
      is_manual: boolean;
      nghe_nghiep_id: string;
      opps: VstHydrateObservation[];
    }
  >();

  for (const row of observations) {
    const byNv = String(row.nhan_vien_id ?? "").trim();
    const byName = String(row.ten_nhan_vien_ngoai ?? "").trim();
    const personKey = byNv || byName || "__MISSING_PERSON__";
    if (!byPerson.has(personKey)) {
      byPerson.set(personKey, {
        nhan_vien_id: byNv,
        ten_manual: byName,
        is_manual: Boolean(byName),
        nghe_nghiep_id: String(row.nghe_nghiep_id ?? "").trim(),
        opps: [],
      });
    }
    byPerson.get(personKey)!.opps.push(row);
  }

  const groupEntries = Array.from(byPerson.entries());
  const colCount = Math.max(VST_MAX_PERSONS_NEW, groupEntries.length);
  const basePersons = createDefaultVSTFormPersons(colCount);

  for (let idx = 0; idx < groupEntries.length; idx++) {
    const [, group] = groupEntries[idx]!;
    const nextOpps = group.opps.map((row, oIdx) => {
      const action = parseAction(row.hanh_dong);
      const missed = isVstMissedAction(action);
      return {
        id: String(row.id ?? `${idx}-${oIdx}`),
        thoi_diems: splitMomentsNoTrim(row.thoi_diem),
        hanh_dong: action,
        dung_ky_thuat: missed ? null : typeof row.dung_ky_thuat === "boolean" ? row.dung_ky_thuat : null,
        du_thoi_gian: missed ? null : typeof row.du_thoi_gian === "boolean" ? row.du_thoi_gian : null,
        co_deo_gang: missed ? (typeof row.co_deo_gang === "boolean" ? row.co_deo_gang : null) : null,
        isCollapsed: true as const,
      };
    });
    basePersons[idx] = {
      ...basePersons[idx]!,
      nhan_vien_id: group.nhan_vien_id,
      is_manual: group.is_manual,
      ten_manual: group.ten_manual,
      nghe_nghiep_id: group.nghe_nghiep_id,
      opportunities: nextOpps.length ? [...nextOpps, createNewOpp()] : basePersons[idx]!.opportunities,
    };
  }

  return {
    persons: basePersons,
    legacyPersonCount: groupEntries.length > VST_MAX_PERSONS_NEW ? groupEntries.length : null,
  };
}

/** VST-03: % kỹ thuật phiếu WHO — mẫu = ô đã đánh giá (không tính NULL là đúng). */
export function whoTechniqueRateFromAssessed(
  dung: number,
  danhGia: number,
): number | null {
  if (danhGia <= 0) return null;
  return Math.round((dung / danhGia) * 1000) / 10;
}
