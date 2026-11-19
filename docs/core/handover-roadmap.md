# Bàn giao & onboarding — KSNK BV103

> **Việc còn mở:** §5 dưới đây.  
> **SSOT schema:** [`implementation-mapping.md`](implementation-mapping.md)
>
> **Bản rút gọn 2026-11-18 (lát 3a):** nhật ký chi tiết AR-0…AR-8, UAT local 2026-11-10, kiểm toán 11-10, Giai đoạn 0/1, Bước 0–3 nằm ở bản cũ: `git show 95d2bbe0:docs/core/handover-roadmap.md` (67 KB). Việc mở chỉ có ở file này đã chuyển sang `SO_NO_APPKSNK.md` (cuối file, «chuyển từ roadmap»). Trạng thái từng việc: sổ lỗi `node scripts/readiness/so-loi.mjs status`.

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

Verify trước push: `npm run verify` (full) — xem [`engineering-guidelines.md`](engineering-guidelines.md).

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

Một chủ đề một bản đang dùng ([`ssot-map.md`](../ssot-map.md)). Nhật ký các lát cũ (SEC, ACC, KD, HC, TB, NK-*, CS-*, DT, GS, QL…) đã lưu trong git log trước commit này; không chép lại ở đây. **§5 đã gộp vào bộ 3 file (PO duyệt 2026-11-16):** lộ trình hiện hành ở [`01 §6.3`](../bo-tai-lieu/01-tong-quan-yeu-cau-lo-trinh.md); mục này giữ nguyên để tra, lệch với nguồn sống thì nguồn sống thắng.

**Thang sẵn sàng (mỗi module)**

| Mức | Nghĩa | Điều kiện đạt |
|---|---|---|
| L0 | Code chạy | `verify:engineering` pass |
| **L1** | **Đưa chạy thử** | Có người dùng đầu mối thật · nhập một phiếu < 60 giây · ≥ 3 kịch bản tay · thống kê khớp tính tay |
| L2 | Chạy ổn định | Cổng nghiệp vụ nguyên tử · RLS đọc theo phạm vi · đã apply prod |
| L3 | Tự động hóa | Rules engine, HIS/LIS, quét mã, import hàng loạt |

Mỗi module có 3 màn: **Nhập · Danh sách/lịch sử · Thống kê** (chỉ số, biểu đồ, bảng, xuất). Nghiệp vụ đặc thù thêm sau khi 3 màn chạy. Chỉ làm lát L2/L3 khi module đã đạt L1 và người dùng báo vướng.

**CSSD (2026-11-11):** Plasma = ETO (PO 2026-11-10): cổng app không chặn chéo, DB theo `phuong_phap_cho_phep`. Bộ con `-CN`/`-KCN` rỗng là đúng thiết kế (S2 `20261111130000` chuyển dòng về bộ tổng; thành phần đọc qua `v_cssd_bo_thanh_phan_hieu_luc` / `fn_cssd_bo_chi_tiet_hieu_luc`). Chạy lại UAT ETO trên `integrate/2026-11`; fixture local cần dọn: bộ `B99.SET.98`, mẻ `ETO1-111126-1`.

**Luật dừng rà soát**

- Chỉ mở lát gia cố khi: (a) hỏng/lộ dữ liệu ở đường người dùng **đang dùng**, hoặc (b) người dùng thật báo lỗi.
- Không giao agent «quét» module chưa có người dùng; lỗi tìm được ghi một dòng vào backlog bên dưới.
- Tối đa 5 lát mở cùng lúc. Một agent ghi/lần.
- Câu hỏi PO gom một phiên/tuần, mỗi câu kèm phương án mặc định «nếu PO im».
- Apply prod theo lô mỗi tuần (PO duyệt), không lẻ từng lát.

**Hiện trạng module** (prod 2026-10-11: NKBV 1 phiếu · CSSD 10 chu trình thử · QLCV 0 việc · Đào tạo 1 lần thi)

