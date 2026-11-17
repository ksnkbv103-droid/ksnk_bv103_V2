"use server";

import { selectBalancedExam } from "@/lib/dao-tao/exam-engine";
import { gradeAnswer, scoreAttempt } from "@/lib/dao-tao/grade";
import type {
  BankOption,
  BankQuestion,
  DapAnDung,
  ExamFormThongTin,
  ExamQuestionSnapshot,
  TraLoi,
} from "@/lib/dao-tao/types";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { parseGan } from "@/lib/dao-tao/labels";
import { parseHanChungChiThang, resolveChungChi, type ChungChiStatus } from "@/lib/dao-tao/chung-chi";
import { requireDaoTaoAdmin, requireDaoTaoUser } from "@/modules/dao-tao/lib/dao-tao-auth";
import {
  daoTaoIdSchema,
  examFormThongTinSchema,
  parseDaoTaoInput,
  saveTraLoiInputSchema,
} from "@/lib/dao-tao/schemas";
import { randomUUID } from "crypto";
import {
  summarizeLuot,
  TRANG_THAI_TIEU_LUOT,
} from "@/modules/dao-tao/lib/dao-tao-luot";

const LATE_GRACE_MS = 30_000;

type PhuongAnJson = {
  id: string;
  nhan_goc: string;
  noi_dung: string;
  thu_tu_goc: number;
  tf_dung?: boolean | null;
};

type DeSnapshotItem = {
  id: string;
  cau_hoi_id: string;
  thu_tu: number;
  loai: string;
  bloom_level: number;
  bloom_code?: string | null;
  chu_de_ma: string;
  chu_de_ten?: string | null;
  clinical_vignette?: string | null;
  stem: string;
  giai_thich: string | null;
  distractor_rationales?: Record<string, string>;
  evidence_lock?: any;
  target_roles?: string[];
  sop_refs?: string[];
  options: Array<{ id: string; noiDung: string; displayIndex: number; tfDung?: boolean | null }>;
  dap_an_dung: DapAnDung;
  tra_loi: TraLoi | null;
  dung: boolean | null;
};

function mapBankRows(
  rows: Array<{
    id: string;
    chu_de_ma: string;
    chu_de_ten?: string | null;
    loai: string;
    bloom_level: number;
    bloom_code?: string | null;
    clinical_vignette?: string | null;
    stem: string;
    giai_thich: string | null;
    dap_an_dung: DapAnDung;
    distractor_rationales?: Record<string, string>;
    evidence_lock?: any;
    target_roles?: string[];
    sop_refs?: string[];
    phuong_an: PhuongAnJson[] | null;
  }>,
): BankQuestion[] {
  return rows.map((r) => {
    const opts = (r.phuong_an ?? [])
      .slice()
      .sort((a, b) => a.thu_tu_goc - b.thu_tu_goc)
      .map(
        (o): BankOption => ({
          id: o.id,
          nhanGoc: o.nhan_goc,
          noiDung: o.noi_dung,
          thuTuGoc: o.thu_tu_goc,
          tfDung: o.tf_dung,
        }),
      );
    return {
      id: r.id,
      chuDeMa: r.chu_de_ma,
      chuDeTen: r.chu_de_ten ?? undefined,
      loai: r.loai as BankQuestion["loai"],
      bloomLevel: r.bloom_level as BankQuestion["bloomLevel"],
      bloomCode: r.bloom_code ?? undefined,
      clinicalVignette: r.clinical_vignette,
      stem: r.stem,
      giaiThich: r.giai_thich,
      dapAnDung: r.dap_an_dung,
      options: opts,
      distractorRationales: r.distractor_rationales,
      evidenceLock: r.evidence_lock,
      targetRoles: r.target_roles,
      sopRefs: r.sop_refs,
    };
  });
}

