/** Thông báo lỗi Supabase/PostgREST dễ hành động (QLCV). */

const SCHEMA_CACHE_RE =
  /schema cache|could not find the 'checklist' column|fn_qlcv_update_checklist|muc_do_uu_tien|khoa_thuc_hien_id|qlcv_fact_cong_viec_dinh_ky|qlcv_fact_cong_viec_dinh_ky|PGRST202|PGRST204|PGRST200|42703/i;

export function formatQlcvDbError(message: string): string {
  if (SCHEMA_CACHE_RE.test(message)) {
    return (
      "Cơ sở dữ liệu / schema API chưa khớp với app (thiếu cột hoặc PostgREST chưa reload). " +
      "App trỏ cloud: chạy `npm run mdm:migrate` (đẩy migration lên project Supabase). " +
      "Chỉ dùng local: `npm run mdm:migrate:local` rồi `supabase stop && supabase start`. " +
      "Chi tiết: docs/modules/qlcv/README.md"
    );
  }
  return message;
}

export function throwQlcvDbError(error: { message?: string } | null | undefined, fallback: string): never {
  throw new Error(formatQlcvDbError(error?.message?.trim() || fallback));
}