| Module | Mức | Người đầu mối | Việc tới L1 | Đang chặn |
|---|---|---|---|---|
| VST + GSC + thống kê | L1 (đang dùng thật) · **Đạt có điều kiện** vận hành thử (2026-11-10) | Tổ giám sát KSNK (PO 2026-11-17; UAT đợt đầu) | Đo thời gian nhập phiếu (2 lỗi Thấp của đợt 2026-11-10 đã sửa: báo riêng thiếu danh tính NV, báo thiếu Vị trí ngay ở client) | GS-1 RLS đọc cần ma trận «ai xem gì» (L2); e2e Playwright chưa chạy được (thiếu Chromium) |
| CSSD (+ sự cố) | L0, nhiều cổng L2 đã lên prod | Tổ CSSD: Nguyễn Thanh Bình (PO 2026-10-31) | K1–K5 ở SSOT 18 đã chạy tay qua UI trên DB local (Claude chạy thay tổ CSSD; PO chốt đạt 2026-11-01), chưa chạy trên prod/bộ Đóng gói thật; kho/hóa chất/BOM tạm nhập tay hoặc Excel | Người đầu mối; máy quét |
| NKBV | L0 | Chưa có | Ghi ca + danh sách + tỉ lệ; rules engine chỉ gợi ý, không chặn | HIS/LIS (L3); người đầu mối |
| QLCV | L0 | Nhóm KSNK | Tạo việc, giao, hạn, hoàn thành, xem theo người/khoa; kịch bản tay ≥ 3 | QL-1 đã chốt 2026-10-24 (xóa mềm, ghi chú theo người tạo); code xóa mềm chưa kiểm |
| Đào tạo | L0 | Chưa có | Thi thử/thi thật + kết quả; kịch bản tay ≥ 3 | DT-2: 2/3 câu đã chốt 2026-10-24 (nộp trễ > 30 giây = không đạt; thi thử ẩn đáp án đến khi nộp); câu «dùng chung ngân hàng» mặc định giữ hiện trạng (2026-11-17) |

Thứ tự pilot theo khóa PO: CSSD → NKBV → QLCV → Đào tạo. QLCV/Đào tạo không cần phần cứng/HIS nên có thể chạy thử sớm hơn: **chờ PO xác nhận**.

**Prod (MCP) và cổng migration** (chi tiết: bản `95d2bbe0`, `03-tien-do-thuc-trang.md`). **Quy tắc: apply migration TRƯỚC, deploy code SAU.** Đã lên prod: K1, SEC-1, CS-ME, KD-1, CS-GATE, TB-1, HC-1, NK-AUTH, CSSD nhật ký chu kỳ/phiếu TK/phương pháp theo Loại (2026-10-31, 8 migration `20261030*`), chức vụ mức quản lý (`20261031010000`), 9 migration bù HC-C/D/E/F + nhóm hóa chất + QLCV D2/L1/L2/L3 (2026-11-10, `20261028090000` → `20261029150000`), `20261110044338` (nới CHECK dấu `NHAP_KHO`). Chưa lên prod tại 2026-11-11: KD-4 `20261021040000` (nợ khóa deadlock nhiều dòng + sổ ghi ngoài khóa), tách bộ nhiệt `20261110120000`.
**CSSD bộ tổng, phương án C′ (PO duyệt 2026-11-11):** dòng BOM ở lại bộ tổng (để kiểm kê); thành phần `-CN` (chịu nhiệt) / `-KCN` suy ra theo cờ loại; sổ kho quy về bộ tổng; dụng cụ KCN dùng chung cấp kèm bộ khác bằng bản ghi cấp kèm, mượn lẻ bằng điều chuyển có hạn trả; 1 bộ danh mục = 1 bộ vật lý (≤ 1 QT active). Migration: S1 `051ccdc7`, S1b `5de4d26a`, S4-DB `120000`, S2 `130000` (4031 dòng con về tổng, 101 con tắt, 46 QT TIEP_NHAN trỏ về tổng — tem `-CN` cũ phải in lại), `125000` sao lưu `cssd_bak_s2_bo_tong`, `140000` guard bỏ EO. **Prod (cổng PO):** đo trước bằng SQL cuối `125000` (dòng EO trùng, dòng trên con đã tắt, `max_locks_per_transaction` vì guard ~4031 advisory lock), rồi áp 100000→110000→120000→125000→130000→140000. PO chốt 2026-11-10: ống kính/optic, cáp quang, dây nguồn sáng, ống soi = không chịu nhiệt (`{PLASMA,EO}`, 27 loại); kim loại/nội soi khác = chịu nhiệt.

