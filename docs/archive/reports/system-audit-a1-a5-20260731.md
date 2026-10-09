# System audit A1 · A3 · A4 · A5 — 2026-07-31

> Cùng chương trình Full System Audit. Backlog mở: [`../architecture/open-backlog-20260731.md`](../architecture/open-backlog-20260731.md).

---

## A1 — Domain + UAT

| Checklist | Trạng thái | Ghi chú |
|-----------|------------|---------|
| Reform A–C (hub, QR, CSSD E2E) | **Chờ ký tay** | [`uat-after-reform-20260728.md`](../architecture/uat-after-reform-20260728.md) |
| Reform F (descriptive analytics) | **Chờ ký tay** | F1–F5 |
| NKBV clinical #2–#5 | **Eng ready / khoa chưa ký** | vitest 29 PASS @07-26; `D-14` |
| Soft CAP_PHAT / BOM | **SSOT giữ soft-warning** | Không đổi hard-block trong đợt này |

**Deliverable:** Ma trận UAT vẫn do khoa/KSNK điền — engineering không ký hộ. Gate kỹ thuật khi DB local lên: `npm run pilot:go-live:gate:local`.

---

## A3 — BE privilege heat-map

| Module | Admin calls | User calls | Ghi chú |
|--------|------------:|-----------:|---------|
| cssd-erp | 62 | 7 | Gate `verifyCssd*` / `verifyPermission` — order admin→verify |
| quan-tri-he-thong | 61 | 21 | Wrapper gate OK; **core CRUD hở** |
| dao-tao | 21 | 0 | Attempt = login only trước harden |
| giam-sat-* / cssd-su-co | 8–11 | 1–5 | Mixed |
| dashboard | 0 | 5 | User client — tốt |
| **Tổng ~** | **~179** | **~47** | Assert quyền = tường lửa thật |

### Rủi ro

| ID | Sev | Việc |
|----|-----|------|
| BE-MASTER-01 | P0 | Bỏ `"use server"` khỏi `master-crud-core` (không export action trần) |
| BE-GUEST-01 | P1 | Enforce guest path ở `proxy.ts` |
| BE-DAO-TAO-01 | P1 | `verifyPermission(DAO_TAO, view)` trên attempt + sync seed |
| BE-CSSD-01 | P2 | Convention verify-before-admin |

---

## A4 — DB parity

| Gate | Kết quả 2026-07-31 |
|------|---------------------|
| `audit:legacy-rpc` | **PASS** — 23 RPC, 0 orphan src |
| Migrations head | `20260729170000_qlcv_assignment_fields` (+ dao_tao lean) |
| Seeds | `00-rbac.sql` · `01-pilot-nhan-su.sql` có |
| `verify:mdm:local` postcheck SQL | **Blocked** — Docker daemon / `127.0.0.1:54322` refused |
| `pilot:go-live:gate:local` | **Blocked** — cùng lý do DB local |
| `layout:drift-check` | WARN adoption + vài `text-[11px]` label (21 khớp) |

**Kết luận A4:** Static RPC sạch; **parity live chưa re-verify** đến khi bật Supabase local. Không đoán schema.

---

## A5 — Analytics contract (top gaps)

| # | UI label | Status | Hành động đề xuất |
|---|----------|--------|-------------------|
| 1 | «Không sự cố» (BCTH) | Ambiguous | Đổi nhãn đầy đủ `ty_le_quy_trinh_khong_su_co` |
| 2 | `ti_le_xac_nhan_nkbv` | Missing | Thêm công thức vào metric-dictionary |
| 3 | CLABSI /1k (Trụ D) | Missing | Định nghĩa Rate hoặc ẩn đến khi có mẫu số |
| 4 | «Cấp phát kỳ» | Ambiguous | Alias SSOT `san_luong_cap_phat` |
| 5 | `so_bo_danh_muc` | Missing | Entry dictionary |
| 6 | «Trạm tốt nhất» / tỷ lệ lỗi | Missing | Định nghĩa ranking |
| 7 | Cảnh báo đỏ / đóng băng | Missing | Entry Management Control |
| 8 | Mục tiêu `ty_le_ccs` seed | Ambiguous | Align deprecation CCS surface |
| 9 | Trụ A «Tuân thủ» + brief CCS trong doc | Ambiguous | Sửa dictionary Trụ A = VST%·GSC% |
| 10 | PDCA `chi_so` thô | Ambiguous | Map nhãn nghiệp vụ |

**Ổn:** `ty_le_vst` / `ty_le_gsc`, delta 2 tuần ISO, `ky_truoc`, `ty_le_quy_trinh_khong_su_co` (tên đầy đủ), mẻ/QC/máy.

---

## Case kiểm tay (kỹ thuật — khi DB lên)

1. `npm run pilot:go-live:gate:local` → 11/11.  
2. Login role có/không `DAO_TAO` → vào `/dao-tao` đúng gate.  
3. Guest → chỉ `/thong-ke/vst|gsc`; gọi action CSSD bị từ chối.
