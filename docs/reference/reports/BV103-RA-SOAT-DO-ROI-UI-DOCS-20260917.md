# Rà soát độ rối — UI · thống kê · tài liệu · tổ chức

> 2026-09-17 · Chỉ chẩn đoán & kế hoạch · Không code trong lát này  
> Phạm vi: toàn `ksnk_bv103` (user-facing + docs + IA)

---

## 1. Kết luận một câu

Phần mềm **không thiếu chức năng** — nó **dày lớp cửa vào** cho cùng một việc (nhìn số / nhập / so sánh). Người dùng thấy rối vì phải chọn giữa Hub → ModeNav → tab VST/GSC → filter → chart/tab → Nâng cao → BCTH, trong khi tài liệu nội bộ (nhiều báo cáo plan) cũng phình song song.

**Điểm rối cảm nhận: 7.5/10** (cao).  
**Điểm domain/engine: 8/10** (tốt hơn bề mặt).  
**Điểm tài liệu SSOT: 6.5/10** (có map nhưng báo cáo tháng 9 chồng chất).

---

## 2. Điểm đã hài hòa (giữ)

| Mặt | Trạng thái |
|-----|------------|
| Sidebar | Gọn: Báo cáo chính thức · Giám sát · Công việc · Thi · CSSD (4–5 mục) |
| H2 | `/` → BCTH; bỏ «Việc hôm nay» / QLCV trên điều hành |
| VST ≠ GSC | Hai nhánh đo riêng (đúng domain) |
| Lens TGS×KSNK | Toggle 1 nguồn; không CCS |
| Chart khoa | Tab % / khối lượng; so sánh mở trên fold |
| Metric dictionary | SSOT chỉ số rõ |

→ Rối **không** vì “thiếu chuẩn domain”, mà vì **nhiều bề mặt cùng nói một câu**.

---

## 3. Bản đồ cửa vào (vì sao rối)

```text
Sidebar «Giám sát»
  → Hub /giam-sat          (CTA nhập VST/GSC/NKBV + lịch sử + QR)
    → Form / Lịch sử / Thống kê   ← ModeNav (lặp trên mọi trang module)
      → Thống kê: tab VST|GSC + filter sticky + toggle nguồn
        + chart tab %|volume
        + block So sánh & xu hướng
        + Nâng cao (đối soát / TGS / KPI)
  → Báo cáo chính thức /bao-cao-tong-hop
      (KPI · Xu hướng · VST · GSC · NKBV · More: BK · thời điểm · chuyên đề · CSSD)
```

**Một việc «xem tuân thủ VST»** hiện có ≥4 đường:

1. Hub → Lịch sử VST → ModeNav → Thống kê  
2. ModeNav Thống kê trực tiếp  
3. BCTH block Vệ sinh tay  
4. Deep-link `#so-sanh` / `?bk=`

Mỗi đường **đúng kỹ thuật**, nhưng **não người phải nhớ bản đồ**.

---

## 4. Chấm điểm theo trục

| Trục | Điểm /10 | Nhận xét |
|------|----------|----------|
| Độ phức tạp nghiệp vụ | 6 | VST WHO + GSC 36 BK + NKBV + CSSD — *đúng* là nhiều; không thể gộp thành 1 app đơn |
| Độ cầu kỳ UI | **8** | Quá nhiều chrome/tab/details cho 1 job |
| Chồng lấn bề mặt | **8** | Hub ↔ ModeNav ↔ BCTH ↔ Nâng cao nói gần như cùng số |
| Thống kê tổ chức | 6.5 | Sau rev tốt hơn; vẫn dài (chart + compare + nâng cao) |
| Tài liệu | **7** | `ssot-map` tốt; 9 file plan BV103-* trong tháng 9 + archive + compendium → khó «một cửa» |
| Code theo module | 7 | NKBV/CSSD lớn là hợp lý; GSC chrome/`lib` dày |
| Tổng thể cảm nhận user | **4.5** | «Nhìn vào là rối» — khớp chẩn đoán |

---

## 5. Gốc rối (5 nguyên nhân)

1. **Nhiều “cổng” cho một vai** — Hub + ModeNav + sidebar Báo cáo + (cũ) Tổng quan đã gỡ nhưng habit còn.  
2. **Thống kê cố gói quá nhiều sản phẩm** — % · volume · trend · 5 chiều so sánh · đối soát · TGS · KPI trên một trang cuộn.  
3. **BCTH vẫn là “cửa hàng tổng hợp”** — 5 section chính + More; mỗi section lại có toggle/chart riêng → giống 2 app trong 1.  
4. **Docs plan sinh nhanh hơn docs đóng** — Sept có ~9 báo cáo cải tổ; agent/PO đọc được nhưng user cảm thấy “hệ thống đang redesign liên tục”.  
5. **Nhãn kỹ thuật lộ** — ModeNav «TK», TGS/KSNK, Nâng cao, comparable — dù đã cải thiện vẫn dày.

