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

**Kiến trúc module (PO duyệt 2026-11-10):** Quản trị chỉ lo hệ thống (tài khoản, nhân sự, khoa phòng, tổ, phân quyền, nhật ký); module nghiệp vụ giao về tổ và tự giữ danh mục riêng; chủ nhiệm khoa duyệt chuyên môn qua vai trò `CHU_NHIEM_KHOA` (giữ kèm `ADMIN`). Phụ thuộc một chiều: Quản trị → Điều hành khoa → module nghiệp vụ → `lib/master-data` → nền tảng. Danh mục CSSD: thay đổi liên quan an toàn phải đề nghị + duyệt, sửa nhỏ làm trực tiếp có nhật ký. Menu danh mục CSSD và bảng kiểm về module của tổ (thay câu «Master CSSD: CRUD tại Quản trị» khi lát AR-5 xong).

| Lát | Việc | Trạng thái |
|---|---|---|
| AR-0 | Ghi quyết định vào docs | Xong 2026-11-10 |
| AR-1 | Vai trò `CHU_NHIEM_KHOA`; 2 action duyệt kiểm quyền `approve` thay tên `ADMIN` | Code xong local 2026-11-10 (migration `20261110100000`, áp local bằng psql vì lịch sử migration local lệch với worktree khác; `verify:mdm:local` chưa chạy do worktree thiếu `.env.local`). Chưa gán vai trò cho ai; vai trò này cộng thêm, không gán qua dropdown nhân sự (RPC `rpc_assign_staff_ksnk_role` thay thế vai trò). Còn nợ: test tay UI bằng tài khoản không phải ADMIN. **Chờ PO:** áp prod + gán người |
| AR-2 | Luật import bằng lint (`warn`, ghi số ban đầu) | Xong 2026-11-10. Số cảnh báo ban đầu (`@typescript-eslint/no-restricted-imports`): `src/lib` import module 63 · module nghiệp vụ import Quản trị 7 · Quản trị import module nghiệp vụ 13. Chỉ bắt import dạng `@/modules/...`, không bắt đường dẫn tương đối. Vùng nào về 0 thì nâng `error` |
| AR-3 | Gateway đọc danh mục từ Quản trị về `src/lib/master-data` | Xong 2026-11-10: `master-data-gateway.actions.ts` về `src/lib/master-data`; `mdm-gateway.actions.ts` ở Quản trị chỉ còn phần quản trị danh mục. Cảnh báo import: lib 63 · nghiệp vụ 5 (từ 7) · Quản trị 13 |
| AR-4 | Màn Phê duyệt của chủ nhiệm khoa (gom hàng duyệt đã có, không bảng mới) | Xong 2026-11-10: route `/phe-duyet` + module `src/modules/dieu-hanh-khoa` (panel chuyển bằng `git mv`, không đổi logic); menu «Phê duyệt» hiện khi có VIEW LOAI_DC/BO_DC/DC_LE, trang tự kiểm `approve`; đã gỡ khỏi tab Đề nghị của `/cssd-dung-cu`. Hàng chờ gồm đề nghị danh mục + rà soát BOM; phiếu kho hóa chất vẫn duyệt tại `/cssd-hoa-chat` (chỉ có link, chưa gom). Test tay (ADMIN, DB local): hàng chờ rỗng hiển thị đúng · đề nghị thử hiện ra · từ chối được. **Nợ:** từ chối không hỏi lý do (hành vi cũ của panel, `reject_reason` rỗng); chưa thử duyệt; chưa thử bằng tài khoản không phải ADMIN; thêm 1 cảnh báo lint Quản trị→module khác sẽ hết ở AR-5a |
| AR-5 | Chuyển danh mục dụng cụ/hóa chất/thiết bị về `cssd-erp`, bảng kiểm về `giam-sat-chung`; quy tắc duyệt theo rủi ro (PO xác nhận danh sách trường) | **5a xong 2026-11-10** (dụng cụ): UI loại/bộ/BOM/đề nghị chuyển bằng `git mv` sang `cssd-erp/contexts/instrument-catalog/admin`, không đổi logic; route cũ `/quan-tri-he-thong/danh-muc/dung-cu` chuyển hướng `/cssd-dung-cu`; `bo-dung-cu-form-field` (dùng chung hóa chất/khoa phòng/thiết bị) ở `quan-tri-he-thong/components`. Verify: tsc sạch · `test:cssd` 2329 pass · `imports:master-crud` OK · lint 0 lỗi; cảnh báo tầng: lib 63 · nghiệp vụ→Quản trị 38 (trước 5) · Quản trị→nghiệp vụ 6 (trước 13). **Nợ 5a:** 4 action CRUD + `master-crud-core` còn ở Quản trị (guard `imports:master-crud`) nên cssd-erp còn import Quản trị — hướng xử lý: chuyển `master-crud-core` về `src/lib/master-data`; đã test tay 2026-11-10 (ADMIN, DB local, :3001): tab Bộ (300 bản ghi) · Loại (có dữ liệu) · Quản lý (cảnh báo 136 bộ chưa có mã chuẩn hiện đúng) · `/phe-duyet` (hàng chờ rỗng, 3 tab lọc) · route cũ `?sheet=loai` → `/cssd-dung-cu?tab=LOAI`; console không lỗi liên quan (1 lỗi 404 chunk exceljs của dev server). Chưa thử thao tác ghi (thêm/sửa/duyệt) và tài khoản không phải ADMIN. **5b xong 2026-11-10** (hóa chất, thiết bị): `git mv` sang `cssd-erp/contexts/inventory-chemical/admin` và `contexts/maintenance/admin`, đổi import tương đối thành tuyệt đối; thêm tab «Quản lý danh mục» vào `/cssd-thiet-bi` (thay link «Sửa tại Quản trị»); route cũ `/quan-tri-he-thong/danh-muc/thiet-bi` chuyển hướng `/cssd-thiet-bi?tab=quan-ly`; cập nhật href ở hub Quản trị, spec, `me-tiet-khuan-create-step`, eslint. Verify: tsc sạch · `test:cssd` 2329 pass · `imports:master-crud` OK · `verify-danh-muc-routes` 6/6 · lint 0 lỗi (nghiệp vụ→Quản trị 73, trước 38; Quản trị→nghiệp vụ 3). Test tay (ADMIN, DB local): route cũ thiết bị → tab Quản lý, mở form «Thêm thiết bị» · route cũ hóa chất → `/cssd-hoa-chat?tab=danh-muc` (DB local chưa có hóa chất, chưa thử thêm/sửa). **5c xong 2026-11-10** (bảng kiểm): `git mv` toàn bộ `quan-tri-he-thong/bang-kiem` (actions, components, lib, views, types, spec) sang `giam-sat-chung/bang-kiem/`, import tương đối ra Quản trị đổi thành tuyệt đối; route mới `/giam-sat-chung/bang-kiem` (quyền `BANG_KIEM` giữ nguyên), route cũ `/quan-tri-he-thong/bang-kiem` chuyển hướng; cập nhật hub Quản trị, `QUAN_TRI_BANG_KIEM_PATH`, `app-shell-scope`, guard `imports:master-crud` (regex đường dẫn mới), scripts, rules, docs. Verify: tsc sạch · vitest 2329 pass · `imports:master-crud` OK · route check 6/6 · lint 0 lỗi, 213 cảnh báo (lib 63; nghiệp vụ→Quản trị 88, trước 73 vì bảng kiểm còn import `master-crud-core` và chrome form/bảng của Quản trị; Quản trị→nghiệp vụ 3). Test tay (ADMIN, DB local): route cũ → `/giam-sat-chung/bang-kiem`, danh sách 90 dòng, nút Thêm/Nạp Excel hiện. **Nợ 5c:** chưa có tab «Bảng kiểm» trong thanh Nhập/Lịch sử/Thống kê của GSC (vào từ hub Quản trị); chưa thử thao tác ghi và tài khoản không phải ADMIN. **5d xong 2026-11-10** (duyệt theo rủi ro): loại/bộ/BOM/phương pháp tiệt khuẩn đã chỉ ADMIN ghi (`requireCssdCatalogMasterWrite`) + đề nghị→duyệt, không đổi; hóa chất/thiết bị thêm quyền `approve` (migration `20261110110000`, áp local) — thêm mới, ngừng/xóa, nồng độ, định mức/tỷ lệ cảnh báo/ngày chờ hàng cần `approve` (`requireCssdSensitiveApprove`), đổi tên/ghi chú/vị trí vẫn trực tiếp; PO chọn không làm hàng chờ mới (tổ nhờ chủ nhiệm khoa thực hiện). import Excel hóa chất/thiết bị cũng cần `approve`. Trigger DB `fn_cssd_dm_approve_guard` (migration `20261110120000`, áp local) chặn ghi thẳng PostgREST của `authenticated` khi thiếu `approve` (service_role/DEFINER đi qua); test local: NV bị chặn thêm/ngừng/định mức/nồng độ, đổi tên qua, ADMIN và service_role qua. Prod: áp 2 migration AR-5d = cổng PO |
| AR-6 | Gộp `cssd-erp` + `cssd-su-co`; dọn `cssd-*` trong `lib/domain`; áp mô hình cho NKBV/QLCV/Đào tạo | Backlog |
| AR-7 | Tồn đọng Quản trị (rà 2026-11-11, ADMIN, DB local :3005, chỉ đọc — chưa sửa) | **Trung bình:** (1) tab IT `sys_mdm_registry` 105/126 dòng trỏ bảng không còn tồn tại (`dm_*`, `user_roles`, `role_permissions`, `giam_sat_vst`, `su_co`…; seed từ baseline `20260530000000` nên prod nhiều khả năng giống — chưa kiểm prod); UI vẫn ghi «phủ bảo vệ 100%» cạnh «21/126 trigger»; chưa thử bật ACTIVE trên bảng thiếu. **(1) xong local 2026-11-11** (PO chọn xóa hẳn): cả 105 dòng vốn đã `is_active=false` (hàm `fn_mdm_field_registry_attach_trigger` bỏ qua bảng không tồn tại, nên không ảnh hưởng ràng buộc); migration `20261111100000_ar7_mdm_registry_drop_orphan_rows.sql` xóa 105 dòng registry + 310 gợi ý DONE/REJECTED trỏ bảng đã DROP (áp local bằng psql, chạy lại = 0 dòng); `MdmGovernanceView` tính phủ theo dòng đang bật. Kiểm: 21 dòng đang bật, trigger bảo vệ vẫn trên 11 bảng; UI «21 / 21»; `mdm:postcheck:sql:local` + `:fk:local` sạch; tsc + eslint sạch. Chưa chạy: `mdm:coverage:gate`/`verify:quick` (worktree không có `.env.local`). Prod: áp migration = cổng PO. (2) `permission-registry-data.ts` thiếu `APPROVE` cho `THIET_BI`/`HOA_CHAT` trong khi DB có (migration `20261110110000`); ma trận đọc từ DB nên lưu không mất — lệch SSOT. (3) Hub Quản trị còn trái quyết định PO 2026-11-10: thẻ «Sửa danh mục CSSD», «Bảng kiểm», dòng Loại sự cố CSSD/Loại máy tiệt khuẩn/Khu vực-Hình thức-Cách thức giám sát (`quan-tri-hub-jobs.ts`, `danh-muc-hub-catalog.ts`); action ghi CSSD (bo/loai/chi-tiet dụng cụ, thiết bị, hóa chất, nhóm, `master-crud-core`, cả giao dịch kho `kho-dung-cu-giao-dich.actions.ts`) còn ở `quan-tri-he-thong/danh-muc/actions`; file ngoài module import Quản trị: cssd-erp 25 · giam-sat-chung 10 · app 4 · lib 1. **Thấp:** (4) `.claude/rules/mdm.md` lỗi thời («máy/hóa chất vẫn ở quản trị», «All master data … under quan-tri-he-thong/danh-muc»). (5) `CHU_NHIEM_KHOA` có cột ma trận nhưng không gán được từ UI (`RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER`), không có preset «Đặt lại quyền mặc định», dropdown «Gói quyền» áp được cho vai trò này (có thể cấp quá approve+view). (6) UI: danh sách Tài khoản/Nhân sự hiện một vai trò/người; mã thô `TO_TRUONG_CSSD_TEST` (fixture local); hub «Ma trận phân quyền 0/Trống»; link tài khoản lệch `/nhan-su` vs `/tai-khoan`; chú giải ma trận hai nhãn «X»; Bộ dụng cụ 294 vs 136/293. (7) security-auditor (Opus): 0 Nghiêm trọng/Cao; thấp: `saveKhoaPhongAction` không zod, `specs` tự do (`khoa-phong.actions.ts:120`); `rpc_mdm_nhan_su_max_numeric_suffix` cấp anon EXECUTE (INVOKER); break-glass email trong `ensureRbacAdmin` không kiểm `email_confirmed_at`. **Đã kiểm đạt:** RLS ghi thẳng bằng NV_TEST01 — INSERT `sys_user_roles`/`sys_role_permissions` bị chặn, `rpc_save_rbac_matrix` permission denied, DELETE/UPDATE `sys_role_permissions`/`sys_user_roles`/`sys_roles`/`sys_permissions`/`mdm_dm_khoa_phong`/`sys_mdm_registry` = 0 dòng; lint module 0 lỗi (7 cảnh báo tầng); vitest Quản trị + `lib/master-data` 41 file 208 pass; console sạch. **Chưa phủ:** UI bằng tài khoản không phải ADMIN, thao tác ghi, prod |

