"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission, verifyPermissions } from "@/lib/server-permission";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import {
  type LoaiMucSoCan,
  type PhanHeHauCan,
  type LoaiSuCoHauCan,
  type SoCanRow,
  type SuCoRow,
  type NgayGiuongRow,
  type ThongKeKyHauCan,
} from "../types";
import {
  computeThongKeKyHauCan,
  generateInsightsHauCan,
  type CanhBaoGoiY,
} from "../lib/chat-thai-do-vai-core";

const LOAI_MUC_VALUES = [
  "CT_LAY_NHIEM_SAC_NHON",
  "CT_LAY_NHIEM_CON_LAI",
  "CT_THONG_THUONG",
  "DO_VAI_BAN_THUONG",
  "DO_VAI_BAN_LAY_NHIEM",
  "DO_VAI_SACH_VE",
] as const satisfies readonly LoaiMucSoCan[];

const MODULE_KEY = "HAU_CAN_MOI_TRUONG";

const ymdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD.")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Ngày không hợp lệ.");

const khoangNgaySchema = z
  .object({ tuNgay: ymdSchema, denNgay: ymdSchema })
  .refine((v) => v.tuNgay <= v.denNgay, "Từ ngày phải nhỏ hơn hoặc bằng đến ngày.");

const soCanEntriesSchema = z.partialRecord(
  z.enum(LOAI_MUC_VALUES),
  z.object({
    khoi_luong_kg: z.number().finite(),
    so_tui: z.number().int().min(0).nullish(),
    ghi_chu: z.string().nullish(),
  })
);

const suCoInputSchema = z.object({
  id: z.string().uuid().optional(),
  ngay_ghi_nhan: ymdSchema,
  phan_he: z.enum(["CHAT_THAI", "DO_VAI"]),
  loai_su_co: z.enum([
    "TUI_RACH",
    "HOP_KHONG_DONG_NAP",
    "PHAN_LOAI_SAI",
    "LAN_SAC_NHON_DO_VAI",
    "DO_VAI_RACH_HONG",
    "KHAC",
  ]),
  khoa_lien_quan_id: z.string().uuid().nullish(),
  mo_ta: z.string().nullish(),
});

const ngayGiuongSchema = z.object({
  nam: z.number().int().min(2020).max(2100),
  thang: z.number().int().min(1).max(12),
  so_ngay_giuong: z.number().finite(),
  ghi_chu: z.string().optional(),
});

function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
}

export interface SoCanDayInput {
  khoi_luong_kg: number;
  so_tui?: number | null;
  ghi_chu?: string | null;
}

export interface SaveSoCanResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Lấy số liệu sổ cân của một ngày cụ thể (trả về dictionary theo loai_muc).
 */
export async function getSoCanNgay(
  ngay: string
): Promise<Partial<Record<LoaiMucSoCan, SoCanRow>>> {
  await verifyPermission(MODULE_KEY, "view");
  ngay = ymdSchema.parse(ngay);
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("ctyt_dovai_fact_so_can")
    .select("id, ngay_can, loai_muc, khoi_luong_kg, so_tui, ghi_chu, nguoi_ghi_id, is_active, created_at")
    .eq("ngay_can", ngay)
    .eq("is_active", true);

  if (error) {
    console.error("[chat-thai-do-vai] getSoCanNgay error:", error);
    return {};
  }

  const result: Partial<Record<LoaiMucSoCan, SoCanRow>> = {};
  for (const row of (data ?? []) as SoCanRow[]) {
    result[row.loai_muc] = row;
  }
  return result;
}

/**
 * Lưu sổ cân ngày toàn viện (upsert cả 6 nhóm mục).
 */
