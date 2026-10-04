import type { SupabaseClient } from "@supabase/supabase-js";
import { CSSD_ROUTES } from "@/lib/cssd-routes";
import { isMeMaLoScan } from "@/modules/cssd-erp/lib/me-tiet-khuan-qc";
import { pickCssdCycleBySurgeryDate } from "@/lib/domain/cssd-nkbv-cycle-pick";
import {
  resolveCssdCodeForNkbvHistory,
  resolveCssdCodeWithClient,
} from "@/modules/cssd-erp/shared/application/cssd-qr-hub";

export type CssdQuyTrinhLink = {
  quy_trinh_id: string;
  lo_tiet_khuan_id: string | null;
  ma_qr: string;
  ten_bo: string | null;
  /** ME-06: không tra được mẻ theo ngày PT / mã. */
  chua_xac_dinh_me?: boolean;
};

type WorkflowRow = {
  id: string;
  ma_qr_quy_trinh?: string | null;
  ma_cycle_qr?: string | null;
  lo_tiet_khuan_id?: string | null;
  ten_bo?: string | null;
  bo_dung_cu_id?: string | null;
  thoi_gian_cap_phat?: string | null;
  used_clinically_at?: string | null;
  is_active?: boolean | null;
};

function toLink(data: WorkflowRow, fallbackMa: string, chua?: boolean): CssdQuyTrinhLink {
  return {
    quy_trinh_id: String(data.id),
    lo_tiet_khuan_id: data.lo_tiet_khuan_id ? String(data.lo_tiet_khuan_id) : null,
    ma_qr: String(data.ma_cycle_qr || data.ma_qr_quy_trinh || fallbackMa),
    ten_bo: data.ten_bo != null ? String(data.ten_bo) : null,
    ...(chua ? { chua_xac_dinh_me: true } : {}),
  };
}

async function loadWorkflowById(
  supabase: SupabaseClient,
  id: string,
): Promise<WorkflowRow | null> {
  const { data, error } = await supabase
    .from("v_cssd_quy_trinh_full")
    .select(
      "id, ma_qr_quy_trinh, ma_cycle_qr, lo_tiet_khuan_id, ten_bo, bo_dung_cu_id, thoi_gian_cap_phat, used_clinically_at, is_active",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data?.id) return null;
  return data as WorkflowRow;
}

async function pickFromBoCandidates(
  supabase: SupabaseClient,
  boId: string,
  surgeryDateYmd: string | null | undefined,
): Promise<CssdQuyTrinhLink | null> {
  const { data, error } = await supabase
    .from("v_cssd_quy_trinh_full")
    .select(
      "id, ma_qr_quy_trinh, ma_cycle_qr, lo_tiet_khuan_id, ten_bo, bo_dung_cu_id, thoi_gian_cap_phat, used_clinically_at, is_active",
    )
    .eq("bo_dung_cu_id", boId)
    .not("lo_tiet_khuan_id", "is", null)
    .order("thoi_gian_cap_phat", { ascending: false })
    .limit(40);
  if (error || !data?.length) return null;
  const rows = data as WorkflowRow[];
  if (surgeryDateYmd) {
    const pick = pickCssdCycleBySurgeryDate(
      rows.map((r) => ({
        id: String(r.id),
        thoiGianCapPhat: r.thoi_gian_cap_phat ?? null,
        usedClinicallyAt: r.used_clinically_at ?? null,
      })),
      surgeryDateYmd,
    );
    if (pick) {
      const row = rows.find((r) => String(r.id) === pick.id);
      if (row) return toLink(row, String(row.ma_cycle_qr || row.ma_qr_quy_trinh || ""));
    }
    return null;
  }
  const active = rows.find((r) => r.is_active !== false) || rows[0];
  return active ? toLink(active, String(active.ma_cycle_qr || active.ma_qr_quy_trinh || "")) : null;
}

/**
 * ME-06: resolve mã bộ / mã chu trình (kể cả inactive) / mã mẻ + optional ngày phẫu thuật.
 */