async function loadActiveBank(chuDeMas?: string[], targetRole?: string) {
  const admin = createAdminSupabaseClient();
  let q = admin
    .from("dao_tao_cau_hoi")
    .select(
      "id, chu_de_ma, chu_de_ten, loai, bloom_level, bloom_code, clinical_vignette, stem, giai_thich, dap_an_dung, phuong_an, distractor_rationales, evidence_lock, target_roles, sop_refs",
    )
    .eq("is_active", true);
  if (chuDeMas?.length) q = q.in("chu_de_ma", chuDeMas);
  if (targetRole && targetRole !== "ALL") {
    q = q.contains("target_roles", [targetRole]);
  }
  const { data, error } = await q;
  if (error) throw error;
  return mapBankRows((data ?? []) as never);
}

function snapshotsToDeJson(questions: ExamQuestionSnapshot[]): DeSnapshotItem[] {
  return questions.map((q, idx) => ({
    id: randomUUID(),
    cau_hoi_id: q.cauHoiId,
    thu_tu: idx + 1,
    loai: q.loai,
    bloom_level: q.bloomLevel,
    bloom_code: q.bloomCode ?? null,
    chu_de_ma: q.chuDeMa,
    chu_de_ten: q.chuDeTen ?? null,
    clinical_vignette: q.clinicalVignette ?? null,
    stem: q.stem,
    giai_thich: q.giaiThich ?? null,
    distractor_rationales: q.distractorRationales ?? {},
    evidence_lock: q.evidenceLock ?? {},
    target_roles: q.targetRoles ?? [],
    sop_refs: q.sopRefs ?? [],
    options: q.options,
    dap_an_dung: q.dapAnDung,
    tra_loi: null,
    dung: null,
  }));
}

/** Zod: họ tên/khoa bắt buộc, giới hạn độ dài, bỏ khóa lạ — lỗi tiếng Việt. */
function validateForm(form: unknown): ExamFormThongTin {
  return parseDaoTaoInput(examFormThongTinSchema, form);
}