**Còn mở (1 dòng/mục ở `SO_NO_APPKSNK.md`):** phiếu đổi danh mục kẹt `APPLYING` · lưới Silicone JF941 giữ `-KCN` hay chuyển `-CN` · 3 QT kẹt bộ tổng B01.SET.05, B09.SET.10, B19.SET.07 · `so_luong_kho_du_phong` khi hủy sự cố (code đã qua RPC `rpc_cssd_apply_incident_void`, cần xác nhận rồi đóng) · nợ Cao: RPC `fn_cssd_dong_bo_tach_nhiet` mất bộ con `-EO` và bao gói mặc định · câu PO: còn cần bộ con EO tách khỏi `-KCN` không · 68 bộ mẹ rỗng vẫn «Hoạt động».

**PO chốt 2026-10-24:** DT-2 nộp trễ > 30 giây = không đạt; thi thử ẩn đáp án đến khi nộp · QL-1 xóa mềm, ghi chú theo người tạo · NKBV đóng băng ở mức ghi ca + danh sách + tỉ lệ · kế hoạch 4 tuần: VST funnel/run chart → QLCV → CSSD tay + sửa Đào tạo → đo lại.

**QLCV (2026-10-25):** QL-1 đã chốt (xóa mềm, ghi chú theo người tạo); `deleteCongViec` (`cong-viec-write.actions.ts`) thực tế xóa cứng phiếu đề xuất/trống, phiếu đã làm dùng Hủy `DA_HUY`. QL-A xong `d258f6c0` (việc «Trả về làm lại» được nộp lại).

**Kiến trúc module (PO duyệt 2026-11-10):** Quản trị chỉ lo hệ thống (tài khoản, nhân sự, khoa phòng, tổ, phân quyền, nhật ký); module nghiệp vụ giao về tổ và tự giữ danh mục riêng; chủ nhiệm khoa duyệt chuyên môn qua vai trò `CHU_NHIEM_KHOA` (giữ kèm `ADMIN`). Phụ thuộc một chiều: Quản trị → Điều hành khoa → module nghiệp vụ → `lib/master-data` → nền tảng. Danh mục CSSD: thay đổi liên quan an toàn phải đề nghị + duyệt, sửa nhỏ làm trực tiếp có nhật ký. Menu danh mục CSSD và bảng kiểm về module của tổ (thay câu «Master CSSD: CRUD tại Quản trị» khi lát AR-5 xong).

