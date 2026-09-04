# ADR: Write path cho `cssd_fact_quy_trinh` / `cssd_fact_lo_tiet_khuan`

## Trạng thái

**Accepted (2026-09-04)** — local doc + migration DRAFT only. **Không** apply linked/prod đến khi gate ops-go-live pass + PO duyệt.

## Bối cảnh

| Bảng | RLS hiện tại (sau `20260603160000`) | Ghi app |
|------|-------------------------------------|---------|
| `cssd_fact_quy_trinh` | **SELECT** `CSSD_WORKFLOW.view` | `createAdminSupabaseClient` sau `verifyPermission` / `verifyCssdWorkflow*` |
| `cssd_fact_lo_tiet_khuan` | **SELECT** `CSSD_ME_TIET_KHUAN.view` | admin client sau `verifyCssdBatchEdit` / workflow scan |

Không có policy INSERT/UPDATE/DELETE → user JWT client không ghi được (deny mặc định khi RLS bật). Ghi production path = **service-role admin client** (bypass RLS) sau gate quyền ở server actions.

### Pattern project (fact CSSD khác)

Đã có **RLS write scoped** + comment «App vẫn ghi qua admin client; policy chặn user client không quyền»:

| Migration | Bảng | Write policy |
|-----------|------|--------------|
| `20260603160000` | `cssd_fact_lifecycle_event` | INSERT/UPDATE `CSSD_WORKFLOW.edit` |
| `20260603160000` | `cssd_fact_kho_chi_tiet` | INSERT/UPDATE/DELETE `CSSD_KHO_DUNGCU.*` |
| `20260709130000` | `cssd_fact_bao_tri`, `cssd_fact_kho_giao_dich`, `cssd_fact_kho_hoa_chat_giao_dich` | INSERT/UPDATE/DELETE module-scoped |
| `20260824120000` | `cssd_fact_su_co` | INSERT `BAO_SU_CO.create` (+ SELECT mở rộng) |

`quy_trinh` / `lo_tiet_khuan` là **ngoại lệ SELECT-only** so với các fact CSSD trên — lỗ hổng defense-in-depth nếu ai đó gọi user client trực tiếp.

## Quyết định

**Thêm RLS write scoped** (khớp pattern), **giữ** admin-client write có kiểm soát module ở app.

Không chọn «documented admin-only write» thuần vì project đã chuẩn hóa dual-layer (app gate + RLS) cho các fact CSSD peer.

### Policy đề xuất (DRAFT)

- **`cssd_fact_quy_trinh`**
  - INSERT: `CSSD_WORKFLOW` create|edit **hoặc** `CSSD_KHO_DUNGCU` create|edit|import
  - UPDATE: `CSSD_WORKFLOW` edit **hoặc** `CSSD_KHO_DUNGCU` edit **hoặc** `BAO_SU_CO` create (recall/hold từ sự cố)
  - DELETE: không mở
- **`cssd_fact_lo_tiet_khuan`**
  - INSERT/UPDATE: `CSSD_ME_TIET_KHUAN` edit **hoặc** `CSSD_WORKFLOW` edit
  - DELETE: không mở

SELECT giữ nguyên. Runtime admin write **không đổi** (service role bypass RLS).

### Ngoài phạm vi / follow-up

- `cssd_fact_quy_trinh_thanh_phan` — **đã DROP** trong lean hub (`20260622120000`); runtime BOM = `metadata.bom_lines[]`.
  - DRAFT defense-in-depth (IF EXISTS): `supabase/migrations/20260905120000_cssd_fact_quy_trinh_thanh_phan_write_rls_DRAFT.sql` — **không** apply linked/prod; no-op khi bảng không còn.
- Đổi app từ admin → user client — **không** trong ADR này.

## Hậu quả

- Defense-in-depth: JWT user thiếu quyền → thao tác ghi bị RLS chặn.
- Migration file: `supabase/migrations/20260904140000_cssd_fact_quy_trinh_lo_write_rls.sql` (**DRAFT** — comment chưa apply prod).
- Gate apply: [`ops-go-live.md`](../reference/guides/ops-go-live.md) §7.
- Không phá runtime hiện tại (admin path không phụ thuộc write policy).

## Verify

Sau apply Docker local (khong linked/prod):
1) User client thieu quyen -> ghi fail
2) Admin client + gate quyen -> ghi OK
3) local:golden:verify neu da apply local
