/** Thông báo lỗi Supabase/PostgREST dễ hành động (QLCV). */

const SCHEMA_CACHE_RE =
  /schema cache|could not find the 'checklist' column|fn_qlcv_update_checklist|muc_do_uu_tien|khoa_thuc_hien_id|fact_cong_viec_dinh_ky|qlcv_fact_cong_viec_dinh_ky|PGRST202|PGRST204|PGRST200|42703/i;

export function formatQlcvDbError(message: string): string {
  if (SCHEMA_CACHE_RE.test(message)) {
    return (
      "Cơ sở dữ liệu chưa có cột checklist hoặc PostgREST chưa reload schema. " +
      "Chạy: npm run mdm:migrate (hoặc mdm:migrate:local), rồi khởi động lại Supabase local (supabase stop && supabase start). " +
      "Chi tiết: docs/modules/qlcv/README.md"
    );
  }
  return message;
}

export function throwQlcvDbError(error: { message?: string } | null | undefined, fallback: string): never {
  throw new Error(formatQlcvDbError(error?.message?.trim() || fallback));
}