| Lát | Việc | Trạng thái |
|---|---|---|
| AR-0 | Ghi quyết định vào docs | Xong 2026-11-10 |
| AR-1 | Vai trò `CHU_NHIEM_KHOA`; 2 action duyệt kiểm quyền `approve` thay tên `ADMIN` | Code xong local (migration `20261111150000`); vai trò cộng thêm, 0 người được gán. **Chờ PO:** áp prod + gán người. Nợ: test tay UI bằng tài khoản không phải ADMIN |
| AR-2 | Luật import bằng lint (`warn`) | Xong 2026-11-10. Vùng nào về 0 cảnh báo thì nâng `error` |
| AR-3 | Gateway đọc danh mục → `src/lib/master-data` | Xong 2026-11-10 |
| AR-4 | Màn Phê duyệt `/phe-duyet` + module `dieu-hanh-khoa` | Xong 2026-11-10 (hàng chờ = đề nghị danh mục + rà soát BOM; phiếu kho hóa chất vẫn duyệt ở `/cssd-hoa-chat`). Nợ: từ chối không hỏi lý do (`reject_reason` rỗng); chưa thử duyệt; chưa thử tài khoản không phải ADMIN |
| AR-5 | Danh mục dụng cụ/hóa chất/thiết bị → `cssd-erp`, bảng kiểm → `giam-sat-chung`; duyệt theo rủi ro | 5a–5d xong 2026-11-10. 5d: quyền `approve` (migration `20261111150100`) + trigger `fn_cssd_dm_approve_guard` (`20261111150200`) chặn ghi thẳng PostgREST khi thiếu `approve`; PO chọn không làm hàng chờ mới; áp prod 2 migration = cổng PO. Nợ: `master-crud-core` + 4 action CRUD còn ở Quản trị (hướng: chuyển về `src/lib/master-data`); chưa có tab «Bảng kiểm» trong thanh GSC; chưa thử thao tác ghi / tài khoản không phải ADMIN |
| AR-6 | Gộp `cssd-erp` + `cssd-su-co`; áp mô hình cho NKBV/QLCV/Đào tạo | Backlog; PO giữ tách 2 module (xem «Ranh giới module») |
| AR-7 | Tồn đọng Quản trị (rà 2026-11-11) | Xóa 105 dòng `sys_mdm_registry` trỏ bảng không còn: migration `20261111150300`, xong local, prod = cổng PO. Các mục mức Thấp còn lại (`permission-registry-data.ts` thiếu `APPROVE`, `rules/mdm.md` lỗi thời, `CHU_NHIEM_KHOA` không gán được từ UI, `saveKhoaPhongAction` không zod, anon EXECUTE `rpc_mdm_nhan_su_max_numeric_suffix`, break-glass không kiểm `email_confirmed_at`): `SO_NO_APPKSNK.md` |
| AR-8 | Phân cấp Quản trị (PO chốt 2026-11-11: tổ chức tách module riêng; lookup miền sửa trong module; chỉ ADMIN sửa lookup) | 8a–8g xong local 2026-11-11: module `/to-chuc`; hub Quản trị = Tài khoản · Phân quyền · Hệ thống; lookup GSTT ở `/giam-sat-chung/danh-muc`, CSSD ở `/cssd-quy-trinh/danh-muc`. 8h xong local: migration `20261111150400` bỏ khóa `DANH_MUC`/`_GSTT`/`_CSSD_LOOKUP` (đọc lookup = authenticated, ghi = ADMIN; review PASS). **Prod = cổng PO: áp `20261111150400` + deploy code cùng lúc**, chạy 2 query kiểm trước: role có `DANH_MUC_CSSD_LOOKUP`/`_GSTT` view phải có ≥ 1 khóa CSSD view; `pg_policies` không còn policy khác chứa `DANH_MUC`. Báo PO: `KHACH_THONG_KE_GSTT`, `MANG_LUOI_KSNK` giờ thấy tab Danh mục GSC (chỉ xem). Còn: test tay (NV KSNK xem không sửa, ADMIN sửa được); `cssd-bo-active-cycle.spec.ts` đọc đường dẫn cũ (lệch từ AR-8c) |

