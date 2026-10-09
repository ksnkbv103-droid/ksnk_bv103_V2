# Bàn giao & onboarding — KSNK BV103

> **Việc còn mở:** §5 dưới đây. Kế hoạch H2 gốc (kho): [`../archive/plans/architecture/roadmap-2026h2.md`](../archive/plans/architecture/roadmap-2026h2.md).  
> **SSOT schema:** [`implementation-mapping.md`](implementation-mapping.md)

## 1. Cấu trúc app (tóm tắt)

| Thư mục | Vai trò |
|---------|---------|
| `src/app/` | Route mỏng |
| `src/modules/` | DDD: `auth`, `dashboard`, `giam-sat-*`, `cssd-erp`, `quan-ly-cong-viec`, `quan-tri-he-thong` |
| `src/lib/` | RBAC, domain thuần, MDM gateway, validations |

## 2. Onboarding nhanh

```bash
cp .env.example .env.local
npm run trial:prep
npm run dev
```

Verify trước push: `npm run verify` (full) — xem [`lean-execution.md`](lean-execution.md).

## 3. Pilot DoD (một mảnh)

1. Ai dùng / khoa pilot  
2. 3 kịch bản tay  
3. Migration + RPC đã apply  
4. `npm run verify:engineering` (hoặc `verify` trước push)

## 4. Wiki & tài liệu

- Tổng hợp module: [`../wiki/entities.md`](../wiki/entities.md)  
- Kho tổng quan 30/05 (không mở khi sửa): [`../archive/plans/architecture/system-overview.md`](../archive/plans/architecture/system-overview.md). Đang dùng: [`implementation-mapping.md`](implementation-mapping.md) và [`../wiki/entities.md`](../wiki/entities.md).
- Chủ đề → một file: [`../ssot-map.md`](../ssot-map.md). Mục lục skill: [`skills-catalog.md`](skills-catalog.md).

## 5. Lộ trình rà soát (cửa đang theo)

Phase 0–5 tháng 5: [`../archive/plans/architecture/roadmap-2026h2.md`](../archive/plans/architecture/roadmap-2026h2.md) — kế hoạch gốc, không phải việc tuần này.

Một chủ đề một bản đang dùng ([`ssot-map.md`](../ssot-map.md)). Nhật ký lát và plan tháng 9 nằm ở [`../archive/`](../archive/). Khi chúng mâu thuẫn SSOT, SSOT thắng — ví dụ dòng VST-02 «1–5 mọi hành động» trong nhật ký golive đã thu hồi.

| Mốc | Việc | Trạng thái |
|------|------|------------|
| 2026-09-28 | Nhật ký golive / soft trong [`../archive/slice-journals/`](../archive/slice-journals/) | Mốc. Không sửa code theo audit nếu lệch domain-spec |
| 2026-10-08 | Nợ Phase B #85–#93 (GSC scope, CSSD close/QC, NKBV hết cắt dòng, đào tạo, deps) | Đã lên `main`. Không thấy phá §2.1 VST |
| 2026-10-09 | Form VST: nhãn TRƯỚC/SAU + trần app #94–#97 | Đã lên `main` |
| 2026-10-09 | KPI `fn_vst_is_valid_opportunity` #98 `63884e3a`, prod history `20261008225611` | Đã siết: rửa/chà 1–2 thời điểm WHO, bỏ sót đúng 1. 32 034 dòng, 0 dòng rời mẫu số |
| 2026-10-09 | Vòng sửa: rule `05-domain-auto-slice` + `/domain-slice` | Khi SSOT đã chốt thì tự chọn một lát. SSOT im thì hỏi PO. Không tự quét cả repo |
| Mở | Xóa phiên VST đang là `is_active=false` | Chờ PO — không tự đổi xóa cứng |
| Mở | UAT tay form VST (≤2 / ≤1, chữ ô chọn đọc được) | PO |
| Không mở | Ký nghiệm thu lâm sàng toàn repo; vá giao diện VST thêm | — |

File SQL repo: `supabase/migrations/20261008221231_vst_valid_opp_moment_cap.sql`. Không đổi tên cho khớp timestamp prod.