async function userAssignedToCauHinh(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  cauHinh: { gan?: unknown },
): Promise<boolean> {
  const gan = parseGan(cauHinh.gan);
  if (!gan.khoa_ids.length && !gan.nhan_su_ids.length) return false;

  const { data: nhanSu } = await admin
    .from("mdm_nhan_su")
    .select("id, khoa_id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (nhanSu?.id && gan.nhan_su_ids.includes(nhanSu.id)) return true;
  if (nhanSu?.khoa_id && gan.khoa_ids.includes(nhanSu.khoa_id)) return true;
  return false;
}

async function canAccessKyThiThat(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  cauHinh: { gan?: unknown },
): Promise<boolean> {
  try {
    const { verifyPermission } = await import("@/lib/server-permission");
    await verifyPermission("DAO_TAO", "edit");
    return true;
  } catch {
    return userAssignedToCauHinh(admin, userId, cauHinh);
  }
}

function clampDuoiCauHinh(requested: number | undefined, cauHinh: number): number {
  const n = typeof requested === "number" && Number.isFinite(requested) ? Math.floor(requested) : 0;
  return n > 0 ? Math.min(n, cauHinh) : cauHinh;
}

export async function startThiThuAttempt(input: {
  mucDoId: string;
  form: ExamFormThongTin;
  targetRole?: string;
  chuDeMas?: string[];
  soCau?: number;
  thoiGianPhut?: number;
}) {
  const { user } = await requireDaoTaoUser();
  const form = validateForm(input.form);
  const mucDoId = parseDaoTaoInput(daoTaoIdSchema, input.mucDoId);
  const admin = createAdminSupabaseClient();

  const { data: mucDo, error: mdErr } = await admin
    .from("dao_tao_cau_hinh")
    .select("*")
    .eq("id", mucDoId)
    .eq("loai_cau_hinh", "thi_thu_muc_do")
    .eq("is_active", true)
    .maybeSingle();
  if (mdErr) throw mdErr;
  if (!mucDo) throw new Error("Mức độ thi thử không tồn tại.");

  const selectedChuDeMas =
    input.chuDeMas && input.chuDeMas.length > 0
      ? input.chuDeMas
      : Array.isArray(mucDo.chu_de_mas) && mucDo.chu_de_mas.length
        ? mucDo.chu_de_mas
        : undefined;

  const bank = await loadActiveBank(selectedChuDeMas, input.targetRole);
  if (bank.length === 0) throw new Error("Ngân hàng câu hỏi trống cho tiêu chí này. Vui lòng chọn lại vai trò hoặc chuyên đề.");

  // DT-002 (PO 2026-11-11): thi thử không vượt cấu hình mức độ (thời gian, số câu); được chọn ít hơn.
  const soCauChon = clampDuoiCauHinh(input.soCau, mucDo.so_cau);
  const thoiGianPhut = clampDuoiCauHinh(input.thoiGianPhut, mucDo.thoi_gian_phut);

  const seed = randomUUID();
  const { questions, report } = selectBalancedExam({
    bank,
    soCau: Math.min(soCauChon, bank.length),
    bloomQuota: (mucDo.bloom_quota ?? {}) as Record<string, number>,
    loaiQuota: (mucDo.loai_quota ?? {}) as Record<string, number>,
    seed,
    shuffleCau: mucDo.shuffle_cau !== false,
    shuffleDapAn: mucDo.shuffle_dap_an !== false,
    targetRole: input.targetRole,
    chuDeMas: selectedChuDeMas,
  });

  const batDau = new Date();
  const hanNop = new Date(batDau.getTime() + thoiGianPhut * 60_000);
  const deSnapshot = snapshotsToDeJson(questions);

  const { data: lanThi, error: ltErr } = await admin
    .from("dao_tao_lan_thi")
    .insert({
      che_do: "thi_thu",
      cau_hinh_id: mucDo.id,
      auth_user_id: user.id,
      form_thong_tin: form,
      seed,
      so_cau: questions.length,
      thoi_gian_phut: thoiGianPhut,
      bat_dau_luc: batDau.toISOString(),
      han_nop_luc: hanNop.toISOString(),
      trang_thai: "dang_lam",
      quota_report: report,
      de_snapshot: deSnapshot,
    })
    .select("id, han_nop_luc")
    .single();
  if (ltErr || !lanThi) throw ltErr ?? new Error("Không tạo được lần thi.");

  return { lanThiId: lanThi.id as string, hanNopLuc: lanThi.han_nop_luc as string };
}

export async function listKyThiThatCuaToi() {
  const { user } = await requireDaoTaoUser();
  const admin = createAdminSupabaseClient();
  const { data: published, error } = await admin
    .from("dao_tao_cau_hinh")
    .select("id, ten, mo_ta, so_cau, thoi_gian_phut, diem_dat_pct, so_lan_cho_phep, gan")
    .eq("loai_cau_hinh", "thi_that")
    .eq("trang_thai", "published")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const out = [];
  for (const ky of published ?? []) {
    const ok = await canAccessKyThiThat(admin, user.id, ky);
    if (!ok) continue;
    const { data: luotRows, error: luotErr } = await admin
      .from("dao_tao_lan_thi")
      .select("id, trang_thai")
      .eq("cau_hinh_id", ky.id)
      .eq("auth_user_id", user.id)
      .in("trang_thai", [...TRANG_THAI_TIEU_LUOT]);
    if (luotErr) throw luotErr;
    const luot = summarizeLuot(luotRows ?? [], ky.so_lan_cho_phep);
    out.push({
      ...ky,
      soLanDaNop: luot.daNop,
      conLuot: luot.conLuot,
    });
  }
  return out;
}

export async function listLanThiCuaToi() {
  const { user } = await requireDaoTaoUser();
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dao_tao_lan_thi")
    .select(
      "id, che_do, cau_hinh_id, diem_pct, dat, trang_thai, nop_luc, bat_dau_luc, so_cau",
    )
    .eq("auth_user_id", user.id)
    .in("trang_thai", ["dang_lam", "da_nop", "het_gio"]) // lượt `huy` không hiện ở "Bài của tôi"
    .order("bat_dau_luc", { ascending: false })
    .limit(20);
  if (error) throw error;
  const rows = data ?? [];
  const kyIds = [...new Set(rows.map((r) => r.cau_hinh_id).filter(Boolean))] as string[];
  const { data: kys } = kyIds.length
    ? await admin.from("dao_tao_cau_hinh").select("id, ten").in("id", kyIds)
    : { data: [] };
  const kyMap = Object.fromEntries((kys ?? []).map((k) => [k.id, k.ten as string]));
  return rows.map((r) => ({
    id: r.id as string,
    cheDo: r.che_do as string,
    kyTen: (r.cau_hinh_id ? kyMap[r.cau_hinh_id] : null) ?? (r.che_do === "thi_thu" ? "Ôn tập" : "Kỳ thi"),
    diemPct: r.diem_pct as number | null,
    dat: r.dat as boolean | null,
    trangThai: r.trang_thai as string,
    nopLuc: r.nop_luc as string | null,
    batDauLuc: r.bat_dau_luc as string,
    soCau: r.so_cau as number,
  }));
}

export async function startThiThatAttempt(input: {
  kyThiId: string;
  form: ExamFormThongTin;
}) {
  const { user } = await requireDaoTaoUser();
  const form = validateForm(input.form);
  const kyThiId = parseDaoTaoInput(daoTaoIdSchema, input.kyThiId);
  const admin = createAdminSupabaseClient();

  const { data: ky, error: kErr } = await admin
    .from("dao_tao_cau_hinh")
    .select("*")
    .eq("id", kyThiId)
    .eq("loai_cau_hinh", "thi_that")
    .eq("trang_thai", "published")
    .eq("is_active", true)
    .maybeSingle();
  if (kErr) throw kErr;
  if (!ky) throw new Error("Kỳ thi không tồn tại hoặc chưa mở.");

  const assigned = await canAccessKyThiThat(admin, user.id, ky);
  if (!assigned) throw new Error("Bạn không được phân công kỳ thi này.");

  const fetchLuot = async () => {
    const { data, error } = await admin
      .from("dao_tao_lan_thi")
      .select("id, bat_dau_luc, trang_thai")
      .eq("cau_hinh_id", ky.id)
      .eq("auth_user_id", user.id)
      .in("trang_thai", [...TRANG_THAI_TIEU_LUOT]);
    if (error) throw error;
    return data ?? [];
  };
  if (!summarizeLuot(await fetchLuot(), ky.so_lan_cho_phep).conLuot) {
    throw new Error("Bạn đã hết lượt thi cho kỳ này.");
  }

  const bank = await loadActiveBank(
    Array.isArray(ky.chu_de_mas) && ky.chu_de_mas.length ? ky.chu_de_mas : undefined,
  );
  if (bank.length === 0) throw new Error("Ngân hàng câu hỏi trống.");

  const seed = randomUUID();
  const { questions, report } = selectBalancedExam({
    bank,
    soCau: ky.so_cau,
    bloomQuota: (ky.bloom_quota ?? {}) as Record<string, number>,
    loaiQuota: (ky.loai_quota ?? {}) as Record<string, number>,
    seed,
    shuffleCau: ky.shuffle_cau !== false,
    shuffleDapAn: ky.shuffle_dap_an !== false,
  });

  const batDau = new Date();
  const hanNop = new Date(batDau.getTime() + ky.thoi_gian_phut * 60_000);
  const deSnapshot = snapshotsToDeJson(questions);

  // DT-005: đếm lượt + chèn nguyên tử trong RPC (khóa theo người học + kỳ thi), không chèn-rồi-xóa.
  const { data: lanThi, error: ltErr } = await admin.rpc("rpc_dao_tao_tao_luot_thi_that", {
    p_cau_hinh_id: ky.id,
    p_auth_user_id: user.id,
    p_form_thong_tin: form,
    p_seed: seed,
    p_so_cau: questions.length,
    p_thoi_gian_phut: ky.thoi_gian_phut,
    p_bat_dau_luc: batDau.toISOString(),
    p_han_nop_luc: hanNop.toISOString(),
    p_quota_report: report,
    p_de_snapshot: deSnapshot,
  });
  if (ltErr) throw ltErr;
  const res = lanThi as { success?: boolean; code?: string; id?: string; han_nop_luc?: string } | null;
  if (res?.success === false && res.code === "HET_LUOT") throw new Error("Bạn đã hết lượt thi cho kỳ này.");
  if (!res?.success || !res.id) throw new Error("Không tạo được lần thi.");

  return { lanThiId: res.id, hanNopLuc: res.han_nop_luc as string };
}

/** DT-006: lượt ADMIN đã hủy — người học không mở/nộp/lưu được. */
const LUOT_HUY_MESSAGE = "Lượt thi này đã bị hủy.";

export async function getLanThiForTake(lanThiId: string) {
  const { user } = await requireDaoTaoUser();
  lanThiId = parseDaoTaoInput(daoTaoIdSchema, lanThiId);
  const admin = createAdminSupabaseClient();
  const { data: lanThi, error } = await admin
    .from("dao_tao_lan_thi")
    .select("*")
    .eq("id", lanThiId)
    .maybeSingle();
  if (error) throw error;
  if (!lanThi) throw new Error("Không tìm thấy lần thi.");

  // Bài của người khác: chỉ quản trị Thi KSNK (khớp cổng admin), không đủ quyền view.
  let isAdminViewer = false;
  if (lanThi.auth_user_id !== user.id) {
    try {
      await requireDaoTaoAdmin();
      isAdminViewer = true;
    } catch {
      throw new Error("Không tìm thấy lần thi.");
    }
  }

  if (lanThi.trang_thai === "huy") throw new Error(LUOT_HUY_MESSAGE);
  const submitted = lanThi.trang_thai !== "dang_lam";
  if (isAdminViewer && !submitted) {
    throw new Error("Chỉ xem được bài đã nộp.");
  }

  // DT-008 (PO 2026-11-12): thi thật chưa đóng kỳ → người học chỉ thấy điểm và đúng/sai từng câu.
  // Admin xem bài người khác không bị ẩn. Thiếu cấu hình kỳ → ẩn (an toàn).
  let giauDapAn = false;
  if (submitted && !isAdminViewer && lanThi.che_do === "thi_that") {
    const { data: ky } = lanThi.cau_hinh_id
      ? await admin.from("dao_tao_cau_hinh").select("trang_thai").eq("id", lanThi.cau_hinh_id).maybeSingle()
      : { data: null };
    giauDapAn = ky?.trang_thai !== "closed";
  }

  const snap = (lanThi.de_snapshot ?? []) as DeSnapshotItem[];
  const questions = snap
    .slice()
    .sort((a, b) => a.thu_tu - b.thu_tu)
    .map((c) => ({
      id: c.id,
      thuTu: c.thu_tu,
      loai: c.loai,
      stem: c.stem,
      clinicalVignette: c.clinical_vignette ?? null,
      bloomCode: c.bloom_code ?? null,
      chuDeMa: c.chu_de_ma,
      chuDeTen: c.chu_de_ten ?? null,
      targetRoles: c.target_roles ?? [],
      sopRefs: c.sop_refs ?? [],
      options: submitted && !giauDapAn
        ? c.options
        : c.options.map((o) => ({ id: o.id, noiDung: o.noiDung, displayIndex: o.displayIndex })),
      traLoi: c.tra_loi,
      ...(submitted
        ? {
            dung: c.dung,
            ...(giauDapAn
              ? {}
              : {
            giaiThich: c.giai_thich,
            dapAnDung: c.dap_an_dung,
            distractorRationales: c.distractor_rationales ?? {},
            evidenceLock: c.evidence_lock ?? {},
            })}
        : {}),
    }));

  return {
    lanThi: {
      id: lanThi.id,
      cheDo: lanThi.che_do,
      trangThai: lanThi.trang_thai,
      batDauLuc: lanThi.bat_dau_luc,
      hanNopLuc: lanThi.han_nop_luc,
      nopLuc: lanThi.nop_luc,
      diemSo: lanThi.diem_so,
      diemToiDa: lanThi.diem_toi_da,
      diemPct: lanThi.diem_pct,
      dat: lanThi.dat,
      soCau: lanThi.so_cau,
    },
    questions,
    serverNow: new Date().toISOString(),
  };
}

export async function saveTraLoiCau(rawInput: {
  lanThiId: string;
  cauId: string;
  traLoi: TraLoi;
}) {
  const { user } = await requireDaoTaoUser();
  const input = parseDaoTaoInput(saveTraLoiInputSchema, rawInput);
  const admin = createAdminSupabaseClient();

  // Hai lần tự lưu song song cùng đọc–sửa–ghi cả de_snapshot → mất câu trả lời.
  // Khóa lạc quan theo updated_at: ghi trượt (0 dòng) thì đọc lại rồi thử tiếp.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data: lanThi } = await admin
      .from("dao_tao_lan_thi")
      .select("id, auth_user_id, trang_thai, de_snapshot, han_nop_luc, updated_at")
      .eq("id", input.lanThiId)
      .maybeSingle();
    if (!lanThi || lanThi.auth_user_id !== user.id) return { ok: false as const, error: "Không tìm thấy lần thi." };
    if (lanThi.trang_thai === "huy") return { ok: false as const, error: LUOT_HUY_MESSAGE };
    if (lanThi.trang_thai !== "dang_lam") return { ok: false as const, error: "Bài đã nộp." };
    // DT-007 (PO 2026-11-12): ân hạn 30 giây chỉ để nộp bài, không để ghi thêm câu trả lời.
    if (Date.now() > new Date(lanThi.han_nop_luc).getTime()) {
      return { ok: false as const, error: "Đã hết giờ làm bài — không thể lưu thêm câu trả lời." };
    }

    const cur = ((lanThi.de_snapshot ?? []) as DeSnapshotItem[]).find((item) => item.id === input.cauId);
    if (!cur) return { ok: false as const, error: "Câu hỏi không thuộc đề thi này." };
    const optionIds = new Set((cur.options ?? []).map((o) => o.id));
    const t = input.traLoi;
    const gui =
      t.kind === "single"
        ? t.optionId === null ? [] : [t.optionId]
        : t.kind === "multi"
          ? t.optionIds
          : t.kind === "order"
            ? t.orderedOptionIds
            : Object.keys(t.byOptionId);
    if (gui.some((id) => !optionIds.has(id))) {
      return { ok: false as const, error: "Phương án không thuộc câu hỏi này." };
    }

    const snap = ((lanThi.de_snapshot ?? []) as DeSnapshotItem[]).map((item) =>
      item.id === input.cauId ? { ...item, tra_loi: input.traLoi } : item,
    );

    let query = admin
      .from("dao_tao_lan_thi")
      .update({ de_snapshot: snap, updated_at: new Date().toISOString() })
      .eq("id", input.lanThiId)
      .eq("trang_thai", "dang_lam");
    query = lanThi.updated_at ? query.eq("updated_at", lanThi.updated_at) : query.is("updated_at", null);
    const { data: written, error } = await query.select("id");
    if (error) throw error;
    if (written?.length) return { ok: true as const };
  }
  throw new Error("Không lưu được câu trả lời do nhiều thao tác cùng lúc — vui lòng thử lại.");
}

