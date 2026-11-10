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

## 5. Lộ trình: thang L0–L3 (PO duyệt 2026-10-24)

Một chủ đề một bản đang dùng ([`ssot-map.md`](../ssot-map.md)). Nhật ký các lát cũ (SEC, ACC, KD, HC, TB, NK-*, CS-*, DT, GS, QL…) đã lưu trong git log trước commit này; không chép lại ở đây.

**Thang sẵn sàng (mỗi module)**

| Mức | Nghĩa | Điều kiện đạt |
|---|---|---|
| L0 | Code chạy | `verify:engineering` pass |
| **L1** | **Đưa chạy thử** | Có người dùng đầu mối thật · nhập một phiếu < 60 giây · ≥ 3 kịch bản tay · thống kê khớp tính tay |
| L2 | Chạy ổn định | Cổng nghiệp vụ nguyên tử · RLS đọc theo phạm vi · đã apply prod |
| L3 | Tự động hóa | Rules engine, HIS/LIS, quét mã, import hàng loạt |

Mỗi module có 3 màn: **Nhập · Danh sách/lịch sử · Thống kê** (KPI, biểu đồ, bảng, xuất). Nghiệp vụ đặc thù thêm sau khi 3 màn chạy. Chỉ làm lát L2/L3 khi module đã đạt L1 và người dùng báo vướng.

**Luật dừng rà soát**

- Chỉ mở lát gia cố khi: (a) hỏng/lộ dữ liệu ở đường người dùng **đang dùng**, hoặc (b) người dùng thật báo lỗi.
- Không giao agent «quét» module chưa có người dùng; lỗi tìm được ghi một dòng vào backlog bên dưới.
- Tối đa 5 lát mở cùng lúc. Một agent ghi/lần.
- Câu hỏi PO gom một phiên/tuần, mỗi câu kèm phương án mặc định «nếu PO im».
- Apply prod theo lô mỗi tuần (PO duyệt), không lẻ từng lát.

**Hiện trạng module** (prod 2026-10-11: NKBV 1 phiếu · CSSD 10 chu trình thử · QLCV 0 việc · Đào tạo 1 lần thi)

| Module | Mức | Người đầu mối | Việc tới L1 | Đang chặn |
|---|---|---|---|---|
| VST + GSC + thống kê | L1 (đang dùng thật) | Đã có | UAT tay form VST (≤2 / ≤1); nhãn «chưa đủ mẫu» n<20 ở bảng khoa; đo thời gian nhập phiếu | GS-1 RLS đọc cần ma trận «ai xem gì» (L2) |
| CSSD (+ sự cố) | L0, nhiều cổng L2 đã lên prod | Tổ CSSD: Nguyễn Thanh Bình (PO 2026-10-31) | K1–K5 ở SSOT 18 đã chạy tay qua UI trên DB local (Claude chạy thay tổ CSSD; PO chốt đạt 2026-11-01), chưa chạy trên prod/bộ Đóng gói thật; kho/hóa chất/BOM tạm nhập tay hoặc Excel | Người đầu mối; máy quét |
| NKBV | L0 | Chưa có | Ghi ca + danh sách + tỉ lệ; rules engine chỉ gợi ý, không chặn | HIS/LIS (L3); người đầu mối |
| QLCV | L0 | Nhóm KSNK | Tạo việc, giao, hạn, hoàn thành, xem theo người/khoa; kịch bản tay ≥ 3 | Câu QL-1 (quyền ghi chú, xóa cứng) |
| Đào tạo | L0 | Chưa có | Thi thử/thi thật + kết quả; kịch bản tay ≥ 3 | 3 câu DT-2 (thi thử dùng chung ngân hàng/lộ đáp án; nộp trễ > 30 giây vẫn «đạt») |

Thứ tự pilot theo khóa PO: CSSD → NKBV → QLCV → Đào tạo. QLCV/Đào tạo không cần phần cứng/HIS nên có thể chạy thử sớm hơn: **chờ PO xác nhận**.

**Đã lên prod (MCP):** K1, SEC-1, CS-ME, KD-1, CS-GATE, TB-1, HC-1, NK-AUTH, CSSD nhật ký chu kỳ + phiếu TK người/giờ + phương pháp theo Loại/cấu phần (2026-10-31, 8 migration `20261030*`), nhân sự mức quản lý chức vụ (`20261031010000`). **Chưa lên prod:** KD-4 (`20261021040000`, còn nợ khóa deadlock nhiều dòng + sổ ghi ngoài khóa).

