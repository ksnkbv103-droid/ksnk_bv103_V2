import { emptyFkToNull, normalizeNullableFk } from "./fk-normalize";
import { getDanhMucItemById } from "./repository";

/** Chuẩn P1: mọi khoa/phòng FK lưu vào fact → chỉ nhận id tồn tại, đang hoạt động trong dm_khoa_phong. */
export async function normalizeAndValidateDmKhoaPhong(params: {
  supabase: any;
  idRaw: unknown;
  fieldLabel: string;
  activeOnly?: boolean;
}): Promise<string | null> {
  const { supabase, idRaw, fieldLabel, activeOnly } = params;
  const raw = emptyFkToNull(idRaw);
  const id = await normalizeNullableFk(supabase, "dm_khoa_phong", idRaw);
  if (raw && !id) {
    throw new Error(
      `${fieldLabel}: id không thuộc Danh mục Khoa phòng (dm_khoa_phong). Vui lòng chọn từ màn Khoa phòng hoặc xuất Excel.`,
    );
  }
  await validateDanhMucIdByType({
    supabase,
    id,
    maLoai: "KHOA_PHONG",
    fieldLabel,
    activeOnly,
  });
  return id;
}

export async function validateDanhMucIdByType(params: {
  supabase: any;
  id?: string | null;
  maLoai: string;
  fieldLabel: string;
  activeOnly?: boolean;
}) {
  const { supabase, id, maLoai, fieldLabel, activeOnly = true } = params;
  if (!id) return;
  /** Chỉ FK tới dm_khoa_phong (Postgres). */
  if (maLoai === "KHOA_PHONG") {
    const { data: khoa, error } = await supabase
      .from("dm_khoa_phong")
      .select("id, is_active")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`${fieldLabel}: ${error.message}`);
    if (!khoa?.id)
      throw new Error(
        `${fieldLabel}: id không tồn tại trong Danh mục Khoa phòng (dm_khoa_phong). Vui lòng chọn đúng id từ Danh mục Khoa phòng.`,
      );
    if (activeOnly && khoa.is_active === false) throw new Error(`${fieldLabel} đã ngưng hoạt động.`);
    return;
  }
  const item = await getDanhMucItemById(supabase, id);
  if (!item) throw new Error(`${fieldLabel} không tồn tại.`);
  if (activeOnly && !item.is_active) throw new Error(`${fieldLabel} đã ngưng hoạt động.`);
  if (item.loai_danh_muc !== maLoai) {
    throw new Error(`${fieldLabel} không hợp lệ hoặc không thuộc loại ${maLoai}.`);
  }
}

export async function validateDanhMucItemExactType(params: {
  supabase: any;
  id?: string | null;
  expectedType: string;
  fieldLabel: string;
  activeOnly?: boolean;
}) {
  const { supabase, id, expectedType, fieldLabel, activeOnly = true } = params;
  if (!id) return;
  const item = await getDanhMucItemById(supabase, id);
  if (!item) throw new Error(`${fieldLabel} không tồn tại.`);
  if (activeOnly && !item.is_active) throw new Error(`${fieldLabel} đang ngưng hoạt động.`);
  if (item.loai_danh_muc !== expectedType) {
    throw new Error(`${fieldLabel} không đúng loại ${expectedType}.`);
  }
}