export async function resolveCssdQuyTrinhLinkFromMaQr(
  supabase: SupabaseClient,
  maQrRaw: string,
  opts?: { surgeryDateYmd?: string | null },
): Promise<CssdQuyTrinhLink | null> {
  const ma_qr = String(maQrRaw || "").trim().toUpperCase();
  if (!ma_qr) return null;
  const surgery = String(opts?.surgeryDateYmd || "").trim().slice(0, 10) || null;

  /** Mã mẻ `<MAY>-ddMMyy-n` */
  if (isMeMaLoScan(ma_qr)) {
    const { data: me } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select("id")
      .eq("ma_lo_tiet_khuan", ma_qr)
      .maybeSingle();
    if (me?.id) {
      const { data: members } = await supabase
        .from("v_cssd_quy_trinh_full")
        .select(
          "id, ma_qr_quy_trinh, ma_cycle_qr, lo_tiet_khuan_id, ten_bo, thoi_gian_cap_phat, used_clinically_at, is_active",
        )
        .eq("lo_tiet_khuan_id", me.id)
        .limit(20);
      const rows = (members || []) as WorkflowRow[];
      if (surgery && rows.length) {
        const pick = pickCssdCycleBySurgeryDate(
          rows.map((r) => ({
            id: String(r.id),
            thoiGianCapPhat: r.thoi_gian_cap_phat ?? null,
            usedClinicallyAt: r.used_clinically_at ?? null,
          })),
          surgery,
        );
        const row = pick ? rows.find((r) => String(r.id) === pick.id) : rows[0];
        if (row) return toLink(row, ma_qr);
      }
      if (rows[0]) return toLink({ ...rows[0], lo_tiet_khuan_id: String(me.id) }, ma_qr);
      return {
        quy_trinh_id: "",
        lo_tiet_khuan_id: String(me.id),
        ma_qr,
        ten_bo: null,
      };
    }
  }

  let resolved;
  try {
    resolved = surgery
      ? await resolveCssdCodeForNkbvHistory(supabase, ma_qr)
      : await resolveCssdCodeWithClient(supabase, ma_qr);
  } catch {
    try {
      resolved = await resolveCssdCodeForNkbvHistory(supabase, ma_qr);
    } catch {
      return null;
    }
  }

  if (resolved.targetType === "STERILIZATION_BATCH" && resolved.batchId) {
    const { data: members } = await supabase
      .from("v_cssd_quy_trinh_full")
      .select(
        "id, ma_qr_quy_trinh, ma_cycle_qr, lo_tiet_khuan_id, ten_bo, thoi_gian_cap_phat, used_clinically_at, is_active",
      )
      .eq("lo_tiet_khuan_id", resolved.batchId)
      .limit(20);
    const rows = (members || []) as WorkflowRow[];
    if (surgery && rows.length) {
      const pick = pickCssdCycleBySurgeryDate(
        rows.map((r) => ({
          id: String(r.id),
          thoiGianCapPhat: r.thoi_gian_cap_phat ?? null,
          usedClinicallyAt: r.used_clinically_at ?? null,
        })),
        surgery,
      );
      const row = pick ? rows.find((r) => String(r.id) === pick.id) : null;
      if (row) return toLink(row, ma_qr);
    }
    if (rows[0]) return toLink({ ...rows[0], lo_tiet_khuan_id: resolved.batchId }, ma_qr);
    return {
      quy_trinh_id: "",
      lo_tiet_khuan_id: resolved.batchId,
      ma_qr,
      ten_bo: null,
    };
  }

  if (resolved.targetType === "INSTRUMENT_SET") {
    if (resolved.workflowId && !surgery) {
      const row = await loadWorkflowById(supabase, resolved.workflowId);
      if (row) return toLink(row, ma_qr);
    }
    const boId = resolved.boDungCuId || (await loadWorkflowById(supabase, resolved.workflowId || ""))?.bo_dung_cu_id;
    if (boId) {
      const picked = await pickFromBoCandidates(supabase, String(boId), surgery);
      if (picked) return picked;
      return {
        quy_trinh_id: resolved.workflowId || "",
        lo_tiet_khuan_id: null,
        ma_qr,
        ten_bo: null,
        chua_xac_dinh_me: true,
      };
    }
    if (resolved.workflowId) {
      const row = await loadWorkflowById(supabase, resolved.workflowId);
      if (row) return toLink(row, ma_qr, Boolean(surgery));
    }
  }

  return null;
}

export function cssdTraceUrlFromMaQr(maQr: string): string {
  const code = String(maQr || "").trim().toUpperCase();
  if (!code) return CSSD_ROUTES.quyTrinh;
  return `${CSSD_ROUTES.quyTrinh}?tab=trace&qr=${encodeURIComponent(code)}`;
}
