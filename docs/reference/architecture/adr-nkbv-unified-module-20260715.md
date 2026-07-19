# ADR: NKBV thống nhất — không tách 4 app theo hội chứng (2026-07-15)

## Trạng thái

**Accepted (2026-07-15)** — Product Owner xác nhận chiến lược sản phẩm: giữ một module NKBV; tách UX theo vai trò/loại; không tách 4 app.

## Bối cảnh

Trên hub giám sát BV103 có **ba miền khác nhau**: VST (rửa tay WHO), GSC (bảng kiểm tuân thủ), NKBV (ca nhiễm khuẩn bệnh viện / HAI). Câu hỏi tách/gộp **NKH / tiết niệu / viêm phổi / vết mổ** nằm **trong NKBV**, không đụng VST/GSC.

Trong NKBV đã có một entity ca (`nkbv_fact_su_kien`), form con theo loại, engine CDC chung, và dashboard CLABSI | CAUTI | VAP | SSI cùng nguồn.

## Quyết định chốt

**Giữ một sản phẩm NKBV thống nhất; không tách 4 ứng dụng.**  
**Tách theo vai trò và bước quy trình + lọc theo loại** — không tách theo hội chứng thành 4 app.

| Tầng | Chốt |
|------|------|
| Sản phẩm / DB | **Một** module NKBV (`/giam-sat-nkbv`), **một** ca theo đợt nằm viện (stay-centric), **một** luồng trạng thái |
| UI nhập liệu | **Bốn form con** theo loại (BSI / UTI / VAE-PNEU / SSI) trên cùng phiếu |
| Trải nghiệm | Lọc / ưu tiên theo vai trò và loại phổ biến của khoa — **view khác**, không module khác |
| Ngoài phạm vi | **Không** tạo `/giam-sat-nkh`, `/giam-sat-uti`, …; **không** gộp VST/GSC vào NKBV |

## Lý do chính

- Một bệnh nhân / đợt nằm viện cần nhìn xuyên hội chứng (secondary BSI, RIT 14 ngày, đổi phán quyết mẫu).
- Mẫu số ngày thiết bị và phẫu thuật dùng chung bệnh án — tách app dễ lệch số.
- Báo cáo dịch tễ toàn viện và chuẩn CDC cần một nguồn; nhân 4 chỗ Day-3 / RLS / import / duyệt dễ lệch chuẩn.

## Việc UX tiếp theo (không đổi kiến trúc)

| # | Hạng mục | Trạng thái (2026-07-15) |
|---|----------|-------------------------|
| 1 | Làm sạch tên loại trên UI (VAE / VAP / HAP **tách riêng**) | **Done (sửa 2026-07-15)** — không gộp; VAE có tầng VAC/IVAC/PVAP |
| 2 | Lọc hàng đợi theo loại + trạng thái + khoa | **Done** — `listGiamSatNkbvCas` + tab Danh sách phiếu |
| 3 | UAT luồng Day-3 → điền form → KSNK duyệt | Kịch bản #1–#7 trong [`pilot-clinical-checklist-20260603.md`](../../modules/nkbv/pilot-clinical-checklist-20260603.md) — **chờ khoa ký tay** |
| 4 | Ổn định mẫu số denominator trước KPI | **Backlog slice riêng** — tab «Nộp Mẫu số» + RPC `fn_nkbv_dich_te_hoc_rates` đã có; cần quy trình vận hành khoa nộp đủ ngày thiết bị / ca mổ trước khi tin SIR |

Không redesign tách module giữa các hạng mục trên.

## Tham chiếu

- Bản tóm tắt PO: [`docs/modules/nkbv/product-strategy-unified-20260715.md`](../../modules/nkbv/product-strategy-unified-20260715.md)
- Nghiệp vụ: [`docs/modules/nkbv/domain-specification.md`](../../modules/nkbv/domain-specification.md)
- Form: [`docs/modules/nkbv/clinical-forms.md`](../../modules/nkbv/clinical-forms.md)
- Entity: [`docs/wiki/entities.md`](../../wiki/entities.md#nkbv-hai)
- Cổng module: [`docs/modules/nkbv/README.md`](../../modules/nkbv/README.md)