**Tổng duyệt trên local (PO duyệt 2026-11-10):** Claude chạy kịch bản qua UI trên DB local trước khi giao người dùng thật; không thay cổng G1/G2 (thời gian nhập, phán đoán nghiệp vụ, phần cứng cần người thật). Dữ liệu thử có tiền tố `UAT-`, dọn bằng `node scripts/uat-cleanup.mjs` (mặc định chỉ liệt kê, `--apply` mới xóa, chỉ local). Thứ tự: QLCV → Đào tạo → VST/GSC → CSSD → NKBV. QLCV lượt 1–2 và CSSD lượt 1–8 đã chạy, lỗi tìm thấy đã sửa (chi tiết: bản `95d2bbe0`). **Còn mở, chờ PO/khoa CSSD:** QL-1 «xóa mềm» có áp cho phiếu đã có tiến độ không · «% hoàn thành» theo kỳ chưa đối chiếu · bộ `-KCN` không nạp được ETO/Plasma (xem Plasma = ETO ở trên) · `loai_bao_goi_id` NULL sau Đóng gói có bắt buộc không · 2 cặp trùng tên B01/B04 (vi phẫu -1, -2) chờ chọn bộ thật. Dữ liệu `UAT-HC-01` còn ở DB local.

**Chờ PO (gom một phiên/tuần; rà lại 2026-11-17, 9 mục cũ → 4 còn chờ):** tên người đầu mối NKBV, Đào tạo, QLCV (CSSD đã có; mặc định không thay được tên người) · KD-5 (lấy DDL `cssd_fact_kho_kiem_ke` từ prod hay bỏ; mặc định = không lấy, không bỏ, vì `destructive-change` và đọc prod cần MCP đã authorize) · GS-1 ma trận «ai xem gì» chính thức (mức L2) · Plasma–cellulose cần đầu mối CSSD xác nhận (02 §8.1).
**Đã chốt từ trước (bỏ khỏi Chờ, 4 mục):** QL-1 và hai câu DT-2 (PO 2026-10-24, dòng «PO chốt» ở trên) · ngưỡng 85/70 và 90/85 giữ nguyên, ghi «chưa có căn cứ» trong từ điển (PO 2026-11-06, `docs/archive/bao-cao/BAO-CAO-TONG-HOP.md` Phụ lục B.4 câu 5) · xóa phiên VST giữ mềm `is_active=false` (Khóa PO 2026-10-09).
**Mặc định áp dụng 2026-11-17 (PO: «chốt theo mặc định»; mặc định = giữ hiện trạng, đảo lại được):** DT-2 câu «thi thử dùng chung ngân hàng» = giữ dùng chung (chưa kiểm mã) · V1 = chỉ hóa chất; vật tư phi hóa chất (bao gói, găng, chỉ thị hóa học) ngoài phạm vi, theo `docs/bo-tai-lieu/02-nghiep-vu-domain.md:268` · Plasma–cellulose = giữ chặn cứng như mã hiện có (`assertPlasmaPackMaterialAllowed`, chặn ở nạp mẻ) · GS-1 = cách đọc ở local (VST-015/023/026) là ma trận cho L1; **không** cho phép áp lô prod VST-025 hay NKBV-041 (vẫn cổng PO).

**Việc PO ngoài repo:** Supabase Auth (tắt tự đăng ký, xác nhận email, chặn mật khẩu rò rỉ, redirect URL) · `NEXT_PUBLIC_SITE_URL` + `<site>/login/reset-password` · `KSNK_BREAK_GLASS_EMAILS` tài khoản thật · CSP/X-Frame-Options/HSTS · rà phiếu RESET đang chờ trên prod.

**Đề xuất rà soát toàn diện 2026-11-10 (T0–T3):** T0 một dòng chảy `main` → Vercel tự deploy → migration một cửa + `sync:check` (xong, xem dòng dưới) · T1 mỗi lần một module tới L1 với người dùng thật (QLCV → Đào tạo → CSSD → NKBV) · T2 nguồn nghiệp vụ = biểu mẫu KSNK.QT/BM của viện, mỗi module một trang đặc tả · T3 gọn lệnh npm, rules, tài liệu trùng theo danh sách PO duyệt (lát 3b). Lúc đó prod chỉ VST (3.613 phiên) + GSC (1.400 phiên) có dữ liệu thật. Module `chat-thai-do-vai` chưa có trong lộ trình/ssot-map: chờ PO quyết giữ hay gác.

