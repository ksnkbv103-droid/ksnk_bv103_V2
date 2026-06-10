# SOP — Link Auth ↔ `mdm_nhan_su` (Phase 6.2)

> Metric: `mdm_email_no_auth` từ [`scripts/sql/auth-pilot-precheck.sql`](../scripts/sql/auth-pilot-precheck.sql). **Go-live yêu cầu = 0** cho nhân sự pilot active.

## Precheck

```bash
npm run trial:auth:precheck        # Supabase linked
npm run trial:auth:precheck:local  # Docker local
```

Cột quan trọng:

| Metric | Ý nghĩa |
|--------|---------|
| `mdm_email_no_auth` | Email trong `extra_data` nhưng chưa có `auth.users` |
| `auth_no_mdm_profile` | User Auth không map nhân sự (cảnh báo) |

Email SSOT trên nhân sự: `mdm_nhan_su.extra_data->>'email'` (không cột vật lý).

## Các bước link (Quản trị)

1. `/quan-tri-he-thong/tai-khoan-nhan-su` — tab tài khoản.
2. Với từng nhân sự pilot có email nhưng chưa Auth:
   - **Tạo / mời** user Supabase Auth (cùng email).
   - **Gán** `auth_user_id` hoặc dùng luồng link tự động trên UI (nếu có).
3. Gán role / permission pilot (GSC, VST, QLCV, CSSD tùy wave).
4. Chạy lại `trial:auth:precheck` → `mdm_email_no_auth` = 0.

## Pilot users (Phase 0 audit)

Phase 0 ghi nhận **8** email chưa link trên staging — cần xử lý trước W1 prod.

## Không làm

- Không commit `.env` / service role key.
- Không tạo Auth user hàng loạt bằng script production nếu chưa có danh sách email duyệt KSNK.

## Verify sau link

```bash
npm run trial:auth:precheck
npm run verify:admin
```

User thử đăng nhập `/login` → sidebar đúng quyền → một kịch bản mỗi module đã ký checklist.