**Chờ PO (gom một phiên/tuần):** tên người đầu mối các module còn lại (CSSD đã có) · ma trận «ai xem gì» (GS-1) · QL-1 · DT-2 (3 câu) · KD-5 (lấy DDL `cssd_fact_kho_kiem_ke` từ prod hay bỏ) · V1 phạm vi vật tư · Plasma–cellulose · nguồn ngưỡng 85/70 và 90/85 · xóa phiên VST (đang `is_active=false`).

**Việc PO ngoài repo:** Supabase Auth (tắt tự đăng ký, xác nhận email, chặn mật khẩu rò rỉ, redirect URL) · `NEXT_PUBLIC_SITE_URL` + `<site>/login/reset-password` · `KSNK_BREAK_GLASS_EMAILS` tài khoản thật · CSP/X-Frame-Options/HSTS · rà phiếu RESET đang chờ trên prod.

**Backlog gia cố (đóng băng, chỉ mở khi đủ luật dừng):** NS-MUC (form Danh mục chọn `muc_quan_ly` của chức vụ: cần tạo lại view `mdm_dm_chuc_vu` kèm metadata + sửa hook/modal; hiện mức chỉ seed bằng migration `20261031010000`) · NK-TZ2 («hôm nay» UTC 5 chỗ) · NK-SCOPE nợ lọc phạm vi + RLS DB · N1 (tách file NKBV > 1.700 dòng, thay `any`) · KD-2 form tự đổi PP · KD-3 chạy thử import · KD-4 nợ a–f · K3/QL-1/GS-1 phần RLS · CS-GATE nợ (`recall-receive` chèn+tắt, map lỗi trigger) · D1/Q1 spec + e2e · Zod nhập lô · H1 gọn 110 lệnh npm → ~10 · đo lượt xem báo cáo · sao lưu prod định kỳ.

Model: Haiku cho đọc/soát (UAT, explore-module, db-verify) · Sonnet cho sửa code · Opus chỉ khi debug hoặc kiến trúc khó.

File SQL repo: `supabase/migrations/20261008221231_vst_valid_opp_moment_cap.sql`. Không đổi tên cho khớp timestamp prod.
