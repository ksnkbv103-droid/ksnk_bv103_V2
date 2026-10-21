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
| Lát K1 | Kho dụng cụ: **khóa 9 hàm nội bộ `fn_cssd_*`** (anon/authenticated gọi được `fn_cssd_apply_instrument_ledger_tx` không qua kiểm quyền) + CHECK dấu số lượng theo loại giao dịch (NOT VALID). Migration `20261012163313` | Xong; **đã apply prod** (2026-10-20) | Opus |
| Lát K2 | Kho dụng cụ: khóa đua khi kiểm tồn (`pg_advisory_xact_lock` theo bộ+loại), chuyển cấu phần theo id thay vì tên, **điều chuyển bắt buộc bộ đích?** (hiện thiếu đích → tồn biến mất khỏi sổ) | Cần PO trả lời câu điều chuyển | Opus |
| Lát K3 | Duyệt đổi danh mục: bước claim → áp BOM → `BOM_APPROVED` chưa nguyên tử; hàng chờ + lịch sử tải hết phiếu rồi lọc ở Node (chuyển lọc/phân trang về server) | Chưa | Sonnet |
| Lát H2 | Kho hóa chất: xuất/điều chỉnh đọc tồn rồi mới ghi (không nguyên tử → xuất đồng thời gây tồn âm) → RPC có khóa theo hóa chất+lô; bảng `cssd_fact_kho_hoa_chat_giao_dich` **chưa có cột người thao tác** (thêm `nguoi_thuc_hien_id`); `tonTaiLo` tải toàn bộ giao dịch của hóa chất mỗi lần xuất | Chưa | Sonnet |
| Lát T1 | Thiết bị/bảo trì: bắt đầu/kết thúc/hủy là 2–3 lệnh rời (phiếu xong nhưng máy kẹt `REPAIRING` nếu bước sau lỗi); chưa chặn 2 phiếu mở cùng một máy (cần index duy nhất phiếu `DANG_THUC_HIEN`/máy); cột `nguoi_thuc_hien_id` có nhưng không ghi; thẩm định 3 BI âm chỉ là chuỗi tự khai, chưa đối chiếu hồ sơ BI (N-ME-3) | Chưa | Sonnet |
| Lát S1 | Sự cố: phân quyền các action đã đúng cổng; còn rà `su-co-report.application.ts` (539 dòng, hoàn tác bù trừ `executeIncidentReportAndRollback`), `void-incident`, `createIncidentReport` ném lỗi thay vì trả `{success}` | Chưa rà sâu | Opus |
| Lát V1 | Vật tư: PO định nghĩa phạm vi (bao gói, găng, chỉ thị hóa học… có quản tồn không) | Chờ PO | — |
| Rà soát R1 (2026-10-12) | **Rà 5 mảng bằng agent Opus** (kho dụng cụ + hóa chất + bảo trì + sự cố; quản trị danh mục/import; CSSD vận hành; NKBV; QLCV/Đào tạo/GSC-VST; nền auth/RBAC). Chỉ kiểm DB local, **chưa đối chiếu prod** (cần Supabase MCP xác thực lại). Danh sách lát bên dưới thay cho K2–K3/H2/T1/S1 ở trên; mã lát: `SEC` bảo mật DB/quyền · `ACC` tài khoản · `DT` Đào tạo · `NK` NKBV · `CS` CSSD · `KD` kho/danh mục dụng cụ · `HC` hóa chất · `TB` thiết bị | Đã rà | Opus |
| Lát SEC-1 | **Một migration thu quyền + siết RLS** (gộp để lên prod một lần): `rpc_dashboard_vst_strategic_analytics_impl`, `rpc_save_rbac_matrix`, `rpc_get_dashboard_ksnk_staff_supervision_stats`, hàm trigger; default privileges; RLS Đào tạo (`dao_tao_lan_thi`/`dao_tao_cau_hoi`: chặn INSERT/UPDATE/SELECT của authenticated — hiện tài khoản bất kỳ tự ghi bài thi «đạt 100» và đọc đáp án); RLS ghi `cssd_dm_*` chỉ ADMIN + bỏ DELETE + FK sổ kho RESTRICT; `sys_roles`/`sys_permissions` chỉ ADMIN; `v_sys_user_permissions` + `fn_sys_*` lọc `is_active` | Giao agent; **apply prod chờ PO** | Opus |
| Lát ACC-1 | Chiếm tài khoản từ form công khai: `submitForgotResetAdminRequestAction` ghi đè email hồ sơ → admin duyệt thì mật khẩu về email kẻ tấn công; `submitAccountAccessRequestAction` sửa/tạo hồ sơ nhân sự thật không cần đăng nhập. Phiếu chỉ nằm ở `sys_account_access_request`, hồ sơ chỉ đổi khi admin duyệt | Giao agent (chỉ code) | Opus |
| Lát ACC-2 | Dọn auth phụ: `guest-stats-pilot` thiếu nhập lại mật khẩu; `redirectTo` quên mật khẩu lấy từ client; import `mdm_nhan_su` ghi mọi cột; `master-crud-core` sửa chéo nhóm `sys_lookup_value`; helper bị export trong file `"use server"`; ngưng hồ sơ phải ban Auth + xóa cache quyền | Chưa | Opus |
| Lát DT-1 | Đào tạo (code): `requireDaoTaoAdmin()` cho mọi action ngân hàng/quản trị (hiện chỉ kiểm `view` → thí sinh xuất được cả ngân hàng đề), `getLanThiForTake` chặn xem bài người khác, zod cho `traLoi`/form, spec `grade.ts` | Chưa | Opus |
| Lát DT-2 | Đào tạo: khóa lạc quan khi nộp, khóa theo (người, cấu hình) khi bắt đầu thi (vượt số lượt), thống nhất cách đếm lượt. **PO:** thi thử dùng chung ngân hàng và lộ đáp án sau nộp; nộp trễ >30 giây vẫn «đạt» | Chờ PO | Sonnet |
| Lát NK-TZ | **NKBV lệch ngày vào viện 1 ngày** (lưu 00:00 +07 vào timestamptz, ~27 chỗ đọc `slice(0,10)` UTC; 85 bệnh án local; POA→HAI sai): helper ngày Việt Nam dùng chung + spec 17:00Z; import thiếu ngày vào viện thì từ chối thay vì lấy ngày import. Phương án A (giữ cột); đổi sang `date` = phá hủy, chờ PO | Giao agent | Opus |
| Lát NK-AUTH | NKBV: bỏ trạng thái chốt khỏi form sửa + `updateGiamSatNkbvCa`; RPC thẩm định (kiểm trạng thái, lý do bắt buộc, lưu người/giờ duyệt, chặn tự duyệt); trigger chặn đổi trạng thái chốt ngoài RPC. **PO:** vai nào được approve (hiện chỉ ADMIN) | Chờ PO | Opus |
| Lát NK-ATOM / NK-LOA / NK-SCOPE / NK-CSSD / NK-ZOD / NK-PERF | NKBV: kích hoạt lại phiếu ẩn theo `ma_ca`; không ghi đè trạng thái đã duyệt; sync lưới không đụng ca đã chốt + tính khoa quy kết ở server; phạm vi theo khoa cho Mạng lưới/Hội đồng; truy vết CSSD gắn cờ khi đoán mẻ + kiểm UUID; zod; bỏ tải hết rồi lọc | Chưa | Opus/Sonnet |
| Lát CS-ME | **Mẻ không đạt làm máy bị khóa mãi + KPI/badge sai** (ME-10 để `ket_qua_test` NULL; local: `TKHN3-121026-1`; migration đã apply prod 10/10 → kiểm prod): backfill, điều kiện «mẻ mở» theo `trang_thai_me`, badge | Giao agent; **apply prod chờ PO** | Opus |
| Lát CS-IMP | CSSD: nạp Excel kho (`importCSSDData`) ghi được trạm/mẻ/HSD/cờ đỏ → bộ «vô khuẩn» chưa qua mẻ. Chỉ cho tạo shell. **PO:** import còn dùng làm gì | Chờ PO | Sonnet |
| Lát CS-GATE | CSSD: gói UOT/RACH/BAN một chiều; «đã dùng lâm sàng» cần quyền edit + đã cấp phát; quét lại Cấp phát không ghi đè; BI âm không ghi lên mẻ THU_HOI; mở khóa bộ chờ thu về; khóa cổng ở DB cho mẻ (BD trong ngày, phương pháp); chống đua khi quét (FOR UPDATE + unique chu trình active) | Xong local (migration `20261021020000`: ràng buộc 1 chu trình gốc active/bộ+mã, FOR UPDATE khi quét, cấp phát không ghi đè, gói xấu một chiều, BI âm không lên mẻ THU_HOI, BD đầu ngày + phương pháp khớp máy ở DB; TS quét lại Cấp phát chỉ in lại). review-bv103 bắt 1 Critical (trigger chặn xóa mốc khi sự cố trả bộ) → đã sửa + test SQL. **Chưa apply prod**: chạy 2 câu SQL kiểm (chu trình trùng; mẻ mở lệch phương pháp, cuối migration) phải ra 0 dòng. Nợ: `recall-receive` chèn+tắt chưa nguyên tử; lỗi trigger chưa map tiếng Việt; `rpc_cssd_me_thu_hoi` còn ghi đè `phuong_phap` | Opus |
| Lát CS-FIX | CSSD: tách nhiệt ghi cột không tồn tại `ma_trang_thai_hien_tai`; báo cáo lệch múi giờ + tải hết; danh sách chờ cấp phát lẫn bộ thu hồi; Plasma–cellulose (cần thuộc tính vật liệu bao gói, PO) | Xong local, trừ Plasma–cellulose (chờ PO): tách nhiệt đã đúng từ `65922011`; báo cáo CSSD lọc đúng ngày VN (`isVnDayInRange`); chờ cấp phát loại bộ `CHO_THU_VE`. Giả định: «bộ thu hồi» = `metadata.thu_hoi.trang_thai=CHO_THU_VE` | Sonnet |
| Lát KD-1 | Danh mục dụng cụ: duyệt đề nghị BOM ghi cột không tồn tại (`max_suds_count`, `trong_luong`, `ma_chi_tiet` phải nằm trong `specs`) → `APPLY_FAILED`; áp dụng nguyên tử bằng RPC; gộp trước khi DOI_LOAI; chặn tự duyệt (K3 cũ) | Xong local (`5caee328` gỡ BOM chết khỏi quy trình xử lý, D8 chốt; `07fcbeb5` RPC `fn_cssd_apply_bom_lines_tx` nguyên tử + chặn tự duyệt, migration `20261021010000`, review-bv103 Go). **Chưa apply prod**; apply xong mới được deploy code. Nợ: `applyApprovedBomLines` TS hết caller (giữ làm đặc tả); phiếu cũ kẹt `BOM_APPLYING/FAILED` chỉ từ chối được | Opus |
| **Kế hoạch tự chạy (PO 2026-10-21: «tự làm hết, không hỏi»)** | Chỉ local, tuần tự một agent ghi/lần, mỗi lát verify rồi commit. **Không** apply prod, push, deploy. Câu «Chờ PO» → chọn phương án an toàn nhất, ghi giả định vào dòng lát để PO duyệt sau. Thứ tự: CS-GATE → CS-FIX → TB-1 → KD-3 → KD-4 → KD-2 → HC-1 → NK-AUTH/ATOM/LOA/SCOPE/ZOD/PERF/TZ2 → QL-1 → DT-2 → GS-1 → CS-IMP; KD-5 chỉ ghi chú (cần đọc prod, phá hủy) | Đang chạy | — |
| Lát KD-2 | Loại không chịu nhiệt + `STEAM_134` lưu được; đề nghị/import bỏ qua tách nhiệt và kiểm bộ đang luân chuyển; dùng chung một hàm áp dụng. **PO:** phương pháp hợp lệ cho loại không chịu nhiệt | Chờ PO | Opus |
| Lát KD-3 | Import Excel danh mục: đọc cắt ở 1000 dòng (local 2311 loại), import lại nhân đôi số lượng, ghi đè mất `specs`, dry-run vẫn tạo bộ cha, thiếu audit/zod. **PO:** BOM trùng là thay thế hay cộng | Chờ PO | Sonnet |
| Lát KD-4 | Điều chuyển/kho dụng cụ (K2 cũ): khóa đua kiểm tồn, chuyển cấu phần theo id, thiếu bộ đích thì tồn biến mất, mô hình tồn tương đối lệch sau đổi danh mục, phân bổ khoa. **PO:** điều chuyển bắt buộc đích? tồn tương đối hay tuyệt đối? | Chờ PO | Opus |
| Lát KD-5 | Kiểm kê `cssd_fact_kho_kiem_ke`: bảng chỉ có trên prod, DDL không nằm trong git (migration `20260921063340` chỉ `SELECT 1`) → lấy DDL từ prod về repo hoặc bỏ (`destructive-change`) | Cần đọc prod | — |
| Lát HC-1 | Hóa chất: xuất/điều chỉnh nguyên tử (RPC khóa theo hóa chất+lô), thêm `nguoi_thuc_hien_id`, bỏ tải toàn bộ giao dịch mỗi lần xuất | Chưa | Sonnet |
| Lát TB-1 | Thiết bị/bảo trì: bắt đầu/kết thúc/hủy nguyên tử; index duy nhất 1 phiếu mở/máy; ghi người thao tác; trigger chặn sửa thẳng `trang_thai`/kết quả BD của `cssd_dm_thiet_bi`; thẩm định 3 BI âm đối chiếu hồ sơ BI | Chưa | Sonnet |
| Lát QL-1 | QLCV: chặn sửa phiếu đã đóng + khóa lạc quan; RPC checklist `FOR UPDATE` + kiểm trạng thái; TS dùng `fn_qlcv_ksnk_khoa_id`. **PO:** quyền ghi chú (view?), xóa cứng cần `delete`? | Chưa | Sonnet |
| Lát GS-1 | GSC/VST: RLS đọc theo phạm vi (khách bị chặn, Mạng lưới chỉ khoa/phiên của mình — khách hiện đọc được 1176 phiên GSC, 3452 phiên VST thô); sửa phiên GSC không làm sống lại phiên đã xóa; giới hạn số id. Cần kiểm lại NKBV + MDM gateway; **PO:** ma trận ai xem gì | Chờ PO | Opus |
| Cấu hình ngoài repo (PO tự làm) | Supabase Auth: tắt tự đăng ký, bật xác nhận email + secure email change, kiểm danh sách redirect URL; `KSNK_BREAK_GLASS_EMAILS` phải là tài khoản có thật; thêm CSP/X-Frame-Options/HSTS | PO | — |
| Việc cần Supabase MCP xác thực lại | Đối chiếu prod cho SEC-1, CS-ME, NK-TZ (giờ lưu `ngay_vao_vien`): ACL hàm, policy, vai trò test `TO_TRUONG_CSSD_TEST`, ai giữ `PHAN_QUYEN`/`NHAN_SU` | PO xác thực MCP | — |
| **Tiến độ R1 (2026-10-12, chốt phiên)** | **Đã xong, đã commit local, chưa push:** K1 `ab5d6e41` · SEC-1 `65f87372` · ACC-1 `7bf4a910` · NK-TZ `0e2d8aee` (nhãn «Chưa xác định» chờ PO duyệt) · DT-1 `955d850d` · KD-1 `3bc47ddb`+`933cd5d2` (phần RPC nguyên tử còn lại; `3bc47ddb` cuốn theo 12 file CS-ME) · CS-ME (migration `20261021003302`) · ACC-2 `adb7b41e` `c34355e7` `2058c7fb` `a5833be0` `d786c11f` `8de66ba1`. **Đã apply prod:** K1 (`20261012163313`, 2026-10-20) · SEC-1 (`20261021003002`) · CS-ME (`20261021003302`), 2026-10-21; đã kiểm trước (1 ADMIN hồ sơ active, tên FK khớp, 0 mẻ kẹt) và sau (quyền EXECUTE, policy, FK RESTRICT, chỉ mục). **Việc PO:** đặt `NEXT_PUBLIC_SITE_URL` + thêm `<site>/login/reset-password` vào redirect Supabase Auth; chốt mâu thuẫn `ket_qua_test` mẻ thu hồi trong SSOT 18 (dòng 181 vs 224); duyệt cài gói `server-only`; bỏ cột `ma_vai_tro_ksnk` khỏi mẫu import nhân sự?; rà phiếu RESET đang chờ trên prod (email hồ sơ có thể đã bị ghi đè). **Test tay:** DT-1 (3 kịch bản), ACC-1 (3 kịch bản), ACC-2 (3 kịch bản). **Còn lại, làm tuần sau bằng `slice-fixer` tuần tự:** DT-2, NK-AUTH/ATOM/LOA/SCOPE/CSSD/ZOD/PERF, NK-TZ2 («hôm nay» UTC ở 5 chỗ), CS-IMP/GATE/FIX, KD-1 RPC, KD-2/3/4/5, HC-1, TB-1, QL-1, GS-1 | Chốt | — |
| Tiến độ R1 (bổ sung) | **CS-GATE phần code xong** (2 commit `fix(cssd)`: «đã dùng lâm sàng» cần quyền sửa + bộ đã cấp phát, xóa cờ cần quyền duyệt sự cố; BI âm không ghi lên mẻ THU_HOI/QC_KHONG_DAT; mở khóa chặn bộ CHO_THU_VE hoặc còn phiếu sự cố chưa đóng). **CS-FIX xong** `65922011` (tách nhiệt dùng `tram_hien_tai_id` thay cột không tồn tại). Còn lại của CS-GATE: gói UOT/RACH/BAN một chiều + quét lại Cấp phát (chờ PO), cổng DB/race (cần migration). **Việc nhỏ:** ẩn nút gán ca mổ / «đã dùng» trong `QRHistoryViewer.tsx` với tài khoản chỉ có quyền xem (hiện báo lỗi khi bấm). **Nợ của `cssd-heat-split-apply.ts`:** N+1, bộ con đã tắt có thể trùng `ma_bo`, tách không nằm trong transaction → làm cùng RPC tách nhiệt (KD-2) | Xong | — |
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
