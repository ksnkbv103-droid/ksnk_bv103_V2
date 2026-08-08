# Methodology — Phiếu NKBV tinh gọn, đủ chuẩn CDC

> **A0** · 2026-08-05  
> Neo: SSOT §5.2–§5.4 · Hợp đồng UI: [`../clinical-forms.md`](../clinical-forms.md)

## 1. Vấn đề

| Cực | Đặc điểm | Rủi ro |
|-----|----------|--------|
| Phiếu giấy đầy (vd. PNEU-2026) | Đủ audit / đào tạo IP | Quá tải nếu copy nguyên lên app |
| Form app mỏng | Nhanh vận hành | Thiếu field → lệch phân loại NHSN |

Mục tiêu: **đủ CDC trên dữ liệu**, **tinh gọn trên màn hình**.

## 2. Ba lớp thông tin (L1 / L2 / L3)

| Lớp | Tên | Định nghĩa | UI |
|-----|-----|------------|-----|
| **L1 Core** | Bắt buộc phân loại | Thiếu → không ra đúng classification (PNU/LCBI/CAUTI/VAC/SSI…) hoặc POA/HAI/device-association | Luôn hiện trên màn vận hành |
| **L2 Branch** | Nhánh có điều kiện | Chỉ khi gate mở (commensal, ≤1 tuổi, PNU3, PVAP, organ-space…) | Hiện khi điều kiện đúng |
| **L3 Audit** | Ruled-out / giải trình / đào tạo | Không đổi tử số nếu L1 đã “không đạt”; phục vụ kiểm toán | Thu gọn; bắt buộc khi Loại trừ / Ruled-out |

**Đủ chuẩn CDC** = đã thu thập L1 + mọi L2 đã kích hoạt, trong đúng cửa sổ thời gian (IWP / Event Period / Surveillance).  
**Tinh gọn** = không hiện L2/L3 khi chưa cần; không bắt nhập lại field hệ thống đã tính (Computed).

## 3. Rubric chấm từng field

Trước khi xếp field vào L1, trả lời:

| # | Câu hỏi | Hướng xếp |
|---|---------|-----------|
| 1 | Ảnh hưởng **classification** engine? | Có → L1 hoặc L2 |
| 2 | Chỉ mở khi **gate** khác đúng? | → L2 |
| 3 | Chỉ **giải trình loại trừ** / đào tạo? | → L3 |
| 4 | Đã có từ LIS / BA / Registry / metrics? | → **Computed** (đọc + sửa khi sai) |
| 5 | Trùng field khác (OR cùng tiêu chí CDC)? | → **Gộp** nhóm + ngày sớm nhất |
| 6 | Hiếm tại BV103 và không đổi tử số? | Nghiêng L3 hoặc Drop |

Ký hiệu bảng phân lớp (A2): `L1` | `L2` | `L3` | `Computed` | `Drop`.

## 4. Quy tắc ẩn / hiện (progressive disclosure)

1. Chỉ render field của **loại NKBV đang chọn**.  
2. Triệu chứng dương tính → bắt buộc **ngày ∈ cửa sổ**.  
3. **Cấm mâu thuẫn domain:** ẩn tiểu buốt/gấp/rắt khi Foley tại chỗ; **không** hiện X-quang trên form VAE.  
4. Prefill device từ Registry — không ghi đè ngày user đã sửa.  
5. Vi sinh LIS: tóm tắt luôn; chi tiết ngưỡng (BAL/ETA…) chỉ khi mở nhánh PNU2/PVAP.  
6. L3 Ruled-out: hiện khi classification âm / user chọn loại trừ / IP mở “Chi tiết kiểm toán”.

## 5. Hai bề mặt sản phẩm (cùng mã field)

| Bề mặt | Mã trong repo | Mục đích |
|--------|---------------|----------|
| **A — Vận hành** | Phần A trong `*-2026.md` + runtime form | Điền khi có trigger |
| **B — Phụ lục điều tra** | Phần B trong `*-2026.md` | In / đào tạo / đi buồng giấy |

Không tạo hai “chuẩn” mâu thuẫn: B chỉ là view đầy đủ của cùng schema verification JSONB.

## 6. Tiêu chí “đủ CDC” vs “đủ giấy đào tạo”

| | Đủ CDC (ship P0) | Đủ giấy đào tạo (P1) |
|--|------------------|----------------------|
| Dữ liệu | L1 + L2 kích hoạt | + L3 đầy đủ + chữ ký IP giấy |
| UI | Màn A | Phụ lục B / PDF |
| Engine | Classification + Secondary đúng | Không bắt buộc thêm rule |

## 7. Ví dụ áp dụng nhanh — mẫu giấy PNEU → phân lớp

| Field giấy | Phân lớp | Lý do |
|------------|----------|-------|
| Hình ảnh thâm nhiễm trong IWP | L1 | Bắt buộc PNEU |
| Bệnh nền tim–phổi → 1 vs ≥2 phim | L2 | Gate từ “có bệnh nền” |
| Sốt OR WBC (một nhóm) | L1 | Toàn thân ≥1 |
| AMS ≥70 tuổi | L2 | Chỉ khi tuổi ≥70 |
| Ho / đờm / rale / PaO₂ (nhóm hô hấp, cần ≥2) | L1 | Tiêu chí tại chỗ |
| Checklist miễn dịch PNU3 từng dòng | L2 | Chỉ khi chọn PNU3 |
| Ngưỡng BAL/ETA/PSB chi tiết | L2 | Khi PNU2 |
| Ruled-out: xẹp phổi, Candida đờm… | L3 | Audit |
| Họ tên / PID / ngày rà soát IP | Computed / Shared | Từ ca + BA; không nhân đôi trên 5 form |
| CDC Location mã chuẩn | L3 / P1 | W4 Location Mapping tạm dừng |

## 8. Ma trận gánh nặng nhập liệu (ước lượng)

| Hội chứng | Tick L1 điển hình | L2 hay gặp | Ghi chú |
|-----------|-------------------|------------|---------|
| BSI | ~6–8 | Commensal / MBI | Recognized ít tick hơn |
| UTI | ~5–7 | Foley / voiding / infant | Ẩn voiding giảm gánh |
| VAE | bảng vent + 3–5 | IVAC/PVAP | Nặng ở bảng PEEP/FiO₂ |
| PNEU | ~8–10 | PNU2/3, VAP device | Nặng nếu mở hết lab |
| SSI | ~6–8 | depth criteria | Depth selector giảm noise |

Mục tiêu vận hành: **≤ 12 tương tác bắt buộc** cho ca “đạt chuẩn đơn giản”; L2/L3 không tính vào ngân sách mặc định.

## 9. Quan hệ tài liệu

```
SSOT (thuật toán) → trees/*.md (cây + phân lớp)
                 → *-2026.md (A vận hành + B phụ lục)
                 → clinical-forms.md (hợp đồng UI)
                 → runtime sub-forms (A6+)
```