**PO chốt 2026-10-24:** DT-2 nộp trễ > 30 giây = không đạt; thi thử ẩn đáp án đến khi nộp · QL-1 xóa mềm, ghi chú theo người tạo · NKBV đóng băng ở mức ghi ca + danh sách + tỉ lệ · kế hoạch 4 tuần: VST funnel/run chart → QLCV → CSSD tay + sửa Đào tạo → đo lại.

**QLCV (2026-10-25):** QL-1 đã chốt (xóa mềm, ghi chú theo người tạo); code xóa mềm chưa kiểm (`deleteCongViec` có ở `cong-viec-write.actions.ts`) · QL-A xong, commit `d258f6c0`: việc «Trả về làm lại» (TU_CHOI) giữ 100% nên nút «Lưu tiến độ» luôn khóa, nay cho nộp lại · Phát hiện: prod không thiếu migration QLCV (ghi theo kết luận của PO phiên này; chưa đối chiếu lại bằng `list_migrations` trong phiên này).

**Chờ PO (gom một phiên/tuần):** tên người đầu mối các module còn lại (CSSD đã có) · ma trận «ai xem gì» (GS-1) · QL-1 · DT-2 (3 câu) · KD-5 (lấy DDL `cssd_fact_kho_kiem_ke` từ prod hay bỏ) · V1 phạm vi vật tư · Plasma–cellulose · nguồn ngưỡng 85/70 và 90/85 · xóa phiên VST (đang `is_active=false`).

**Việc PO ngoài repo:** Supabase Auth (tắt tự đăng ký, xác nhận email, chặn mật khẩu rò rỉ, redirect URL) · `NEXT_PUBLIC_SITE_URL` + `<site>/login/reset-password` · `KSNK_BREAK_GLASS_EMAILS` tài khoản thật · CSP/X-Frame-Options/HSTS · rà phiếu RESET đang chờ trên prod.

**Backlog gia cố (đóng băng, chỉ mở khi đủ luật dừng):** NS-MUC (form Danh mục chọn `muc_quan_ly` của chức vụ: cần tạo lại view `mdm_dm_chuc_vu` kèm metadata + sửa hook/modal; hiện mức chỉ seed bằng migration `20261031010000`) · NK-TZ2 («hôm nay» UTC 5 chỗ) · NK-SCOPE nợ lọc phạm vi + RLS DB · N1 (tách file NKBV > 1.700 dòng, thay `any`) · KD-2 form tự đổi PP · KD-3 chạy thử import · KD-4 nợ a–f · K3/QL-1/GS-1 phần RLS · CS-GATE nợ (`recall-receive` chèn+tắt, map lỗi trigger) · D1/Q1 spec + e2e · Zod nhập lô · H1 gọn 110 lệnh npm → ~10 · đo lượt xem báo cáo · sao lưu prod định kỳ.

**Kiểm toán tổng thể 2026-11-10** (chỉ đọc mã, 12 báo cáo vùng hẹp + 1 vòng phản biện; chưa chạy test, chưa kiểm prod, chưa sửa gì). Báo cáo: https://claude.ai/artifact/3ZrcThLmU4PpXfhFgZ1jr2. Lộ trình đề xuất, **chờ PO duyệt**:

1. Chặn rủi ro: kiểm cờ bắt đổi mật khẩu trong `verifyPermission` (`src/proxy.ts:138-144` vượt được) · không apply `20261105150000_dao_tao_canonical_qbank_upgrade.sql` (TRUNCATE CASCADE) và `scripts/sql/seed-qlcv-dinh-ky-bv103.sql` (DELETE theo tiêu đề) · chạy thử khôi phục sao lưu, ghi vào playbook · gom lỗi prod · kiểm formula injection ở `src/hooks/useExcelExport.ts`.
2. Nhập liệu VST/GSC: lưu nháp tự động · cảnh báo rời trang · báo trước mốc 30 phút · ngưỡng hoàn thành bảng kiểm GSC · gom luật VST một nơi (trần người 3 vs 8).
3. Đơn giản nền: loại `.claude/worktrees` khỏi tsconfig · rút script (H1) · lint chặn `src/lib` → `src/modules` (41 file) · 5 thành phần ui chuẩn · một bảng mục tiêu đo được + một thứ tự ưu tiên.
4. Mở từng module qua cổng «người thật chạy kịch bản tay»: CSSD chỉ luồng mẻ · NKBV che dữ liệu định danh trước ca thật · QLCV kiểm pg_cron prod · Đào tạo duyệt 6.000 câu.