export async function submitLanThi(lanThiId: string) {
  const { user } = await requireDaoTaoUser();
  lanThiId = parseDaoTaoInput(daoTaoIdSchema, lanThiId);
  const admin = createAdminSupabaseClient();
  const { data: lanThi, error } = await admin
    .from("dao_tao_lan_thi")
    .select("*")
    .eq("id", lanThiId)
    .maybeSingle();
  if (error) throw error;
  if (!lanThi || lanThi.auth_user_id !== user.id) throw new Error("Không tìm thấy lần thi.");
  if (lanThi.trang_thai === "huy") throw new Error(LUOT_HUY_MESSAGE);
  if (lanThi.trang_thai !== "dang_lam") {
    return { lanThiId, alreadySubmitted: true };
  }

  const now = Date.now();
  const han = new Date(lanThi.han_nop_luc).getTime();
  const late = now > han + LATE_GRACE_MS;
  const hetGio = now > han;

  const snap = ((lanThi.de_snapshot ?? []) as DeSnapshotItem[]).map((c) => ({
    ...c,
    dung: gradeAnswer(c.dap_an_dung, c.tra_loi),
  }));

  const scored = scoreAttempt(
    snap.map((c) => ({ dapAnDung: c.dap_an_dung, traLoi: c.tra_loi })),
  );

  let dat: boolean | null = null;
  if (lanThi.che_do === "thi_that" && lanThi.cau_hinh_id) {
    const { data: ky } = await admin
      .from("dao_tao_cau_hinh")
      .select("diem_dat_pct")
      .eq("id", lanThi.cau_hinh_id)
      .maybeSingle();
    // PO 2026-10-24 (DT-2): nộp trễ quá ân hạn 30 giây = không đạt.
    if (ky?.diem_dat_pct != null) dat = !late && scored.pct >= Number(ky.diem_dat_pct);
  }

  const { data: written, error: uErr } = await admin
    .from("dao_tao_lan_thi")
    .update({
      de_snapshot: snap,
      nop_luc: new Date().toISOString(),
      diem_so: scored.dung,
      diem_toi_da: scored.tong,
      diem_pct: scored.pct,
      dat,
      trang_thai: hetGio || late ? "het_gio" : "da_nop",
      updated_at: new Date().toISOString(),
    })
    .eq("id", lanThiId)
    .eq("trang_thai", "dang_lam")
    .select("id");
  if (uErr) throw uErr;
  // Khóa lạc quan: nộp song song, bản thứ hai không ghi đè điểm.
  if (!written?.length) return { lanThiId, alreadySubmitted: true };

  return {
    lanThiId,
    diemPct: scored.pct,
    dat,
    trangThai: hetGio || late ? "het_gio" : "da_nop",
  };
}

export async function getChungChiCuaToi(): Promise<ChungChiStatus> {
  const { user } = await requireDaoTaoUser();
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dao_tao_lan_thi")
    .select("cau_hinh_id, nop_luc")
    .eq("auth_user_id", user.id)
    .eq("che_do", "thi_that")
    .eq("dat", true)
    .in("trang_thai", ["da_nop", "het_gio"])
    .not("nop_luc", "is", null)
    .order("nop_luc", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.nop_luc) {
    return resolveChungChi({
      lastPassNopLuc: null,
      lastPassKyTen: null,
      hanThang: 12,
      nowIso: new Date().toISOString(),
    });
  }
  let kyTen: string | null = null;
  let gan: unknown = null;
  if (data.cau_hinh_id) {
    const { data: ky } = await admin
      .from("dao_tao_cau_hinh")
      .select("ten, gan")
      .eq("id", data.cau_hinh_id)
      .maybeSingle();
    kyTen = (ky?.ten as string | undefined) ?? null;
    gan = ky?.gan;
  }
  return resolveChungChi({
    lastPassNopLuc: data.nop_luc as string,
    lastPassKyTen: kyTen,
    hanThang: parseHanChungChiThang(gan),
    nowIso: new Date().toISOString(),
  });
}
