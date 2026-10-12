# Bàn giao & onboarding — KSNK BV103

> **Việc còn mở:** §5 dưới đây.  
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
- Đang dùng: [`implementation-mapping.md`](implementation-mapping.md) và [`../wiki/entities.md`](../wiki/entities.md).
- Chủ đề → một file: [`../ssot-map.md`](../ssot-map.md). Mục lục skill: [`skills-catalog.md`](skills-catalog.md).

## 5. Lộ trình rà soát (cửa đang theo)

Một chủ đề một bản đang dùng ([`ssot-map.md`](../ssot-map.md)). Toàn bộ nhật ký và kế hoạch cũ đã lưu trong git log.

| Mốc | Việc | Trạng thái | Model |
|------|------|------------|-------|
| 2026-09-28 | Mốc golive các module chính | Không sửa code theo audit cũ nếu lệch domain-spec | — |
| 2026-10-08 | Nợ Phase B #85–#93 (GSC scope, CSSD close/QC, NKBV hết cắt dòng, đào tạo, deps) | Đã lên `main`. Không thấy phá §2.1 VST | — |
| 2026-10-09 | Form VST: nhãn TRƯỚC/SAU + trần app #94–#97 | Đã lên `main` | — |
| 2026-10-09 | KPI `fn_vst_is_valid_opportunity` #98 `63884e3a`, prod history `20261008225611` | Đã siết: rửa/chà 1–2 thời điểm WHO, bỏ sót đúng 1. 32 034 dòng, 0 dòng rời mẫu số | — |
| 2026-10-09 | Vòng sửa: `/domain-slice` | Khi SSOT đã chốt thì tự chọn một lát. SSOT im thì hỏi PO. Không tự quét cả repo | — |
| 2026-10-10 | Rà soát toàn hệ thống + sửa theo lát (NKBV khoa/loại trừ chỉ KSNK/4 tab, GSC xóa mềm, Đào tạo hết giờ, trang lỗi, CSSD cổng cấp phát ở DB, nhả mẻ implant từ DB). 4 migration `20261010120000…150000` đã apply prod qua MCP | Xong | — |
| 2026-10-10 | PO chốt mẻ hỏng → bộ còn trong CSSD về **Đóng gói**. Code + migration `20261010160000` xong ở local; zod + nhật ký cho CRUD danh mục quản trị xong | Đã apply prod migration `20261010160000` (PO duyệt) | — |
| 2026-10-12 | **Đóng băng NKBV, CSSD (ERP + sự cố), QLCV, Đào tạo** — prod 11/10: NKBV 1 phiếu, CSSD 10 chu trình thử, QLCV 0 việc, Đào tạo 1 lần thi. Giữ code và menu; không mở lát mới, không rà soát, không nâng cấp riêng cho đến khi PO báo có pilot thật (người dùng + điều kiện: HIS/LIS cho NKBV, máy quét + tổ CSSD cho CSSD). Lỗi bảo mật/hỏng build vẫn sửa | Đang áp dụng | — |
| 2026-10-12 | **Đánh giá tổng thể** (build/lint 0 lỗi/1926 test pass; prod Supabase = repo; Vercel production READY). Kết luận: nghiệp vụ VST/GSC bám SSOT và dùng thật; phần thừa là bộ máy quản trị (≈110 lệnh npm, 222 migration, NKBV ≈54k dòng chưa ai dùng). Dấu vết Cursor trong repo đã gỡ; lịch sử git còn trailer `Co-authored-by: Cursor` (không viết lại lịch sử đã push) | Xong | — |
| Mở (ưu tiên 1) | VST/GSC: nhãn «chưa đủ mẫu» (n < 20) trên bảng khoa (KTC Wilson VST đã có ở biểu đồ khoa); **thẻ độ phủ giám sát** (số khoa/giờ/ca đã giám sát so với kế hoạch); đo độ tin cậy giữa người giám sát (đối chiếu 2 người); spec VST/GSC còn thiếu | Cần PO chốt cách đo độ phủ | Sonnet |
| Mở (ưu tiên 2) | Bảo mật prod (advisor 2026-10-12): view `v_mdm_nhan_su_picker` SECURITY DEFINER (ERROR, kiểm tra có chủ ý không) · 4 hàm `fn_*` thiếu `search_path` · bật chặn mật khẩu rò rỉ ở Auth · `rpc_gsc_*` SECURITY DEFINER gọi được bởi `authenticated` (xác nhận có kiểm quyền trong thân hàm) | Migration prod cần PO duyệt | Sonnet |
| Mở | Nguồn ngưỡng 85/70 và 90/85 (quyết định Hội đồng KSNK nào) · đo lượt xem báo cáo (cần migration) · sao lưu prod định kỳ | Chờ PO | — |
| Mở | Zod chi tiết cho nhập lô (smart-import, generic-dm-import) và duyệt đề nghị danh mục | Lát riêng | Sonnet |
| Mở | Xóa phiên VST đang là `is_active=false` | Chờ PO — không tự đổi xóa cứng | Sonnet (khi PO chốt đổi) |
| Mở | UAT tay form VST (≤2 / ≤1, chữ ô chọn đọc được) | PO | Haiku (soát/UAT) |
| Không mở | Ký nghiệm thu lâm sàng toàn repo; vá giao diện VST thêm | — | — |

Model: Haiku cho đọc/soát (UAT, explore-module, db-verify) · Sonnet cho sửa code · Opus chỉ khi debug hoặc kiến trúc khó.

File SQL repo: `supabase/migrations/20261008221231_vst_valid_opp_moment_cap.sql`. Không đổi tên cho khớp timestamp prod.