**Tuần 0 — một dòng chảy (PO duyệt 2026-11-10):** `npm run sync:check` (prod, đọc token `.env.local`) và `sync:check:local` (`scripts/sync-check.mjs`: so tên migration repo với DB + SHA Production với `origin/main`; exit 1 khi lệch). Production tự build từ `main` (PR `#125`, `86f5b55b`); chạy `sync:check` tay trước mỗi merge có migration. **CI:** role `ci_migration_reader` (NOLOGIN, chỉ `SELECT (version, name)`; migration `20261110100000`, đã apply prod) + job `sync-check` trong `ci.yml` (PR `#126`, `11515851`; thiếu secret `SYNC_CHECK_DB_URL` → SKIP; không `npm ci` vì PAT toàn tài khoản trong job chạy script của nhánh PR là No-go). **Chặn bật login cho role:** prod schema `public` còn `CREATE` cho PUBLIC → cần migration `20261111090000_revoke_public_create_on_schema_public.sql` (đã viết, review 0 Critical/High; trạng thái apply prod kiểm bằng `sync:check`). Sau đó PO tự: `alter role ci_migration_reader with login password '…'`, đặt secret `SYNC_CHECK_DB_URL` (pooler, user `ci_migration_reader.<ref>`), bật branch protection cho `main` và đặt check «Sync check — migration repo vs prod» làm required. Dọn chờ PO duyệt xóa: nhánh/worktree/stash đã gộp (`git worktree list`, `git stash list`).

**Backlog gia cố (đóng băng, chỉ mở khi đủ luật dừng):** NS-MUC (form Danh mục chọn `muc_quan_ly` của chức vụ: cần tạo lại view `mdm_dm_chuc_vu` kèm metadata + sửa hook/modal; hiện mức chỉ seed bằng migration `20261031010000`) · NK-TZ2 («hôm nay» UTC 5 chỗ) · NK-SCOPE nợ lọc phạm vi + RLS DB · N1 phần còn lại (thay 44 `any` ở NKBV; ~15 file NKBV 600–1.400 dòng) · KD-2 form tự đổi PP · KD-3 chạy thử import · KD-4 nợ a–f · K3/QL-1/GS-1 phần RLS · CS-GATE nợ (`recall-receive` chèn+tắt, map lỗi trigger) · D1/Q1 spec + e2e · Zod nhập lô · H1 gọn lệnh npm (lát 3b) · đo lượt xem báo cáo · sao lưu prod định kỳ (PO xem dashboard Supabase) · KD-5 (lấy DDL `cssd_fact_kho_kiem_ke` từ prod hay bỏ).

**Ranh giới module + N1 (PO 2026-11-10):** giữ tách `cssd-su-co` và `cssd-erp`; ba tầng một chiều: lõi CSSD (`cssd-erp/types`, `shared`, `workflow/domain`) ← `cssd-su-co` ← phần còn lại của `cssd-erp`. Cổng `npm run guard:boundaries` (nối vào `verify:engineering`, baseline `scripts/module-boundaries.baseline.json`, chỉ được giảm; `--prune` bỏ dòng hết vi phạm, `--init` cần PO). Baseline còn: `lib → modules` 58 · lõi → `cssd-su-co` 2 · `cssd-su-co` → ngoài lõi 5 · `.from("…")` trong UI 1. Lý do giữ: xung đột quy ước entrypoint với luật ESLint, lỗ hổng lint với dynamic import, quyền sở hữu phụ thuộc lõi → sự cố (cảnh báo đỏ). N1 đã làm: `NkbvSyndromeIwpPanel` 1.745→258 và `NkbvBaMultiTimelineWorkspace` 2.151→475 dòng, di chuyển nguyên văn, đối chiếu ảnh chụp trước/sau. Còn lớn: `useNkbvIwpVerdicts` 685, `NkbvSyndromeIwpGrid` 752 dòng.

