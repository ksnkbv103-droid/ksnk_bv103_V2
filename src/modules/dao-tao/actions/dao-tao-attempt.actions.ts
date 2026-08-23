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
import { requireDaoTaoUser } from "@/modules/dao-tao/lib/dao-tao-auth";
import { randomUUID } from "crypto";

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
  chu_de_ma: string;
  stem: string;
  giai_thich: string | null;
  options: Array<{ id: string; noiDung: string; displayIndex: number; tfDung?: boolean | null }>;
  dap_an_dung: DapAnDung;
  tra_loi: TraLoi | null;
  dung: boolean | null;
};

function mapBankRows(
  rows: Array<{
    id: string;
    chu_de_ma: string;
    loai: string;
    bloom_level: number;
    stem: string;
    giai_thich: string | null;
    dap_an_dung: DapAnDung;
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
      loai: r.loai as BankQuestion["loai"],
      bloomLevel: r.bloom_level as BankQuestion["bloomLevel"],
      stem: r.stem,
      giaiThich: r.giai_thich,
      dapAnDung: r.dap_an_dung,
      options: opts,
    };
  });
}

async function loadActiveBank(chuDeMas?: string[]) {
  const admin = createAdminSupabaseClient();
  let q = admin
    .from("dao_tao_cau_hoi")
    .select(
      "id, chu_de_ma, loai, bloom_level, stem, giai_thich, dap_an_dung, phuong_an",
    )
    .eq("is_active", true);
  if (chuDeMas?.length) q = q.in("chu_de_ma", chuDeMas);
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
    chu_de_ma: q.chuDeMa,
    stem: q.stem,
    giai_thich: q.giaiThich ?? null,
    options: q.options,
    dap_an_dung: q.dapAnDung,
    tra_loi: null,
    dung: null,
  }));
}

