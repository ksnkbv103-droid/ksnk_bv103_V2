"use server";

/**
 * Neo phiếu phân tích trên Hub BA từ mốc Index (XN / XQ).
 * Seed verification từ bảng phân tích + đánh dấu XN đã PT.
 */

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyPermission } from "@/lib/server-permission";
import { getNkbvKhoaRestriction, isNkbvBenhAnInScope, NKBV_OUT_OF_SCOPE_ERROR } from "../lib/nkbv-khoa-scope.server";
import { normalizeAndValidateDmKhoaPhong } from "@/lib/master-data/validation";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { resolveMdmLoaiId, type NkbvChecklistTypeCode } from "../lib/nkbv-loai-labels";
import { isNkbvCaTrangThaiChot, resolveKhoaQuyKet } from "../lib/nkbv-ba-ngay";
import { bareViSinhIdFromMilestoneId, resolveViSinhAnalysisStatus, type ViSinhAnalysisDispositionRow } from "../lib/nkbv-vi-sinh-analysis-status";
import { validateBloodLast } from "../lib/nkbv-chrono-precedence";
import type { SyndromePanelId } from "../lib/nkbv-specimen-syndrome";
import type { BaAnalysisSessionDraft } from "../lib/nkbv-ba-analysis-session";
import {
  mapAnalysisSessionToVerificationSeed,
  type BaCdcWindowSeed,
  type BaSeedLabRow,
} from "../lib/nkbv-analysis-session-to-verification";
import { syncNkbvPhieuFromBaNgay } from "./giam-sat-nkbv-ba-ngay.actions";

async function assertCanWriteNkbvAnalysis() {
  try {
    await verifyPermission("GIAM_SAT_NKBV", "create");
  } catch {
    await verifyPermission("GIAM_SAT_NKBV", "edit");
  }
}

const viSinhIdSchema = z.string().trim().uuid();

/** Fail-closed: XN phải có ma_benh_an và BA đó nằm trong phạm vi khoa của actor. */
async function viSinhRowInScope(row: { ma_benh_an?: unknown }): Promise<boolean> {
  const ma = String(row.ma_benh_an ?? "").trim();
  const restriction = await getNkbvKhoaRestriction();
  if (restriction.kind === "all") return true;
  if (!ma) return false;
  return isNkbvBenhAnInScope(restriction, ma);
}

export type NkbvBaAnalysisSeedInput = {
  panel: SyndromePanelId;
  draft: BaAnalysisSessionDraft;
  indexKind?: "XN" | "CDHA" | "TIEU_CHUAN";
  nsk?: string | null;
  isSecondaryBsi?: boolean;
  ketLuan?: string | null;
  attributedXnIds?: string[];
  secondaryBloodIds?: string[];
  /** Cửa sổ CDC từ computeBaGridSession.metrics */
  windows?: BaCdcWindowSeed | null;
  ritLabs?: BaSeedLabRow[];
  sbapLabs?: BaSeedLabRow[];
  /** Ngày phẫu thuật (SSI) */
  surgeryDate?: string | null;
  /** HAP vs VAP (PNEU) — cổng phiếu; mặc định suy từ panel. */
  checklistGate?: NkbvChecklistTypeCode | null;
};

