"use server";

import { splitCoverage, type AssignedStaff } from "@/lib/dao-tao/coverage";
import {
  labelChungChiKind,
  parseHanChungChiThang,
  resolveChungChi,
  type ChungChiKind,
} from "@/lib/dao-tao/chung-chi";
import { parseGan } from "@/lib/dao-tao/labels";
import { verifyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { requireDaoTaoUser } from "@/modules/dao-tao/lib/dao-tao-auth";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

export async function listMucDoThiThu() {
  await requireDaoTaoUser();
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dao_tao_cau_hinh")
    .select("*")
    .eq("loai_cau_hinh", "thi_thu_muc_do")
    .eq("is_active", true)
    .order("thu_tu");
  if (error) throw error;
  return data ?? [];
}

export async function updateMucDoThiThu(input: {
  id: string;
  so_cau: number;
  thoi_gian_phut: number;
  bloom_quota?: Record<string, number>;
  loai_quota?: Record<string, number>;
}) {
  await verifyPermission("DAO_TAO", "edit");
  const admin = createAdminSupabaseClient();
  const patch: Record<string, unknown> = {
    so_cau: input.so_cau,
    thoi_gian_phut: input.thoi_gian_phut,
    updated_at: new Date().toISOString(),
  };
  if (input.bloom_quota) patch.bloom_quota = input.bloom_quota;
  if (input.loai_quota) patch.loai_quota = input.loai_quota;
  const { error } = await admin
    .from("dao_tao_cau_hinh")
    .update(patch)
    .eq("id", input.id)
    .eq("loai_cau_hinh", "thi_thu_muc_do");
  if (error) throw error;
  return { ok: true };
}

export type KyThiInput = {
  ten: string;
  mo_ta?: string;
  so_cau: number;
  thoi_gian_phut: number;
  diem_dat_pct: number;
  bloom_quota?: Record<string, number>;
  loai_quota?: Record<string, number>;
  chu_de_mas?: string[];
  so_lan_cho_phep?: number;
  shuffle_cau?: boolean;
  shuffle_dap_an?: boolean;
  han_chung_chi_thang?: number;
};

export async function createKyThiThat(input: KyThiInput) {
  await verifyPermission("DAO_TAO", "create");
  const { user } = await requireDaoTaoUser();
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dao_tao_cau_hinh")
    .insert({
      loai_cau_hinh: "thi_that",
      ten: input.ten,
      mo_ta: input.mo_ta ?? null,
      so_cau: input.so_cau,
      thoi_gian_phut: input.thoi_gian_phut,
      diem_dat_pct: input.diem_dat_pct,
      bloom_quota: input.bloom_quota ?? {
        "1": 0.25,
        "2": 0.3,
        "3": 0.3,
        "4": 0.15,
        "5": 0,
      },
      loai_quota: input.loai_quota ?? {
        single: 0.5,
        multi: 0.2,
        true_false_cluster: 0.15,
        order: 0.15,
      },
      chu_de_mas: input.chu_de_mas ?? [],
      gan: {
        khoa_ids: [],
        nhan_su_ids: [],
        han_chung_chi_thang: parseHanChungChiThang({
          han_chung_chi_thang: input.han_chung_chi_thang,
        }),
      },
      so_lan_cho_phep: input.so_lan_cho_phep ?? 1,
      shuffle_cau: input.shuffle_cau ?? true,
      shuffle_dap_an: input.shuffle_dap_an ?? true,
      trang_thai: "draft",
      created_by: user.id,
      is_active: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateKyThiThat(
  id: string,
  patch: Partial<KyThiInput> & { trang_thai?: "draft" | "published" | "closed" },
) {
  await verifyPermission("DAO_TAO", "edit");
  const admin = createAdminSupabaseClient();
  if (patch.trang_thai === "published") {
    const { data: current } = await admin
      .from("dao_tao_cau_hinh")
      .select("gan")
      .eq("id", id)
      .eq("loai_cau_hinh", "thi_that")
      .maybeSingle();
    const gan = parseGan(current?.gan);
    if (!gan.khoa_ids.length && !gan.nhan_su_ids.length) {
      throw new Error("Chưa gán khoa hoặc nhân viên — không mở thi được.");
    }
  }
  const { data, error } = await admin
    .from("dao_tao_cau_hinh")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("loai_cau_hinh", "thi_that")
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listKyThiThatAdmin() {
  await verifyPermission("DAO_TAO", "view");
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dao_tao_cau_hinh")
    .select("*")
    .eq("loai_cau_hinh", "thi_that")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function setKyThiGan(input: {
  kyThiId: string;
  khoaPhongIds?: string[];
  nhanSuIds?: string[];
  hanChungChiThang?: number;
}) {
  await verifyPermission("DAO_TAO", "edit");
  const admin = createAdminSupabaseClient();
  const { data: current, error: readErr } = await admin
    .from("dao_tao_cau_hinh")
    .select("gan")
    .eq("id", input.kyThiId)
    .eq("loai_cau_hinh", "thi_that")
    .maybeSingle();
  if (readErr) throw readErr;
  const prev = current?.gan;
  const { error } = await admin
    .from("dao_tao_cau_hinh")
    .update({
      gan: {
        khoa_ids: input.khoaPhongIds ?? [],
        nhan_su_ids: input.nhanSuIds ?? [],
        han_chung_chi_thang:
          input.hanChungChiThang != null
            ? parseHanChungChiThang({ han_chung_chi_thang: input.hanChungChiThang })
            : parseHanChungChiThang(prev),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.kyThiId)
    .eq("loai_cau_hinh", "thi_that");
  if (error) throw error;
  return { ok: true };
}

export type KetQuaKyThiRow = {
  id: string;
  cau_hinh_id: string | null;
  kyTen: string;
  hoTen: string;
  khoaId: string | null;
  khoaTen: string;
  khoaMa: string | null;
  diem_so: number | null;
  diem_toi_da: number | null;
  diem_pct: number | null;
  dat: boolean | null;
  trang_thai: string;
  nop_luc: string | null;
  so_cau: number;
  chungChiKind: ChungChiKind;
  chungChiLabel: string;
  hetHanLuc: string | null;
};

export async function listKetQuaKyThi(filters?: { kyThiId?: string; khoaId?: string }) {
  await verifyPermission("DAO_TAO", "view");
  const admin = createAdminSupabaseClient();
  const kyThiId = filters?.kyThiId;
  const khoaId = filters?.khoaId;
  let q = admin
    .from("dao_tao_lan_thi")
    .select(
      "id, cau_hinh_id, auth_user_id, form_thong_tin, diem_so, diem_toi_da, diem_pct, dat, trang_thai, nop_luc, so_cau",
    )
    .eq("che_do", "thi_that")
    .in("trang_thai", ["da_nop", "het_gio"])
    .order("nop_luc", { ascending: false })
    .limit(500);
  if (kyThiId) q = q.eq("cau_hinh_id", kyThiId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];
  const kyIds = [...new Set(rows.map((r) => r.cau_hinh_id).filter(Boolean))] as string[];
  const authIds = [...new Set(rows.map((r) => r.auth_user_id).filter(Boolean))] as string[];
  const [{ data: kys }, { data: nss }] = await Promise.all([
    kyIds.length
      ? admin.from("dao_tao_cau_hinh").select("id, ten, gan").in("id", kyIds)
      : Promise.resolve({ data: [] as Array<{ id: string; ten: string; gan?: unknown }> }),
    authIds.length
      ? admin
          .from("mdm_nhan_su")
          .select("ho_ten, khoa_id, auth_user_id")
          .in("auth_user_id", authIds)
      : Promise.resolve({
          data: [] as Array<{ ho_ten: string | null; khoa_id: string | null; auth_user_id: string | null }>,
        }),
  ]);
  const khoaIds = [...new Set((nss ?? []).map((n) => n.khoa_id).filter(Boolean))] as string[];
  const { data: khoas } = khoaIds.length
    ? await admin.from("mdm_dm_khoa_phong").select("id, ten_khoa, ma_khoa").in("id", khoaIds)
    : { data: [] as Array<{ id: string; ten_khoa: string; ma_khoa: string }> };
  const kyMap = Object.fromEntries((kys ?? []).map((k) => [k.id, k.ten]));
  const kyGanMap = Object.fromEntries((kys ?? []).map((k) => [k.id, k.gan]));
  const nowIso = new Date().toISOString();
  const nsByAuth = Object.fromEntries((nss ?? []).map((n) => [n.auth_user_id ?? "", n]));
  const khoaMap = Object.fromEntries((khoas ?? []).map((k) => [k.id, k]));
  const out: KetQuaKyThiRow[] = rows.map((r) => {
    const ns = nsByAuth[r.auth_user_id as string];
    const khoa = ns?.khoa_id ? khoaMap[ns.khoa_id] : null;
    const form = r.form_thong_tin as { hoTen?: string; khoaDonVi?: string } | null;
    const kyTen = (r.cau_hinh_id ? kyMap[r.cau_hinh_id as string] : null) ?? "—";
    const dat = r.dat as boolean | null;
    const nopLuc = r.nop_luc as string | null;
    const chungChi = resolveChungChi({
      lastPassNopLuc: dat === true ? nopLuc : null,
      lastPassKyTen: kyTen,
      hanThang: parseHanChungChiThang(r.cau_hinh_id ? kyGanMap[r.cau_hinh_id as string] : null),
      nowIso,
    });
    return {
      id: r.id as string,
      cau_hinh_id: (r.cau_hinh_id as string | null) ?? null,
      kyTen,
      hoTen: ns?.ho_ten || form?.hoTen || "—",
      khoaId: ns?.khoa_id ?? null,
      khoaTen: formatKhoaCompactLabel({
        ma_khoa: khoa?.ma_khoa,
        ten_khoa: khoa?.ten_khoa ?? form?.khoaDonVi,
      }),
      khoaMa: khoa?.ma_khoa ?? null,
      diem_so: r.diem_so as number | null,
      diem_toi_da: r.diem_toi_da as number | null,
      diem_pct: r.diem_pct as number | null,
      dat,
      trang_thai: r.trang_thai as string,
      nop_luc: nopLuc,
      so_cau: r.so_cau as number,
      chungChiKind: chungChi.kind,
      chungChiLabel: labelChungChiKind(chungChi.kind),
      hetHanLuc: chungChi.hetHanLuc,
    };
  });
  return khoaId ? out.filter((r) => r.khoaId === khoaId) : out;
}

export async function listChuaNopKyThi(kyThiId: string) {
  await verifyPermission("DAO_TAO", "view");
  const admin = createAdminSupabaseClient();
  const { data: ky, error } = await admin
    .from("dao_tao_cau_hinh")
    .select("id, ten, gan")
    .eq("id", kyThiId)
    .eq("loai_cau_hinh", "thi_that")
    .maybeSingle();
  if (error) throw error;
  if (!ky) throw new Error("Không tìm thấy kỳ thi.");
  const gan = parseGan(ky.gan);
  const selectNs = "id, ho_ten, ma_nv, khoa_id, auth_user_id";
  const [byKhoa, byId] = await Promise.all([
    gan.khoa_ids.length
      ? admin.from("mdm_nhan_su").select(selectNs).eq("is_active", true).in("khoa_id", gan.khoa_ids)
      : Promise.resolve({ data: [] as never[], error: null }),
    gan.nhan_su_ids.length
      ? admin.from("mdm_nhan_su").select(selectNs).in("id", gan.nhan_su_ids)
      : Promise.resolve({ data: [] as never[], error: null }),
  ]);
  if (byKhoa.error) throw byKhoa.error;
  if (byId.error) throw byId.error;
  const map = new Map<string, (typeof byKhoa.data)[number]>();
  for (const s of [...(byKhoa.data ?? []), ...(byId.data ?? [])]) map.set(s.id, s);
  const raw = [...map.values()];
  const khoaIds = [...new Set(raw.map((s) => s.khoa_id).filter(Boolean))] as string[];
  const { data: khoas } = khoaIds.length
    ? await admin.from("mdm_dm_khoa_phong").select("id, ten_khoa, ma_khoa").in("id", khoaIds)
    : { data: [] as Array<{ id: string; ten_khoa: string; ma_khoa?: string }> };
  const khoaLabel = Object.fromEntries(
    (khoas ?? []).map((k) => [
      k.id,
      formatKhoaCompactLabel({ ma_khoa: k.ma_khoa, ten_khoa: k.ten_khoa }),
    ]),
  );
  const staff: AssignedStaff[] = raw.map((s) => ({
    id: s.id,
    hoTen: s.ho_ten ?? s.ma_nv ?? s.id.slice(0, 8),
    maNv: s.ma_nv,
    khoaId: s.khoa_id,
    khoaTen: (s.khoa_id && khoaLabel[s.khoa_id]) || "—",
    authUserId: s.auth_user_id,
  }));
  const { data: attempts, error: aErr } = await admin
    .from("dao_tao_lan_thi")
    .select("auth_user_id")
    .eq("cau_hinh_id", kyThiId)
    .in("trang_thai", ["da_nop", "het_gio"]);
  if (aErr) throw aErr;
  const submitted = (attempts ?? [])
    .map((a) => a.auth_user_id as string | null)
    .filter((id): id is string => Boolean(id));
  return { kyTen: ky.ten as string, ...splitCoverage(staff, submitted) };
}

export async function listKhoaPhongOptions() {
  await verifyPermission("DAO_TAO", "view");
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("mdm_dm_khoa_phong")
    .select("id, ten_khoa, ma_khoa")
    .eq("is_active", true)
    .order("ten_khoa")
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function listNhanSuOptions(filters?: { khoaIds?: string[]; q?: string }) {
  await verifyPermission("DAO_TAO", "view");
  const admin = createAdminSupabaseClient();
  let q = admin
    .from("mdm_nhan_su")
    .select("id, ho_ten, ma_nv, khoa_id")
    .eq("is_active", true)
    .order("ho_ten")
    .limit(400);
  if (filters?.khoaIds?.length) {
    q = q.in("khoa_id", filters.khoaIds);
  }
  const { data, error } = await q;
  if (error) throw error;
  const needle = (filters?.q ?? "").trim().toLowerCase();
  if (!needle) return data ?? [];
  return (data ?? []).filter(
    (r) =>
      (r.ho_ten ?? "").toLowerCase().includes(needle) ||
      (r.ma_nv ?? "").toLowerCase().includes(needle),
  );
}
