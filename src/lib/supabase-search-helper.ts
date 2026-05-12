/**
 * Supabase Search Helper
 * 
 * Tạo chuỗi filter .or() cho tìm kiếm text trên nhiều cột (ILike).
 * Hỗ trợ làm sạch (sanitize) từ khóa để tránh lỗi cú pháp trong câu lệnh .or() của Supabase.
 * 
 * Tham chiếu: Playbook mục 3e (Smart DB - Server Search)
 */

export function buildSupabaseSearchFilter(searchTerm: string | undefined | null, fields: string[]): string | null {
  const term = searchTerm?.trim();
  if (!term || !fields.length) return null;

  /**
   * Làm sạch từ khóa: 
   * 1. Loại bỏ dấu phẩy (,) vì dấu phẩy là ký tự phân cách các điều kiện trong chuỗi .or()
   * 2. Loại bỏ dấu ngoặc () và các ký tự có thể gây lỗi cú pháp logic.
   * 3. Chuyển nhiều khoảng trắng thành một.
   */
  const sanitized = term
    .replace(/[,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) return null;

  // Tạo chuỗi định dạng: field1.ilike.%term%,field2.ilike.%term%...
  return fields
    .map(field => `${field}.ilike.%${sanitized}%`)
    .join(",");
}
