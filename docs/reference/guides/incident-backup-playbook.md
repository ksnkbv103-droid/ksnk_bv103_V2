# Playbook sự cố & backup/restore — KSNK BV103

> Sổ tay 1 trang cho IT on-call. Auth/RBAC chi tiết: [`../../core/operations-sop.md`](../../core/operations-sop.md).  
> Squash migration rủi ro cao: [`migration-squash-runbook.md`](./migration-squash-runbook.md).

## 1. Phân loại sự cố

| Mức | Ví dụ | Phản ứng |
|-----|--------|----------|
| P0 | Không login, mất dữ liệu fact, RLS chặn toàn bộ NV | Khôi phục dịch vụ ≤ 1h; giữ audit |
| P1 | Module một wave lỗi (QLCV/CSSD), import fail hàng loạt | Hotfix + communicate user |
| P2 | Chậm báo cáo, UI lệch | Ticket sprint; đo `pg_stat_statements` trước |

## 2. Checklist 15 phút (P0/P1)

1. Xác nhận môi trường (prod / staging) và flag `KSNK_PILOT_CORE_MODULES`.
2. Vercel / hosting: deploy gần nhất, rollback nếu deploy là nguyên nhân.
3. Supabase status + Auth: user pilot còn session không.
4. Chạy (staging/local trước nếu nghi schema):

```bash
npm run trial:db:precheck        # hoặc :local
npm run trial:auth:precheck
npm run verify:engineering
```

5. Nếu nghi migration: **không** `repair` bừa — đối chiếu `supabase migration list` + PO xác nhận.
6. Ghi timeline: triệu chứng → lệnh → kết quả → ai quyết định.

## 3. Backup

| Nguồn | Việc | Tần suất đề xuất |
|-------|------|------------------|
| Supabase Dashboard → Database → Backups | Xác nhận PITR / daily backup bật trên project prod | Kiểm tra mỗi go-live wave |
| Trước squash / repair | Snapshot hoặc export bảng nhạy cảm (`mdm_nhan_su`, `gstt_fact_*`, `cssd_fact_*`, `qlcv_fact_*`) | Mỗi lần ops phá hủy |
| Local | `npx supabase db dump -f /tmp/bv103-local-$(date +%Y%m%d).sql` (khi Docker chạy) | Trước thí nghiệm schema |

## 4. Restore drill (bắt buộc mỗi quý hoặc trước W2/W3 prod)

| Bước | Ai | Pass |
|------|----|------|
| 1. Chọn backup / dump gần nhất | IT | File/restore point xác định |
| 2. Restore lên **project staging** hoặc local Docker (không đụng prod) | IT | DB lên được |
| 3. `npm run trial:db:precheck:local` (hoặc linked staging) | IT | Không blocker |
| 4. Login 1 user KSNK + mở 1 màn W1 | IT + KSNK | UI load |
| 5. Ghi ngày drill vào bảng dưới | IT | |

| Ngày drill | Môi trường | Kết quả | Người |
|------------|------------|---------|-------|
| | | ☐ Pass ☐ Fail | |

## 5. Liên hệ & escalate

- Token Supabase hết hạn → Account Access Tokens (chặn linked precheck).
- Auth lệch nhân sự → [`auth-pilot-link-sop.md`](./auth-pilot-link-sop.md).
- Nghiêng quyền 5 vai trò → `npm run trial:rbac:roles` / `:local`.