**Kiểm toán tổng thể 2026-11-10 → Giai đoạn 1 (PO duyệt 2026-11-10; nhánh `chore/code-vs-ai-phase1`, đã push 2026-11-15):** cổng đổi mật khẩu (`must_change_password` kiểm ở mọi cổng `verify*`; spec `src/lib/server-permission.spec.ts`) · `rowsToCsv` vô hiệu hóa công thức (`4177f102`; `.xlsx` không cần sửa) · log lỗi server một dòng JSON `"tag":"ksnk_server_error"` (`src/instrumentation.ts`, `25ee2d1d`) · TRUNCATE qbank: PO chốt xóa file (DT-001); `scripts/sql/seed-qlcv-dinh-ky-bv103.sql` (DELETE theo tiêu đề) không apply. Nợ vòng rà lát 1 và các mục nhỏ khác: `SO_NO_APPKSNK.md`.

**Quyết định PO 2026-11-11.** UI chính = nhánh `ui-design-minimal-professional`; UI v2 xóa ở local, bản lưu ở tag `backup/ui-v2-infection-control-eval` (`ed08dd0b`). Hàng đợi DB local: một chat một lúc. Nợ VST từ UAT 2026-11-10 :3001: khoa GV `allowed_khu_vucs=["KV_CHUNG"]` vẫn hiện «Phòng hồi tỉnh» (R3: nghi cache `getCachedDmKhoaPhong` 15 phút khi sửa bằng SQL); 102 s là thời gian đo bằng công cụ, mục tiêu < 60 s cần PO bấm giờ tay.

**Giai đoạn 0, gộp nhánh (PO duyệt 2026-11-11).** Nhánh tích hợp local `integrate/2026-11` (worktree `.claude/worktrees/integrate-2026-11`, từ `origin/main`) đã gộp 9 nhánh; `monitoring-module-review` gộp 2026-11-18 theo khóa PO 11-01 qua `ksnk_dm_tham_so` (`20261118100000`; `20261118110000_gstt_ke_hoach_giam_sat` đổi số từ `20261101010000`). Gỡ xung đột đáng nhớ: `cssd-heat-split-apply.ts` lấy bản bộ tổng (RPC `fn_cssd_dong_bo_tach_nhiet`); migration `khu_vuc_giam_sat_chuan_9` đổi số `20261110110000` → `20261110115000`. Trước lô prod phải kiểm hiệu lực từng migration vượt đầu prod (revoke CREATE, void_atomic, 3 file khu vực giám sát, ar5d/ar7, bộ tổng 100000–140000).

**Rà toàn project, luồng mới (PO duyệt 2026-11-11).** Một chat điều phối + agent con; thân mã duy nhất `integrate/2026-11`; việc lấy từ sổ lỗi `scripts/readiness/so-loi.json` (`node scripts/readiness/so-loi.mjs status|next|check`). Sáu bước: 0 dọn nền → 1 rà rộng → 2 xác minh Nghiêm trọng/Cao → 3 sửa song song theo module → 4 nghiệm thu (kịch bản tay + e2e) → 5 lên prod theo lô, PO duyệt từng lô. Xong module = `so-loi.mjs check` không còn lỗi chặn + verify pass + kịch bản tay.

**Nguồn tiến độ duy nhất là sổ lỗi (từ 2026-11-11).** Trạng thái từng việc đọc bằng `so-loi.mjs status | next | stats`; không chép lại vào file này. Ở đây chỉ ghi quyết định PO, thứ tự migration lên prod, bối cảnh môi trường. Không mở đợt rà mới cho đến khi `MOI` < 10.

