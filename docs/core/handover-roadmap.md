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
| 2026-10-12 | **Gỡ đóng băng** — PO xác nhận mục tiêu triển khai tất cả module. Hiện trạng prod 11/10: NKBV 1 phiếu, CSSD 10 chu trình thử, QLCV 0 việc, Đào tạo 1 lần thi = code có, chưa có người dùng thật. Điều kiện vào pilot: NKBV cần HIS/LIS, CSSD cần máy quét + tổ CSSD | Đang áp dụng | — |
| 2026-10-12 | **Đánh giá tổng thể** (build/lint 0 lỗi/1926 test pass; prod Supabase = repo; Vercel production READY). Kết luận: nghiệp vụ VST/GSC bám SSOT và dùng thật; phần thừa là bộ máy quản trị (≈110 lệnh npm, 222 migration). NKBV/CSSD/QLCV/Đào tạo đã có code lớn nhưng chưa có người dùng thật → việc thiếu là đưa vào pilot, không phải viết thêm. Dấu vết Cursor trong repo đã gỡ; lịch sử git còn trailer `Co-authored-by: Cursor` (không viết lại lịch sử đã push) | Xong | — |
| Mở (ưu tiên 1) | VST/GSC: nhãn «chưa đủ mẫu» (n < 20) trên bảng khoa (KTC Wilson VST đã có ở biểu đồ khoa); **thẻ độ phủ giám sát** (số khoa/giờ/ca đã giám sát so với kế hoạch); đo độ tin cậy giữa người giám sát (đối chiếu 2 người); spec VST/GSC còn thiếu | Cần PO chốt cách đo độ phủ | Sonnet |
| Mở (ưu tiên 2) | Bảo mật prod: advisor 2026-10-12 chỉ còn mục đã chủ ý giữ (xem migration `20261011090000`) + **bật chặn mật khẩu rò rỉ ở Supabase Auth** (PO bật trên dashboard) + 2 bảng RLS không policy (`cssd_fact_bowie_dick`, `sys_account_access_request`: xác nhận cố ý chỉ service_role) | PO bật Auth | — |
| Lát C1 | CSSD: thay `any` ở báo cáo/cột mẻ bằng kiểu thật. `any` CSSD-ERP 61 → 14 (còn hook `use-me-tiet-khuan-workflow`, `InventoryHistoryTable`, vài chỗ nhỏ). tsc, lint, `verify:cssd` pass | Xong 2026-10-12 | Sonnet |
| Lát C2 | CSSD: spec cho cổng nghiệp vụ mẻ (QC, thu hồi, nhả implant) + kịch bản tay ≥3 cho tổ CSSD | Code xong 2026-10-12: `persist-me-tiet-khuan.spec.ts` 16 ca; 5 kịch bản tay K1–K5 ở `docs/modules/cssd/18-CSSD-PHIEU-ME-TIET-KHUAN-SSOT.md`; Claude đã chạy thử trên DB local (K1–K3 giao diện, K4 RPC, K5 chưa). Chờ tổ CSSD chạy tay | Sonnet |
| Rà soát K0 | **Rà kho dụng cụ + hóa chất + thiết bị/bảo trì + sự cố (2026-10-12)** — phát hiện ghi ở các lát K/H/T/S bên dưới. «Vật tư» chưa có bảng riêng (chỉ nhãn «Kho hóa chất / vật tư», `cssd_dm_loai_bao_goi` là danh mục) → cần PO định nghĩa trước khi làm lát V1. Chưa rà: quản trị Loại/Bộ (`bo-dung-cu-chi-tiet-panel` 701 dòng, import), kiểm kê kho (`cssd_fact_kho_kiem_ke`), màn Luân chuyển | Xong rà | Opus |
| Lát K1 | Kho dụng cụ: **khóa 9 hàm nội bộ `fn_cssd_*`** (anon/authenticated gọi được `fn_cssd_apply_instrument_ledger_tx` không qua kiểm quyền) + CHECK dấu số lượng theo loại giao dịch (NOT VALID). Migration `20261012100000` | Local xong + thử RPC; **chờ PO duyệt apply prod** | Opus |
| Lát K2 | Kho dụng cụ: khóa đua khi kiểm tồn (`pg_advisory_xact_lock` theo bộ+loại), chuyển cấu phần theo id thay vì tên, **điều chuyển bắt buộc bộ đích?** (hiện thiếu đích → tồn biến mất khỏi sổ) | Cần PO trả lời câu điều chuyển | Opus |
| Lát K3 | Duyệt đổi danh mục: bước claim → áp BOM → `BOM_APPROVED` chưa nguyên tử; hàng chờ + lịch sử tải hết phiếu rồi lọc ở Node (chuyển lọc/phân trang về server) | Chưa | Sonnet |
| Lát H2 | Kho hóa chất: xuất/điều chỉnh đọc tồn rồi mới ghi (không nguyên tử → xuất đồng thời gây tồn âm) → RPC có khóa theo hóa chất+lô; bảng `cssd_fact_kho_hoa_chat_giao_dich` **chưa có cột người thao tác** (thêm `nguoi_thuc_hien_id`); `tonTaiLo` tải toàn bộ giao dịch của hóa chất mỗi lần xuất | Chưa | Sonnet |
| Lát T1 | Thiết bị/bảo trì: bắt đầu/kết thúc/hủy là 2–3 lệnh rời (phiếu xong nhưng máy kẹt `REPAIRING` nếu bước sau lỗi); chưa chặn 2 phiếu mở cùng một máy (cần index duy nhất phiếu `DANG_THUC_HIEN`/máy); cột `nguoi_thuc_hien_id` có nhưng không ghi; thẩm định 3 BI âm chỉ là chuỗi tự khai, chưa đối chiếu hồ sơ BI (N-ME-3) | Chưa | Sonnet |
| Lát S1 | Sự cố: phân quyền các action đã đúng cổng; còn rà `su-co-report.application.ts` (539 dòng, hoàn tác bù trừ `executeIncidentReportAndRollback`), `void-incident`, `createIncidentReport` ném lỗi thay vì trả `{success}` | Chưa rà sâu | Opus |
| Lát V1 | Vật tư: PO định nghĩa phạm vi (bao gói, găng, chỉ thị hóa học… có quản tồn không) | Chờ PO | — |
| Lát N1 | NKBV: thay `any` (`GiamSatNkbvPage` 13, `useNkbvChecklistModalState` 12, `write.actions` 7); tách `NkbvBaMultiTimelineWorkspace` (1984 dòng), `NkbvSyndromeIwpPanel` (1744) — chỉ sau khi có test khóa hành vi | Chưa | Sonnet |
| Lát Q1 | QLCV: kịch bản tay ≥3 + e2e mở rộng (đã có `qlcv-pilot`) | Chưa | Sonnet |
| Lát D1 | Đào tạo: spec cho `dao-tao-attempt.actions` (chấm điểm, hết giờ), `dao-tao-auth`; e2e làm bài | Chưa | Sonnet |
| Lát H1 | Gọn bộ máy: 110 lệnh npm → nhóm theo `verify`/`ops`; bỏ lệnh trùng (`*:local`/`linked` giữ, `cssd:demo:reset(:local)` trùng) | Chưa | Haiku/Sonnet |
| Mở (ưu tiên 3) | **Đưa 4 module chưa dùng vào pilot thật**, theo thứ tự CSSD → NKBV → QLCV → Đào tạo: chọn khoa/tổ pilot, ≥3 kịch bản tay, đo lại số liệu sau 2 tuần. Nợ kỹ thuật đo được 2026-10-12: Đào tạo 0 spec; NKBV 36 file > 400 dòng + 56 `any`; CSSD-ERP 61 `any`; e2e chỉ có cho CSSD, QLCV, GSC/VST | Cần PO chọn khoa/tổ | Sonnet |
| Mở | Nguồn ngưỡng 85/70 và 90/85 (quyết định Hội đồng KSNK nào) · đo lượt xem báo cáo (cần migration) · sao lưu prod định kỳ | Chờ PO | — |
| Mở | Zod chi tiết cho nhập lô (smart-import, generic-dm-import) và duyệt đề nghị danh mục | Lát riêng | Sonnet |
| Mở | Xóa phiên VST đang là `is_active=false` | Chờ PO — không tự đổi xóa cứng | Sonnet (khi PO chốt đổi) |
| Mở | UAT tay form VST (≤2 / ≤1, chữ ô chọn đọc được) | PO | Haiku (soát/UAT) |
| Không mở | Ký nghiệm thu lâm sàng toàn repo; vá giao diện VST thêm | — | — |

Model: Haiku cho đọc/soát (UAT, explore-module, db-verify) · Sonnet cho sửa code · Opus chỉ khi debug hoặc kiến trúc khó.

File SQL repo: `supabase/migrations/20261008221231_vst_valid_opp_moment_cap.sql`. Không đổi tên cho khớp timestamp prod.