export async function saveSoCanNgay(
  ngay: string,
  entries: Partial<Record<LoaiMucSoCan, SoCanDayInput>>
): Promise<SaveSoCanResult> {
  const parsedNgay = ymdSchema.safeParse(ngay);
  if (!parsedNgay.success) return { success: false, error: firstIssue(parsedNgay.error) };
  const parsedEntries = soCanEntriesSchema.safeParse(entries);
  if (!parsedEntries.success) return { success: false, error: firstIssue(parsedEntries.error) };
  const safeEntries = parsedEntries.data;

  const admin = createAdminSupabaseClient();
  try {
    // Phải có ít nhất quyền tạo hoặc sửa mới được tra bản ghi hiện có.
    const keys = Object.keys(safeEntries) as LoaiMucSoCan[];
    await verifyPermission(MODULE_KEY, "view");
    const { data: existing, error: existErr } = keys.length
      ? await admin
          .from("ctyt_dovai_fact_so_can")
          .select("loai_muc")
          .eq("ngay_can", ngay)
          .in("loai_muc", keys)
      : { data: [], error: null };
    if (existErr) return { success: false, error: existErr.message };
    // Upsert vào bản ghi đã có thực chất là sửa -> cần quyền edit; bản ghi mới -> create.
    const hasExisting = (existing ?? []).length > 0;
    const hasNew = keys.length > (existing ?? []).length;
    await verifyPermissions([
      ...(hasExisting ? [{ moduleKey: MODULE_KEY, action: "edit" }] : []),
      ...(hasNew || !hasExisting ? [{ moduleKey: MODULE_KEY, action: "create" }] : []),
    ]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Không có quyền nhập số liệu.";
    return { success: false, error: msg };
  }

  const nhanSuId = await getActorNhanSuId();

  const upsertRows = Object.entries(safeEntries).map(([loai, val]) => ({
    ngay_can: ngay,
    loai_muc: loai as LoaiMucSoCan,
    khoi_luong_kg: Math.max(0, Number(val?.khoi_luong_kg) || 0),
    so_tui: val?.so_tui != null ? Number(val.so_tui) : null,
    ghi_chu: val?.ghi_chu ? String(val.ghi_chu).trim() : null,
    nguoi_ghi_id: nhanSuId,
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  if (upsertRows.length === 0) {
    return { success: true, message: "Không có dữ liệu thay đổi." };
  }

  const { error } = await admin
    .from("ctyt_dovai_fact_so_can")
    .upsert(upsertRows, { onConflict: "ngay_can, loai_muc" });

  if (error) {
    console.error("[chat-thai-do-vai] saveSoCanNgay error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/chat-thai-do-vai");
  revalidatePath("/bao-cao-tong-hop");
  return { success: true, message: `Đã lưu thành công số liệu ngày ${ngay}` };
}

/**
 * Lấy lịch sử sổ cân trong khoảng ngày (phục vụ bảng và đồ thị).
 */
export async function getSoCanHistory(
  tuNgay: string,
  denNgay: string
): Promise<SoCanRow[]> {
  await verifyPermission(MODULE_KEY, "view");
  ({ tuNgay, denNgay } = khoangNgaySchema.parse({ tuNgay, denNgay }));
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("ctyt_dovai_fact_so_can")
    .select("id, ngay_can, loai_muc, khoi_luong_kg, so_tui, ghi_chu, nguoi_ghi_id, is_active, created_at")
    .gte("ngay_can", tuNgay)
    .lte("ngay_can", denNgay)
    .eq("is_active", true)
    .order("ngay_can", { ascending: false });

  if (error) {
    console.error("[chat-thai-do-vai] getSoCanHistory error:", error);
    return [];
  }

  return (data ?? []) as SoCanRow[];
}

/**
 * Ghi nhận hoặc cập nhật sự cố an toàn sinh học.
 */
export async function saveSuCo(input: {
  id?: string;
  ngay_ghi_nhan: string;
  phan_he: PhanHeHauCan;
  loai_su_co: LoaiSuCoHauCan;
  khoa_lien_quan_id?: string | null;
  mo_ta?: string | null;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  const parsed = suCoInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  input = parsed.data;

  try {
    await verifyPermission(MODULE_KEY, input.id ? "edit" : "create");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Không có quyền ghi sự cố.";
    return { success: false, error: msg };
  }

  const admin = createAdminSupabaseClient();
  const nhanSuId = await getActorNhanSuId();

  const payload = {
    ngay_ghi_nhan: input.ngay_ghi_nhan,
    phan_he: input.phan_he,
    loai_su_co: input.loai_su_co,
    khoa_lien_quan_id: input.khoa_lien_quan_id || null,
    mo_ta: input.mo_ta ? input.mo_ta.trim() : null,
    nguoi_ghi_id: nhanSuId,
    is_active: true,
  };

  if (input.id) {
    const { error } = await admin
      .from("ctyt_dovai_fact_su_co")
      .update(payload)
      .eq("id", input.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await admin.from("ctyt_dovai_fact_su_co").insert(payload);
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/chat-thai-do-vai");
  revalidatePath("/bao-cao-tong-hop");
  return { success: true, message: "Đã lưu sự cố an toàn sinh học" };
}

/**
 * Xóa mềm sự cố.
 */
export async function deleteSuCo(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const parsedId = z.string().uuid("Mã sự cố không hợp lệ.").safeParse(id);
  if (!parsedId.success) return { success: false, error: firstIssue(parsedId.error) };
  try {
    await verifyPermission(MODULE_KEY, "delete");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Không có quyền xóa sự cố.";
    return { success: false, error: msg };
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("ctyt_dovai_fact_su_co")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/chat-thai-do-vai");
  revalidatePath("/bao-cao-tong-hop");
  return { success: true };
}

/**
 * Danh sách sự cố trong kỳ (có tên khoa).
 */
export async function getSuCoList(
  tuNgay: string,
  denNgay: string
): Promise<SuCoRow[]> {
  await verifyPermission(MODULE_KEY, "view");
  ({ tuNgay, denNgay } = khoangNgaySchema.parse({ tuNgay, denNgay }));
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("ctyt_dovai_fact_su_co")
    .select(
      `id, ngay_ghi_nhan, phan_he, loai_su_co, khoa_lien_quan_id, mo_ta, nguoi_ghi_id, is_active, created_at,
       khoa:khoa_lien_quan_id ( ten_khoa )`
    )
    .gte("ngay_ghi_nhan", tuNgay)
    .lte("ngay_ghi_nhan", denNgay)
    .eq("is_active", true)
    .order("ngay_ghi_nhan", { ascending: false });

  if (error) {
    console.error("[chat-thai-do-vai] getSuCoList error:", error);
    return [];
  }

  type SuCoJoinRow = Omit<SuCoRow, "ten_khoa"> & { khoa: { ten_khoa: string | null } | null };
  return ((data ?? []) as unknown as SuCoJoinRow[]).map((row) => ({
    id: row.id,
    ngay_ghi_nhan: row.ngay_ghi_nhan,
    phan_he: row.phan_he,
    loai_su_co: row.loai_su_co,
    khoa_lien_quan_id: row.khoa_lien_quan_id,
    ten_khoa: row.khoa?.ten_khoa || null,
    mo_ta: row.mo_ta,
    nguoi_ghi_id: row.nguoi_ghi_id,
    is_active: row.is_active,
    created_at: row.created_at,
  }));
}

/**
 * Lấy danh mục ngày giường theo năm.
 */
export async function getNgayGiuongList(nam?: number): Promise<NgayGiuongRow[]> {
  await verifyPermission(MODULE_KEY, "view");
  nam = ngayGiuongSchema.shape.nam.optional().parse(nam);
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("ctyt_dovai_dm_ngay_giuong")
    .select("id, nam, thang, so_ngay_giuong, ghi_chu")
    .order("nam", { ascending: false })
    .order("thang", { ascending: false });

  if (nam) {
    query = query.eq("nam", nam);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[chat-thai-do-vai] getNgayGiuongList error:", error);
    return [];
  }
  return (data ?? []) as NgayGiuongRow[];
}

/**
 * Lưu mẫu số ngày giường theo tháng.
 */
export async function saveNgayGiuong(
  nam: number,
  thang: number,
  so_ngay_giuong: number,
  ghi_chu?: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = ngayGiuongSchema.safeParse({ nam, thang, so_ngay_giuong, ghi_chu });
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  try {
    await verifyPermission(MODULE_KEY, "edit");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Không có quyền cập nhật mẫu số.";
    return { success: false, error: msg };
  }

  const admin = createAdminSupabaseClient();
  const nhanSuId = await getActorNhanSuId();

  const { error } = await admin.from("ctyt_dovai_dm_ngay_giuong").upsert(
    {
      nam,
      thang,
      so_ngay_giuong: Math.max(0, Number(so_ngay_giuong) || 0),
      ghi_chu: ghi_chu ? ghi_chu.trim() : null,
      nguoi_cap_nhat_id: nhanSuId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "nam, thang" }
  );

  if (error) return { success: false, error: error.message };

  revalidatePath("/chat-thai-do-vai");
  revalidatePath("/bao-cao-tong-hop");
  return { success: true };
}

/**
 * Lấy danh mục khoa phòng đang hoạt động (dùng cho dropdown sự cố).
 */
export async function listKhoaPhongDropdown(): Promise<{ id: string; ma_khoa: string; ten_khoa: string }[]> {
  await verifyPermission(MODULE_KEY, "view");
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("mdm_dm_khoa_phong")
    .select("id, ma_khoa, ten_khoa")
    .eq("is_active", true)
    .order("ten_khoa");

  if (error) {
    console.error("[chat-thai-do-vai] listKhoaPhongDropdown error:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Thống kê toàn diện kỳ báo cáo (9 chỉ số + gợi ý KSNK).
 */
export async function getThongKeKyAction(
  tuNgay: string,
  denNgay: string
): Promise<{ stats: ThongKeKyHauCan; insights: CanhBaoGoiY[] }> {
  await verifyPermission(MODULE_KEY, "view");
  ({ tuNgay, denNgay } = khoangNgaySchema.parse({ tuNgay, denNgay }));
  const admin = createAdminSupabaseClient();

  const [soCanRes, suCoRes, ngayGiuongRes] = await Promise.all([
    admin
      .from("ctyt_dovai_fact_so_can")
      .select("id, ngay_can, loai_muc, khoi_luong_kg, so_tui, ghi_chu, nguoi_ghi_id, is_active, created_at")
      .gte("ngay_can", tuNgay)
      .lte("ngay_can", denNgay)
      .eq("is_active", true),
    admin
      .from("ctyt_dovai_fact_su_co")
      .select("id, ngay_ghi_nhan, phan_he, loai_su_co, khoa_lien_quan_id, mo_ta, nguoi_ghi_id, is_active, created_at")
      .gte("ngay_ghi_nhan", tuNgay)
      .lte("ngay_ghi_nhan", denNgay)
      .eq("is_active", true),
    admin
      .from("ctyt_dovai_dm_ngay_giuong")
      .select("id, nam, thang, so_ngay_giuong, ghi_chu"),
  ]);

  const soCanRows: SoCanRow[] = (soCanRes.data ?? []) as SoCanRow[];
  const suCoRows: SuCoRow[] = (suCoRes.data ?? []) as SuCoRow[];
  const ngayGiuongRows: NgayGiuongRow[] = (ngayGiuongRes.data ?? []) as NgayGiuongRow[];

  // Lọc ngày giường tương ứng với tháng/năm nằm trong kỳ [tuNgay, denNgay]
  // So khớp chuỗi YYYY-MM (ngày đã là lịch VN) — không trộn Date UTC với Date local.
  const thangTu = tuNgay.slice(0, 7);
  const thangDen = denNgay.slice(0, 7);
  const filteredNgayGiuong = ngayGiuongRows.filter((g) => {
    const key = `${g.nam}-${String(g.thang).padStart(2, "0")}`;
    return key >= thangTu && key <= thangDen;
  });

  const stats = computeThongKeKyHauCan(soCanRows, filteredNgayGiuong, suCoRows, tuNgay, denNgay);
  const insights = generateInsightsHauCan(stats);

  return { stats, insights };
}