**Không phải gốc:** thiếu Action board; thiếu RPC; thiếu VST≠GSC.

---

## 6. Tài liệu — tổ chức hiện tại

| Lớp | Vai | Vấn đề |
|-----|-----|--------|
| `docs/ssot-map.md` + `core/` + `modules/*/README` | Đúng cửa khi sửa code | OK |
| `metric-dictionary.md` | Chỉ số | OK |
| `docs/archive/` | Kho cũ | Đúng vai — không đọc khi sửa |
| `reference/reports/BV103-*` (tháng 9) | Plan/chẩn đoán | **Quá nhiều file song song** — cần 1 “SSOT plan đang hiệu lực” |
| `ksnk-bv103-compendium` | Snapshot | Ghi rõ không thay SSOT — tốt |

**Khuyến nghị docs:** 1 file plan đang hiệu lực (`GIAM-SAT-CHIEN-LUOC` hoặc `RA-SOAT-...`); các plan cũ gắn banner «superseded»; không viết plan mới trừ khi đóng plan cũ.

---

## 7. Kế hoạch giản hóa (ưu tiên — khi lệnh «làm»)

### P0 — Giảm cửa vào (UX, không đụng DB)

| # | Việc | Hiệu quả |
|---|------|----------|
| U1 | Hub `/giam-sat`: **2 CTA lớn** (VST · GSC) + 1 dòng «Lịch sử / Thống kê» (không 6 card) | Giảm shock vào module |
| U2 | Thống kê: **một** cột dẫn chuyện — chart trước; so sánh thu vào 1 accordion «So sánh theo…» (mở sẵn khối+KV, còn lại đóng) | Giảm cuộn |
| U3 | BCTH fold chính: chỉ KPI + 1 chart/module (deep-link thống kê cho chi tiết) | BCTH = in/điều hành, không phải BI thứ hai |
| U4 | Copy ModeNav: «Nhập · Lịch sử · Thống kê» (bỏ «TK») | Dễ đọc |

### P1 — Hài hòa thống kê

| # | Việc |
|---|------|
| S1 | Thống kê VST/GSC: Nâng cao chỉ **1** panel mở (đối soát *hoặc* TGS), không cả hai cùng fold cảm nhận |
| S2 | Filter bar: tối đa 4 control nhìn thấy; còn lại «Thêm lọc» |
| S3 | GSC navigator BK: giữ nhưng đặt *sau* chart % (hoặc tab riêng «Theo bảng kiểm») |

### P2 — Docs & code hygiene

| # | Việc |
|---|------|
| D1 | Gắn banner superseded lên 6–7 plan BV103-* cũ; chỉ 1–2 file “hiệu lực” |
| D2 | Không thêm report mới khi chưa đóng report cũ |
| C1 | (Sau UX) thu chrome VST khỏi `gscFormChrome` — giảm cảm giác “hai module một vỏ” |

### Không làm

- Gộp VST+GSC thành một module  
- Hồi CCS / Action board badge  
- Rewrite NKBV/CSSD vì “cảm giác rối” (rối chính ở **cửa vào & thống kê**)

---

## 8. Tiêu chí “hài hòa” (Done cảm nhận)

- [ ] Vào Giám sát: trong 5 giây biết bấm VST hay GSC  
- [ ] Thống kê: nhìn chart % là đủ «ai thấp/cao»; không cần badge  
- [ ] So sánh không bắt cuộn qua Nâng cao để thấy khối/KV  
- [ ] BCTH in được vai BGĐ mà không cần vào 4 trang thống kê  
- [ ] Docs: 1 plan hiệu lực + ssot-map; không 9 file plan tháng  

---

## 9. Trả lời thẳng câu Nghĩa

| Câu | Trả lời |
|-----|---------|
| Có phức tạp quá không? | **Có ở UI/IA**; domain thì vừa với bệnh viện KSNK. |
| Có cầu kỳ không? | **Có** — nhiều tab/details/surface cho cùng số. |
| Có chồng lấn không? | **Có** — Hub, ModeNav, BCTH, Nâng cao. |
| Thống kê đã đảm bảo chưa? | Kỹ thuật **gần đạt**; tổ chức **chưa** — vẫn dài. |
| Docs ổn chưa? | Map tốt; **plan tháng 9 rối**. |
| Vì sao nhìn vào rối? | Vì **quá nhiều cửa** và **quá nhiều khối trên một trang**, không vì thiếu tính năng. |

---

*Local-first · không commit trừ lệnh.*


## Trạng thái (cùng ngày)

**P0 đã implement local** — Hub gọn · ModeNav copy · accordion so sánh · BCTH nhẹ · docs SUPERSEDED. Chưa commit.