**Giai đoạn 1: PO duyệt 2026-11-10, tiến độ** (nhánh `chore/code-vs-ai-phase1`, chưa push):

- Lát 1 cổng đổi mật khẩu: cờ `must_change_password` kiểm ở mọi cổng `verify*`, `ensureRbacAdmin`, `getActorRoleNames`, `hasRBACAdminSupervisionBypass` (kể cả break-glass); nhánh prefetch ở `src/proxy.ts` chỉ còn cho GET. Spec `src/lib/server-permission.spec.ts`. Đã qua một vòng `security-auditor`. Chưa test tay với tài khoản có cờ.
- Lát 2 xuất file: `rowsToCsv` (QLCV) vô hiệu hóa công thức, commit `4177f102`. Các chỗ xuất `.xlsx` không cần sửa: exceljs ghi chuỗi thành ô văn bản (`src/lib/analytics/excel-string-cell.spec.ts`).
- Lát 3: hai file SQL nguy hiểm để nguyên, không apply, không commit; chờ PO quyết số phận.
- Lát 4 sao lưu: **chưa làm**. Connector Supabase cần PO ủy quyền lại; khôi phục thử là việc của PO.
- Lát 5 gom lỗi: `src/instrumentation.ts` ghi một dòng JSON `"tag":"ksnk_server_error"` cho mỗi lỗi server, commit `25ee2d1d`. Chưa xem log trên Vercel.
- Nợ từ vòng rà lát 1 (chưa xếp mức, chưa kiểm): người có cờ vẫn gọi thẳng PostgREST theo RLS · prefetch GET trả trước khi kiểm cờ · tài khoản cũ chỉ có cờ ở `user_metadata` tự gỡ được (cần đếm trên prod) · `login/reset-password/page.tsx:48` chỉ xóa cờ ở `user_metadata` nên người đặt lại qua email vẫn bị đưa sang trang đổi mật khẩu.

**Đánh giá sẵn sàng vận hành thử (PO yêu cầu 2026-11-10, kế hoạch chờ duyệt).** PO lệnh rà mọi module trước khi đưa người dùng thử, thay luật dừng rà soát cho đợt này. Mỗi module một phiên, theo thứ tự VST/GSC + thống kê → CSSD → NKBV → QLCV → Đào tạo. Mỗi module 5 bước: (1) chạy spec + e2e có sẵn (`e2e/`); (2) Claude chạy tay ≥ 5 kịch bản qua UI trên DB local (nhập, sửa, xóa, phân quyền sai vai trò, thống kê khớp tính tay); (3) đối chiếu prod chỉ đọc: migration repo so với prod, advisors bảo mật; (4) sửa lỗi Nghiêm trọng/Cao chặn chạy thử, verify, commit theo lát; (5) kết luận «Đạt / Đạt có điều kiện / Chưa» kèm danh sách lỗi còn lại, ghi vào bảng Hiện trạng module. Trạng thái: chưa bắt đầu module nào. Lát 4 sao lưu làm cùng bước (3) của module đầu: connector Supabase của claude.ai đã nối được prod `ksnk-bv103-prod` (chỉ connector trong `.mcp.json` cần đăng nhập).

Câu hỏi PO thêm từ kiểm toán: phạm vi đọc VST/GSC mặc định toàn viện (`gsc-read-scope.ts:23,47`) · thống kê cho mạng lưới/khách xem mọi khoa · số phận migration TRUNCATE Đào tạo · ngưỡng hoàn thành GSC · NKBV thiếu ngày = «không có ca» hay «chưa đủ dữ liệu».

Model: Haiku cho đọc/soát (UAT, explore-module, db-verify) · Sonnet cho sửa code · Opus chỉ khi debug hoặc kiến trúc khó.

File SQL repo: `supabase/migrations/20261008221231_vst_valid_opp_moment_cap.sql`. Không đổi tên cho khớp timestamp prod.