/** Chặn server: mở BSI/CLABSI từ mẫu máu khi còn mẫu cấy (+) khác ±14 ngày chưa phân tích. */
async function checkBloodLastServer(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  input: { maBa: string; gate: string; milestoneId: string; indexDate: string; loaiBenhPham?: string | null },
): Promise<string | null> {
  if (input.gate !== "BSI" && input.gate !== "CLABSI") return null;
  const vsId = bareViSinhIdFromMilestoneId(input.milestoneId);
  if (!vsId) return null;
  const { data: rows } = await supabase
    .from("nkbv_fact_vi_sinh")
    .select("id, ngay_lay_mau, loai_benh_pham, tac_nhan, metadata")
    .eq("ma_benh_an", input.maBa)
    .eq("is_active", true)
    .eq("ket_qua_duong_tinh", true);
  const list = rows ?? [];
  const { data: cases } = await supabase
    .from("v_nkbv_su_kien_full")
    .select("verification_data")
    .eq("ma_benh_an", input.maBa)
    .eq("is_active", true);
  const dispositions: ViSinhAnalysisDispositionRow[] = [
    ...(cases ?? []).map((c) => {
      const vd = (c.verification_data && typeof c.verification_data === "object" ? c.verification_data : {}) as Record<string, unknown>;
      return {
        index_vi_sinh_id: vd.index_vi_sinh_id ? String(vd.index_vi_sinh_id) : null,
        analysis_disposition: null,
        is_active: true,
      };
    }),
    ...list.map((r) => {
      const m = (r.metadata && typeof r.metadata === "object" ? r.metadata : {}) as Record<string, unknown>;
      const d = m.analysis_disposition;
      return {
        index_vi_sinh_id: String(r.id),
        analysis_disposition: d === "BO_QUA" || d === "KHONG_DU_TC" || d === "DA_PHAN_TICH" ? d : undefined,
        is_active: true,
      } as ViSinhAnalysisDispositionRow;
    }).filter((r) => r.analysis_disposition),
  ];
  const statusById: Record<string, string> = {};
  for (const r of list) statusById[String(r.id)] = resolveViSinhAnalysisStatus(String(r.id), dispositions);
  // CĐHA: mốc IMAGING_* còn hoạt động; đã xử lý khi metadata.analysis_disposition có giá trị.
  const { data: imgRows } = await supabase
    .from("nkbv_fact_ba_timeline")
    .select("id, milestone_date, milestone_kind, criteria_key, metadata")
    .eq("ma_benh_an", input.maBa)
    .eq("is_active", true)
    .or("milestone_kind.ilike.IMAGING%,criteria_key.in.(imaging_chest,abscess_imaging)");
  const cdhaList = (imgRows ?? []).map((r) => {
    const m = (r.metadata && typeof r.metadata === "object" ? r.metadata : {}) as Record<string, unknown>;
    statusById[String(r.id)] = m.analysis_disposition ? "DA_XU_LY" : "CHUA_PHAN_TICH";
    return { id: String(r.id), ngay: String(r.milestone_date ?? "").slice(0, 10), label: String(r.milestone_kind ?? "CĐHA") };
  });
  const res = validateBloodLast({
    cdhaList,
    targetId: vsId,
    targetDate: input.indexDate,
    targetBenhPham: list.find((r) => String(r.id) === vsId)?.loai_benh_pham || input.loaiBenhPham,
    xnList: list.map((r) => ({
      id: String(r.id),
      ngay: String(r.ngay_lay_mau).slice(0, 10),
      benh_pham: r.loai_benh_pham,
      vi_khuan: r.tac_nhan,
    })),
    statusById,
  });
  return res.allowed ? null : res.message;
}

async function markViSinhAnalyzedForCase(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  caseId: string,
  viSinhIds: string[],
) {
  const now = new Date().toISOString();
  for (const id of viSinhIds) {
    const { data: row } = await supabase
      .from("nkbv_fact_vi_sinh")
      .select("id, metadata")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    if (!row) continue;
    const prev =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {};
    if (prev.analysis_disposition === "BO_QUA") continue;
    await supabase
      .from("nkbv_fact_vi_sinh")
      .update({
        metadata: {
          ...prev,
          analysis_disposition: "DA_PHAN_TICH",
          analyzed_case_id: caseId,
          analyzed_at: now,
        },
        updated_at: now,
      })
      .eq("id", id);
  }
}