| Số đo luồng | Mốc 2026-11-11 | Mục tiêu 2026-11-18 |
|---|---|---|
| Dòng `MOI` chưa xác minh | 41 | < 10 |
| `DA_SUA` / lỗi giả | 14 / 1 trên 15 việc đã đóng | theo `stats` |
| Module qua `check` | 5/7 (còn VST_GSC, CSSD) | 7/7, trừ việc `CHO_PO` |
| Dung lượng file này | 75 KB | < 25 KB (đạt 2026-11-18: ≤ 25 600 B) |
| Nhánh chưa gộp vào thân mã | 6 | PO quyết từng nhánh |
| Lần hỏi PO ngoài cổng dừng, phiên mở sai cây | 3 và 1 trong một phiên | 0 |

**Quyết định PO 2026-11-11 (Bước 2–3 của luồng rà):** prod CHO khách tự đăng ký, ADMIN duyệt (QT-003; còn email break-glass chưa có auth user trên prod: tạo sẵn hoặc tắt signup — việc PO) · người tạo việc không tự nghiệm thu, trừ ADMIN và chủ nhiệm khoa (QLCV-003) · ĐƯỢC thêm mã ca mổ sau cấp phát (CSSD-005) · thi thử không vượt cấu hình mức độ nhưng được thi lại (DT-002) · Hội đồng KSNK xem NKBV toàn viện. Còn chặn: VST-003 (PO duyệt RLS prod).

**Migration local chờ PO duyệt lên prod (2026-11-11; apply TRƯỚC, deploy code SAU):** `20261111160000_cssd_nhat_ky_ghi_actor` (CSSD-002) · `20261111170000` (NKBV-003, RLS theo khoa) · `20261111180000` (VST-006; trước khi áp chạy SQL kiểm cuối file: tài khoản ADMIN không có hồ sơ `mdm_nhan_su` hoạt động sẽ mất quyền 3 bảng gstt) · `20261111190000` (QLCV-002; prod cần `20261029120000` và `20261029150000` trước) · `20261111200000` (QLCV-003). `cssd_incident_void_atomic` trên prod mang version `20261110063506`, file local `20261110110000` (NEN-003: đẩy prod sẽ chạy lại file).

**Giai đoạn 1 chặn rủi ro (2026-11-11):** R1 không cần sửa (4 RPC CSSD đã gọi `fn_require_cssd_workflow_edit()`; Thấp: `authenticated` vẫn có EXECUTE). R2 xong `60dab610` (đặt lại mật khẩu qua email chạy action `completePasswordRecovery`, xóa cờ ở `user_metadata` và `app_metadata`). R3 không sửa mã. `rpc_cssd_nhat_ky_ghi` gọi qua service_role cần `p_actor_user_id` (đã sửa local, migration `20261111160000`).

**Đánh giá sẵn sàng vận hành thử (PO yêu cầu 2026-11-10, thay luật dừng rà soát cho đợt này):** mỗi module 5 bước (spec + e2e → ≥ 5 kịch bản tay qua UI local → đối chiếu prod chỉ đọc → sửa lỗi Nghiêm trọng/Cao chặn → kết luận Đạt / Đạt có điều kiện / Chưa ghi vào bảng Hiện trạng module). VST/GSC: **Đạt có điều kiện** (6/6 kịch bản đạt; thống kê kỳ 2026-09-01→2026-11-10 khớp SQL tính từ bảng fact). Sao lưu prod (lát 4) vẫn chưa kiểm được qua connector, PO xem ở dashboard Supabase.

Câu hỏi PO thêm từ kiểm toán: phạm vi đọc VST/GSC mặc định toàn viện (`gsc-read-scope.ts:23,47`) · thống kê cho mạng lưới/khách xem mọi khoa · số phận migration TRUNCATE Đào tạo · ngưỡng hoàn thành GSC · NKBV thiếu ngày = «không có ca» hay «chưa đủ dữ liệu».

Model: theo `CLAUDE.md` mục «Ngân sách model và agent» (mặc định Sonnet; Haiku chỉ `chay-kiem`; Opus chỉ `migration-author` và reviewer vùng rủi ro cao).

File SQL repo: `supabase/migrations/20261008221231_vst_valid_opp_moment_cap.sql`. Không đổi tên cho khớp timestamp prod.
