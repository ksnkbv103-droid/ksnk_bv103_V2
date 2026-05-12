## Một export cho Supabase service role (bỏ alias `createSafeServerClient`)

- **Vấn đề:** Alias `createSafeServerClient` trùng hành vi với `createAdminSupabaseClient` (bypass RLS) nhưng tên gợi ý “an toàn”, dễ hiểu nhầm khi review hoặc onboard.
- **Phương án A:** Đổi tên dài kiểu `createAdminClientAfterPermissionCheck` — rõ ràng nhưng thêm một symbol mới, vẫn hai cách gọi cùng một thứ.
- **Phương án B:** Chỉ giữ `createAdminSupabaseClient`, JSDoc nhấn mạnh “chỉ sau verify”, xóa alias — một nguồn sự thật, grep đơn giản.
- **Chọn:** **B** — **Lý do:** Giảm nhầm lẫn, khớp AGENTS (RLS là lớp bổ sung; gate tầng app bắt buộc với service role).