async function applyAnalysisSeedToCase(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  caseId: string,
  milestoneId: string,
  seed: NkbvBaAnalysisSeedInput,
  existingVd: Record<string, unknown>,
  existingNotes: Record<string, unknown>,
) {
  const mapped = mapAnalysisSessionToVerificationSeed({
    panel: seed.panel,
    draft: seed.draft,
    indexMilestoneId: milestoneId,
    indexKind: seed.indexKind,
    nsk: seed.nsk,
    isSecondaryBsi: seed.isSecondaryBsi,
    ketLuan: seed.ketLuan,
    attributedXnIds: seed.attributedXnIds,
    secondaryBloodIds: seed.secondaryBloodIds,
    windows: seed.windows,
    ritLabs: seed.ritLabs,
    sbapLabs: seed.sbapLabs,
    surgeryDate: seed.surgeryDate,
  });

  const verification_data = {
    ...existingVd,
    ...mapped.verification_data,
    // Giữ index nếu seed không có (CĐHA)
    index_vi_sinh_id:
      mapped.verification_data.index_vi_sinh_id || existingVd.index_vi_sinh_id || undefined,
  };

  const clinical_notes = {
    ...existingNotes,
    ...mapped.clinical_notes_patch,
    timeline_milestone_id:
      existingNotes.timeline_milestone_id || milestoneId,
  };

  await supabase
    .from("nkbv_fact_su_kien")
    .update({
      verification_data,
      clinical_notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  await markViSinhAnalyzedForCase(supabase, caseId, mapped.analyzedViSinhIds);

  return mapped.analyzedViSinhIds;
}

/**
 * Bật lại phiếu đã ẩn theo `ma_ca` (unique toàn bảng, kể cả is_active=false).
 * Chỉ đổi is_active — không đụng trạng thái/nội dung (ca đã duyệt giữ nguyên).
 */
async function reactivateHiddenCaseByMaCa(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  maCa: string,
): Promise<{ id: string | null; error?: string }> {
  const { data, error } = await supabase
    .from("nkbv_fact_su_kien")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("ma_ca", maCa)
    .eq("is_active", false)
    .select("id")
    .maybeSingle();
  if (error) return { id: null, error: `Không kích hoạt lại phiếu: ${error.message}` };
  return { id: data?.id ?? null };
}

export async function ensureNkbvBaAnalysisCase(input: {
  ma_benh_an: string;
  ma_benh_nhan?: string | null;
  ho_ten_benh_nhan?: string | null;
  ngay_sinh?: string | null;
  gioi_tinh?: string | null;
  ngay_vao_vien?: string | null;
  khoa_ghi_nhan_id?: string | null;
  milestone_id: string;
  milestone_date: string;
  gate: NkbvChecklistTypeCode;
  loai_benh_pham?: string | null;
  tac_nhan?: string | null;
  title?: string | null;
  existing_case_id?: string | null;
  /** Seed từ bảng phân tích khi «Tạo phiếu». */
  analysisSeed?: NkbvBaAnalysisSeedInput | null;
}) {
  await assertCanWriteNkbvAnalysis();

  const supabase = createAdminSupabaseClient();
  const maBa = String(input.ma_benh_an || "").trim();
  const milestoneId = String(input.milestone_id || "").trim();
  const indexDate = String(input.milestone_date || "").slice(0, 10);
  const gate = String(input.gate || "BSI").toUpperCase();
  const seed = input.analysisSeed || null;

  if (!maBa) return { success: false as const, error: "Thiếu mã bệnh án" };
  if (!milestoneId) return { success: false as const, error: "Thiếu mốc Index" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(indexDate)) {
    return { success: false as const, error: "Ngày Index không hợp lệ" };
  }
  if (!(await isNkbvBenhAnInScope(await getNkbvKhoaRestriction(), maBa))) {
    return { success: false as const, error: NKBV_OUT_OF_SCOPE_ERROR };
  }
  if (!input.existing_case_id) {
    const blocked = await checkBloodLastServer(supabase, {
      maBa, gate, milestoneId, indexDate, loaiBenhPham: input.loai_benh_pham,
    });
    if (blocked) return { success: false as const, error: blocked };
  }

  const reloadCase = async (id: string) => {
    const { data, error } = await supabase
      .from("v_nkbv_su_kien_full")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) return null;
    return data as Record<string, unknown>;
  };

  const finishWithSeed = async (caseRow: Record<string, unknown>) => {
    const caseId = String(caseRow.id || "");
    // Ca đã chốt thẩm định: không seed lại verification/clinical_notes
    const chot = isNkbvCaTrangThaiChot(caseRow.trang_thai_ma as string | null | undefined);
    if (seed && caseId && !chot) {
      const vd =
        caseRow.verification_data && typeof caseRow.verification_data === "object"
          ? (caseRow.verification_data as Record<string, unknown>)
          : {};
      const notes =
        caseRow.clinical_notes && typeof caseRow.clinical_notes === "object"
          ? (caseRow.clinical_notes as Record<string, unknown>)
          : {};
      // Chỉ seed lần đầu (tránh ghi đè form đã sửa tay)
      if (!vd.seeded_from_ba_analysis) {
        await applyAnalysisSeedToCase(supabase, caseId, milestoneId, seed, vd, notes);
        const refreshed = await reloadCase(caseId);
        if (refreshed) {
          revalidatePath("/giam-sat-nkbv");
          return { success: true as const, caseRow: refreshed };
        }
      } else if (Array.isArray(vd.attributed_vi_sinh_ids)) {
        await markViSinhAnalyzedForCase(
          supabase,
          caseId,
          (vd.attributed_vi_sinh_ids as string[]).filter(Boolean),
        );
      }
    }
    revalidatePath("/giam-sat-nkbv");
    return { success: true as const, caseRow };
  };

  if (input.existing_case_id) {
    const data = await reloadCase(input.existing_case_id);
    if (data) return finishWithSeed(data);
  }

  const slug = milestoneId.replace(/[^a-zA-Z0-9]/g, "").slice(-20) || "IDX";
  const maCa = `NK-${maBa.slice(0, 12)}-${slug}`.slice(0, 64);

  const { data: byMaCa } = await supabase
    .from("v_nkbv_su_kien_full")
    .select("*")
    .eq("ma_ca", maCa)
    .eq("is_active", true)
    .maybeSingle();
  if (byMaCa) return finishWithSeed(byMaCa as Record<string, unknown>);

  // Phiếu đã ẩn (is_active=false) cùng ma_ca: bật lại, giữ nguyên trạng thái (kể cả đã chốt)
  const reactivated = await reactivateHiddenCaseByMaCa(supabase, maCa);
  if (reactivated.error) return { success: false as const, error: reactivated.error };
  if (reactivated.id) {
    const back = await reloadCase(reactivated.id);
    if (back) return finishWithSeed(back);
  }

  const { data: loaiRows, error: loaiErr } = await supabase
    .from("nkbv_dm_loai")
    .select("id, ma_loai")
    .eq("is_active", true);
  if (loaiErr) return { success: false as const, error: `Danh mục loại: ${loaiErr.message}` };
  const loaiId = resolveMdmLoaiId(
    (gate === "LOAI_TRU" ? "BSI" : gate) as Exclude<NkbvChecklistTypeCode, "LOAI_TRU">,
    loaiRows || [],
  );
  if (!loaiId) {
    return {
      success: false as const,
      error: `Thiếu danh mục loại NKBV cho cổng ${gate}. Kiểm tra nkbv_dm_loai.`,
    };
  }

  const statusPriority = ["DANG_GHI_NHAN", "CHO_XAC_MINH", "CHO_XAC_NHAN"] as const;
  let trangThaiId: string | undefined;
  for (const ma of statusPriority) {
    const { data: st } = await supabase
      .from("nkbv_dm_trang_thai_ca")
      .select("id")
      .eq("ma_trang_thai", ma)
      .eq("is_active", true)
      .maybeSingle();
    if (st?.id) {
      trangThaiId = st.id;
      break;
    }
  }
  if (!trangThaiId) {
    const { data: first } = await supabase
      .from("nkbv_dm_trang_thai_ca")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    trangThaiId = first?.id;
  }
  if (!trangThaiId) return { success: false as const, error: "Thiếu danh mục trạng thái phiếu" };

  let khoaId: string | null = null;
  if (input.khoa_ghi_nhan_id) {
    try {
      khoaId = await normalizeAndValidateDmKhoaPhong({
        supabase,
        idRaw: input.khoa_ghi_nhan_id,
        fieldLabel: "Khoa ghi nhận",
        activeOnly: true,
      });
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error && e.message ? e.message : "Khoa ghi nhận không hợp lệ hoặc đã ngừng sử dụng",
      };
    }
  }

  // Khoa quy kết do server tính từ lưới ngày; khoa client chỉ là dự phòng khi lưới chưa phủ ngày Index
  {
    const { data: luoi } = await supabase
      .from("nkbv_fact_ba_ngay_khoa")
      .select("ngay_lich, khoa_id")
      .eq("ma_benh_an", maBa);
    const fromGrid = resolveKhoaQuyKet(
      (luoi || []).map((r) => ({ ngay_lich: String(r.ngay_lich).slice(0, 10), khoa_id: String(r.khoa_id) })),
      null,
      indexDate,
    );
    if (fromGrid) khoaId = fromGrid;
  }

  void getActorNhanSuId;

  const ngayVvRaw = input.ngay_vao_vien ? String(input.ngay_vao_vien).trim() : "";
  const ngayVaoVienIso = ngayVvRaw
    ? new Date(ngayVvRaw.includes("T") ? ngayVvRaw : `${ngayVvRaw.slice(0, 10)}T00:00:00.000Z`).toISOString()
    : null;

  const vsId = bareViSinhIdFromMilestoneId(milestoneId);
  let verification_data: Record<string, unknown> = vsId ? { index_vi_sinh_id: vsId } : {};
  let clinical_notes: Record<string, unknown> = {
    tom_tat_dien_bien: `Neo timeline ${milestoneId} · cổng ${gate}`,
    timeline_milestone_id: milestoneId,
    bien_phap_phong_ngua: null,
    ly_do_loai_tru: null,
  };

  if (seed) {
    const mapped = mapAnalysisSessionToVerificationSeed({
      panel: seed.panel,
      draft: seed.draft,
      indexMilestoneId: milestoneId,
      indexKind: seed.indexKind,
      nsk: seed.nsk,
      isSecondaryBsi: seed.isSecondaryBsi,
      ketLuan: seed.ketLuan,
      attributedXnIds: seed.attributedXnIds,
      secondaryBloodIds: seed.secondaryBloodIds,
      windows: seed.windows,
      ritLabs: seed.ritLabs,
      sbapLabs: seed.sbapLabs,
    });
    verification_data = { ...verification_data, ...mapped.verification_data };
    clinical_notes = { ...clinical_notes, ...mapped.clinical_notes_patch };
  }

  const insertRow: Record<string, unknown> = {
    ma_ca: maCa,
    khoa_ghi_nhan_id: khoaId,
    ma_benh_nhan: String(input.ma_benh_nhan || "PID-UNKNOWN").trim() || "PID-UNKNOWN",
    ho_ten_benh_nhan: String(input.ho_ten_benh_nhan || maBa).trim() || maBa,
    ngay_sinh: input.ngay_sinh ? String(input.ngay_sinh).slice(0, 10) : null,
    gioi_tinh: input.gioi_tinh ? String(input.gioi_tinh) : null,
    ngay_vao_vien: ngayVaoVienIso,
    ngay_phat_hien: indexDate,
    vi_tri_nhiem_khuan: input.title ? String(input.title) : null,
    tac_nhan_vi_khuan: input.tac_nhan ? String(input.tac_nhan) : null,
    clinical_notes,
    verification_data,
    loai_nkbv_id: loaiId,
    trang_thai_id: trangThaiId,
    nguoi_ghi_id: null,
    ma_benh_an: maBa,
    loai_benh_pham: input.loai_benh_pham ? String(input.loai_benh_pham) : null,
    is_active: true,
  };

  let created: { id: string } | null = null;
  let createErr: { message: string } | null = null;
  {
    const res = await supabase.from("nkbv_fact_su_kien").insert(insertRow).select("id").single();
    created = res.data;
    createErr = res.error;
  }

  if (createErr) {
    if (/duplicate|unique/i.test(createErr.message)) {
      const { data: again } = await supabase
        .from("v_nkbv_su_kien_full")
        .select("*")
        .eq("ma_ca", maCa)
        .eq("is_active", true)
        .maybeSingle();
      if (again) return finishWithSeed(again as Record<string, unknown>);
      const re = await reactivateHiddenCaseByMaCa(supabase, maCa);
      if (re.id) {
        const back = await reloadCase(re.id);
        if (back) return finishWithSeed(back);
      }
    }
    return { success: false as const, error: `Không neo phiếu: ${createErr.message}` };
  }

  if (!created?.id) {
    return { success: false as const, error: "Không neo được phiếu phân tích" };
  }

  if (seed) {
    await applyAnalysisSeedToCase(
      supabase,
      created.id,
      milestoneId,
      seed,
      verification_data,
      clinical_notes,
    );
  } else if (vsId) {
    await markViSinhAnalyzedForCase(supabase, created.id, [vsId]);
  }

  // Ca tạo từ mốc CĐHA: đánh dấu mốc đã phân tích (không còn chặn cấy máu). Không khớp dòng nào = mốc XN → no-op.
  if (seed?.indexKind === "CDHA" && /^[0-9a-f-]{36}$/i.test(milestoneId)) {
    const { data: tl } = await supabase
      .from("nkbv_fact_ba_timeline")
      .select("metadata")
      .eq("id", milestoneId)
      .eq("ma_benh_an", maBa)
      .maybeSingle();
    if (tl) {
      const prev = tl.metadata && typeof tl.metadata === "object" ? (tl.metadata as Record<string, unknown>) : {};
      await supabase
        .from("nkbv_fact_ba_timeline")
        .update({ metadata: { ...prev, analysis_disposition: "DA_PHAN_TICH" }, updated_at: new Date().toISOString() })
        .eq("id", milestoneId);
    }
  }

  await syncNkbvPhieuFromBaNgay(maBa);

  const full = await reloadCase(created.id);
  if (!full) {
    return { success: false as const, error: "Đã tạo nhưng không tải được phiếu" };
  }

  revalidatePath("/giam-sat-nkbv");
  return { success: true as const, caseRow: full };
}

