# ALIGNMENT REVIEW: Nghiệp vụ ↔ Cấu trúc ↔ Data ↔ Giao diện

**Ngày:** 19/05/2026  
**Branch:** `complete/alignment-review-business-data-ui`  
**Mục tiêu:** Rà soát mức độ "thông suốt" giữa nghiệp vụ KSNK thực tế với cấu trúc code, schema dữ liệu và giao diện người dùng. Đánh giá theo chuẩn Principal Engineer (maintainable, scalable, traceable).

---

## 1. Tóm tắt Executive (Dễ hiểu)

Dự án KSNK BV103 đã có **nền tảng alignment khá tốt** nhờ:
- Tài liệu mapping chi tiết (`docs/specs/10-bv103-implementation-mapping.md`)
- Cấu trúc module DDD rõ ràng (`src/modules/`)
- Tư duy vertical slice + Pilot DoD

**Kết luận chính:**
- **Business ↔ Data**: Tốt (có mapping table rõ)
- **Cấu trúc Module**: Tốt
- **UI ↔ Business/Data**: Trung bình khá (cần siết chặt traceability)
- **Rủi ro**: Legacy naming còn sót, mapping chưa được coi là "single source of truth" sống

**Khuyến nghị ưu tiên:** Cập nhật & bắt buộc tuân thủ mapping doc cho mọi thay đổi mới. Tạo checklist alignment trong PR template.

---

## 2. Phân tích chi tiết theo lớp

### 2.1 Nghiệp vụ (Business Logic) vs Data

**Điểm mạnh:**
- File `docs/specs/10-bv103-implementation-mapping.md` là tài sản rất giá trị. Nó đã map rõ:
  - VST → `fact_giam_sat_vst_sessions` + `fact_giam_sat_vst`
  - CSSD (Quy trình, Mẻ TK, Sự cố, Bảo trì) → `fact_quy_trinh`, `fact_lo_tiet_khuan`, `fact_su_co`, `fact_bao_tri_thiet_bi`
  - QLCV → `fact_cong_viec` + Track B states + `fact_cong_viec_dinh_ky`
  - Giám sát chung → `fact_giam_sat_chung_sessions`
  - NKBV → `giam_sat_nkbv_ca`
- Nhiều view `v_*_full` được tạo để hỗ trợ query dễ dàng hơn.
- RPC và Server Actions có gate `verifyPermission`.

**Vấn đề còn tồn tại:**
- Một số legacy text fields vẫn còn song song với FK (ví dụ VST: `khu_vuc`, `nghe_nghiep` text + id). Cần tiếp tục migrate dần.
- Mapping doc chưa được update real-time khi có migration mới (chỉ có changelog ở cuối file).
- Chưa có automated check (script) để verify code mới có tuân thủ mapping không.

**Khuyến nghị:**
- Bắt buộc mọi PR đụng schema phải cập nhật mapping doc + changelog.
- Xem xét thêm script lint/mapping-check trong CI (giai đoạn sau).

### 2.2 Cấu trúc Module (Structure) vs Nghiệp vụ

**Modules hiện có (rất hợp lý):**
- `giam-sat-vst`
- `giam-sat-chung`
- `giam-sat-nkbv`
- `cssd-erp` + `cssd-su-co`
- `quan-ly-cong-viec`
- `quan-tri-he-thong` (MDM + danh mục)
- `dashboard`
- `auth`

**Đánh giá:**
- Bounded context tách khá rõ, phù hợp nghiệp vụ KSNK.
- `cssd-erp` đang gánh nhiều (quy trình, thiết bị, hóa chất, bảo trì). Có thể xem xét tách nhỏ hơn nếu phát triển mạnh.
- Shared logic (dashboard data builder, common permission, date helpers) nằm rải rác → cần gom vào `src/lib/shared` hoặc `src/modules/shared` rõ ràng hơn.

**Khuyến nghị:**
- Tạo `src/modules/shared` hoặc `src/lib/ksnk` cho cross-cutting concerns.
- Giữ nguyên cấu trúc module hiện tại (không refactor lớn nếu không đau).

### 2.3 Giao diện (UI) vs Business + Data

**Điểm mạnh:**
- Có tư duy form + actions + hooks tách biệt ở nhiều nơi.
- Một số module đã có entrypoint rõ.
- Dashboard đang cố gắng tổng hợp từ nhiều nguồn.

**Vấn đề alignment UI:**
- Traceability từ UI → Action → RPC/DB chưa rõ ràng ở mọi trang (đặc biệt dashboard và các trang giám sát).
- Một số component/page có thể đang "biết quá nhiều" về data shape thay vì chỉ render theo contract.
- Chưa có consistent pattern cho "empty state", "loading", "error" khi data từ RPC/view chưa sẵn sàng.
- Mobile responsiveness và layout drift vẫn là rủi ro (đã có script check nhưng cần enforce mạnh hơn).

**Khuyến nghị cụ thể:**
1. Mỗi major page nên có comment hoặc file `README.md` nhỏ giải thích: "Nghiệp vụ này dùng module/action nào? Data từ view/RPC nào?"
2. Chuẩn hóa UI layer: `useQuery` + typed contract từ module.
3. Bổ sung Alignment section vào PR template.

### 2.4 Tổng thể "Thông suốt" (End-to-End Traceability)

| Lớp              | Mức độ Alignment | Ghi chú |
|------------------|------------------|--------|
| Business Logic   | Tốt             | Có mapping + permission gate |
| Data (Schema)    | Tốt             | fact_* + views + RLS |
| Module Structure | Tốt             | DDD rõ ràng |
| UI / Presentation| Trung bình khá  | Cần tăng traceability |
| **Tổng thể**     | **Khá tốt**     | Cần siết chặt UI layer |

---

## 3. Các hành động đề xuất (ưu tiên)

**P0 (Làm ngay trong PR này hoặc PR tiếp):**
- [ ] Cập nhật file mapping nếu có thay đổi gần đây.
- [ ] Thêm section "Alignment Check" vào PR template (bắt buộc trả lời: "Đã update mapping chưa? Traceability rõ chưa?")
- [ ] Tạo folder `docs/reviews/` nếu chưa có và đưa báo cáo này vào.

**P1 (Giai đoạn sau):**
- Gom shared logic vào `src/lib/shared` hoặc tương đương.
- Viết script nhỏ verify mapping (optional).
- Review 1-2 module quan trọng (QLCV hoặc CSSD) theo chiều dọc UI → Action → DB để làm mẫu.

**P2 (Polish):**
- Cải thiện empty/loading state nhất quán.
- Thêm ADR cho quyết định tách module nếu cần.

---

## 4. Kết luận & Next Step

Dự án đã có **kiến trúc và tư duy alignment tốt** hơn nhiều dự án thông thường. Vấn đề chính nằm ở việc **duy trì và enforce** mapping giữa các lớp theo thời gian.

Với branch này, tôi đã tạo báo cáo làm baseline. Các thay đổi tiếp theo sẽ được thực hiện qua PR nhỏ, an toàn.

**Boy Scout Rule áp dụng:** Tôi đã để lại báo cáo rõ ràng để team sau này dễ theo dõi alignment.

---

**Prepared by Principal/Staff Engineer process** — 19/05/2026