function validateForm(form: ExamFormThongTin) {
  if (!form.hoTen?.trim()) throw new Error("Vui lòng nhập họ tên.");
  if (!form.khoaDonVi?.trim()) throw new Error("Vui lòng nhập khoa / đơn vị.");
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

export async function startThiThuAttempt(input: {
  mucDoId: string;
  form: ExamFormThongTin;
}) {
  const { user } = await requireDaoTaoUser();
  validateForm(input.form);
  const admin = createAdminSupabaseClient();

  const { data: mucDo, error: mdErr } = await admin
    .from("dao_tao_cau_hinh")
    .select("*")
    .eq("id", input.mucDoId)
    .eq("loai_cau_hinh", "thi_thu_muc_do")
    .eq("is_active", true)
    .maybeSingle();
  if (mdErr) throw mdErr;
  if (!mucDo) throw new Error("Mức độ thi thử không tồn tại.");

  const bank = await loadActiveBank(
    Array.isArray(mucDo.chu_de_mas) && mucDo.chu_de_mas.length
      ? mucDo.chu_de_mas
      : undefined,
  );
  if (bank.length === 0) throw new Error("Ngân hàng câu hỏi trống. Vui lòng import trước.");

  const seed = randomUUID();
  const { questions, report } = selectBalancedExam({
    bank,
    soCau: mucDo.so_cau,
    bloomQuota: (mucDo.bloom_quota ?? {}) as Record<string, number>,
    loaiQuota: (mucDo.loai_quota ?? {}) as Record<string, number>,
    seed,
    shuffleCau: mucDo.shuffle_cau !== false,
    shuffleDapAn: mucDo.shuffle_dap_an !== false,
  });

  const batDau = new Date();
  const hanNop = new Date(batDau.getTime() + mucDo.thoi_gian_phut * 60_000);
  const deSnapshot = snapshotsToDeJson(questions);

  const { data: lanThi, error: ltErr } = await admin
    .from("dao_tao_lan_thi")
    .insert({
      che_do: "thi_thu",
      cau_hinh_id: mucDo.id,
      auth_user_id: user.id,
      form_thong_tin: input.form,
      seed,
      so_cau: questions.length,
      thoi_gian_phut: mucDo.thoi_gian_phut,
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
    const { count } = await admin
      .from("dao_tao_lan_thi")
      .select("id", { count: "exact", head: true })
      .eq("cau_hinh_id", ky.id)
      .eq("auth_user_id", user.id)
      .in("trang_thai", ["da_nop", "het_gio"]);
    out.push({
      ...ky,
      soLanDaNop: count ?? 0,
      conLuot: (count ?? 0) < (ky.so_lan_cho_phep ?? 1),
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
  validateForm(input.form);
  const admin = createAdminSupabaseClient();

  const { data: ky, error: kErr } = await admin
    .from("dao_tao_cau_hinh")
    .select("*")
    .eq("id", input.kyThiId)
    .eq("loai_cau_hinh", "thi_that")
    .eq("trang_thai", "published")
    .eq("is_active", true)
    .maybeSingle();
  if (kErr) throw kErr;
  if (!ky) throw new Error("Kỳ thi không tồn tại hoặc chưa mở.");

  const assigned = await canAccessKyThiThat(admin, user.id, ky);
  if (!assigned) throw new Error("Bạn không được phân công kỳ thi này.");

  const { count } = await admin
    .from("dao_tao_lan_thi")
    .select("id", { count: "exact", head: true })
    .eq("cau_hinh_id", ky.id)
    .eq("auth_user_id", user.id)
    .in("trang_thai", ["da_nop", "het_gio", "dang_lam"]);
  if ((count ?? 0) >= (ky.so_lan_cho_phep ?? 1)) {
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

  const { data: lanThi, error: ltErr } = await admin
    .from("dao_tao_lan_thi")
    .insert({
      che_do: "thi_that",
      cau_hinh_id: ky.id,
      auth_user_id: user.id,
      form_thong_tin: input.form,
      seed,
      so_cau: questions.length,
      thoi_gian_phut: ky.thoi_gian_phut,
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

export async function getLanThiForTake(lanThiId: string) {
  const { user } = await requireDaoTaoUser();
  const admin = createAdminSupabaseClient();
  const { data: lanThi, error } = await admin
    .from("dao_tao_lan_thi")
    .select("*")
    .eq("id", lanThiId)
    .maybeSingle();
  if (error) throw error;
  if (!lanThi) throw new Error("Không tìm thấy lần thi.");

  let isAdminViewer = false;
  if (lanThi.auth_user_id !== user.id) {
    try {
      const { verifyPermission } = await import("@/lib/server-permission");
      await verifyPermission("DAO_TAO", "view");
      isAdminViewer = true;
    } catch {
      throw new Error("Không tìm thấy lần thi.");
    }
  }

  const submitted = lanThi.trang_thai !== "dang_lam";
  if (isAdminViewer && !submitted) {
    throw new Error("Chỉ xem được bài đã nộp.");
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
      options: c.options,
      traLoi: c.tra_loi,
      ...(submitted
        ? { dung: c.dung, giaiThich: c.giai_thich, dapAnDung: c.dap_an_dung }
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

export async function saveTraLoiCau(input: {
  lanThiId: string;
  cauId: string;
  traLoi: TraLoi;
}) {
  const { user } = await requireDaoTaoUser();
  const admin = createAdminSupabaseClient();
  const { data: lanThi } = await admin
    .from("dao_tao_lan_thi")
    .select("id, auth_user_id, trang_thai, de_snapshot")
    .eq("id", input.lanThiId)
    .maybeSingle();
  if (!lanThi || lanThi.auth_user_id !== user.id) throw new Error("Không tìm thấy lần thi.");
  if (lanThi.trang_thai !== "dang_lam") throw new Error("Bài đã nộp.");

  const snap = ((lanThi.de_snapshot ?? []) as DeSnapshotItem[]).map((item) =>
    item.id === input.cauId ? { ...item, tra_loi: input.traLoi } : item,
  );

  const { error } = await admin
    .from("dao_tao_lan_thi")
    .update({
      de_snapshot: snap,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.lanThiId);
  if (error) throw error;
  return { ok: true };
}

export async function submitLanThi(lanThiId: string) {
  const { user } = await requireDaoTaoUser();
  const admin = createAdminSupabaseClient();
  const { data: lanThi, error } = await admin
    .from("dao_tao_lan_thi")
    .select("*")
    .eq("id", lanThiId)
    .maybeSingle();
  if (error) throw error;
  if (!lanThi || lanThi.auth_user_id !== user.id) throw new Error("Không tìm thấy lần thi.");
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
    if (ky?.diem_dat_pct != null) dat = scored.pct >= Number(ky.diem_dat_pct);
  }

  const { error: uErr } = await admin
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
    .eq("id", lanThiId);
  if (uErr) throw uErr;

  return {
    lanThiId,
    diemPct: scored.pct,
    dat,
    trangThai: hetGio || late ? "het_gio" : "da_nop",
  };
}