/**
 * Chốt Index không đủ TC — đánh dấu KHONG_DU_TC, không tạo sự kiện / RIT,
 * vẫn cho phân tích XN khác.
 */
export async function markNkbvViSinhKhongDuTc(input: {
  vi_sinh_id: string;
  index_date?: string | null;
}) {
  await assertCanWriteNkbvAnalysis();
  const id = String(input.vi_sinh_id || "").trim();
  if (!id) return { success: false as const, error: "Thiếu mã XN vi sinh" };
  if (!viSinhIdSchema.safeParse(id).success) return { success: false as const, error: "Mã XN vi sinh không hợp lệ" };

  const supabase = createAdminSupabaseClient();
  const { data: row, error: loadErr } = await supabase
    .from("nkbv_fact_vi_sinh")
    .select("id, metadata, ma_benh_an")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (loadErr) return { success: false as const, error: loadErr.message };
  if (!row) return { success: false as const, error: "Không tìm thấy XN" };
  if (!(await viSinhRowInScope(row))) return { success: false as const, error: NKBV_OUT_OF_SCOPE_ERROR };

  const prev =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};
  if (prev.analysis_disposition === "BO_QUA") {
    return { success: false as const, error: "XN đã bỏ qua — không đổi sang không đủ TC" };
  }
  const { error } = await supabase
    .from("nkbv_fact_vi_sinh")
    .update({
      metadata: {
        ...prev,
        analysis_disposition: "KHONG_DU_TC",
        analysis_ket_luan: "KHONG_DU_TC",
        analysis_index_date: input.index_date
          ? String(input.index_date).slice(0, 10)
          : prev.analysis_index_date || null,
        analyzed_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/giam-sat-nkbv");
  return { success: true as const };
}

/**
 * Gỡ disposition phân tích trên XN (vd. xóa phiên → mở lại Chưa PT).
 * Chỉ xóa KHONG_DU_TC — không đụng BO_QUA / phiếu DA_PHAN_TICH đã tạo sự kiện.
 */
export async function clearNkbvViSinhAnalysisDisposition(input: {
  vi_sinh_id: string;
}) {
  await assertCanWriteNkbvAnalysis();
  const id = String(input.vi_sinh_id || "").trim();
  if (!id) return { success: false as const, error: "Thiếu mã XN vi sinh" };
  if (!viSinhIdSchema.safeParse(id).success) return { success: false as const, error: "Mã XN vi sinh không hợp lệ" };

  const supabase = createAdminSupabaseClient();
  const { data: row, error: loadErr } = await supabase
    .from("nkbv_fact_vi_sinh")
    .select("id, metadata, ma_benh_an")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (loadErr) return { success: false as const, error: loadErr.message };
  if (!row) return { success: false as const, error: "Không tìm thấy XN" };
  if (!(await viSinhRowInScope(row))) return { success: false as const, error: NKBV_OUT_OF_SCOPE_ERROR };

  const prev =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};
  if (prev.analysis_disposition === "BO_QUA") {
    return { success: false as const, error: "XN đã bỏ qua — không mở lại từ xóa phiên" };
  }
  if (prev.analysis_disposition === "DA_PHAN_TICH") {
    return {
      success: false as const,
      error: "XN đã gắn phiếu phân tích — không gỡ disposition khi xóa phiên nháp",
    };
  }
  if (prev.analysis_disposition !== "KHONG_DU_TC") {
    return { success: true as const, skipped: true as const };
  }

  const nextMeta = { ...prev };
  delete nextMeta.analysis_disposition;
  delete nextMeta.analysis_ket_luan;
  delete nextMeta.analysis_index_date;
  delete nextMeta.analyzed_at;

  const { error } = await supabase
    .from("nkbv_fact_vi_sinh")
    .update({
      metadata: nextMeta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/giam-sat-nkbv");
  return { success: true as const };
}

/** Bỏ qua XN (+) có lý do — ra khỏi hàng đợi Chưa PT, không tạo HAI. */
export async function skipNkbvViSinhAnalysis(input: {
  vi_sinh_id: string;
  reason: string;
}) {
  await assertCanWriteNkbvAnalysis();
  const id = String(input.vi_sinh_id || "").trim();
  const reason = String(input.reason || "").trim();
  if (!id) return { success: false as const, error: "Thiếu mã XN vi sinh" };
  if (!viSinhIdSchema.safeParse(id).success) return { success: false as const, error: "Mã XN vi sinh không hợp lệ" };
  if (!reason) return { success: false as const, error: "Nhập lý do bỏ qua" };

  const supabase = createAdminSupabaseClient();
  const { data: row, error: loadErr } = await supabase
    .from("nkbv_fact_vi_sinh")
    .select("id, metadata, ma_benh_an")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (loadErr) return { success: false as const, error: loadErr.message };
  if (!row) return { success: false as const, error: "Không tìm thấy XN" };
  if (!(await viSinhRowInScope(row))) return { success: false as const, error: NKBV_OUT_OF_SCOPE_ERROR };

  const prev =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};
  const { error } = await supabase
    .from("nkbv_fact_vi_sinh")
    .update({
      metadata: {
        ...prev,
        analysis_disposition: "BO_QUA",
        analysis_skip_reason: reason,
        analysis_skipped_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/giam-sat-nkbv");
  return { success: true as const };
}
