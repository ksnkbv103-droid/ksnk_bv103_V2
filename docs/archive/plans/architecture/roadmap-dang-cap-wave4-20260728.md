# Roadmap đẳng cấp — Sóng 4 (deferred)

> Ngày khóa: 2026-07-28 · Không implement trong đợt cải tổ cửa vào/UX.  
> Chỉ mở khi viện có hệ thống nguồn / PO duyệt intake riêng.

## Trạng thái

| Hạng mục | Debt / doc | Trạng thái | Điều kiện mở |
|----------|------------|-----------|--------------|
| HIS/LIS FHIR (vi sinh tự động) | D-20 | **Deferred** | Có endpoint LIS/HIS + hợp đồng dữ liệu viện |
| Spaulding / đề xuất trạm TK | D-16 · MDM Lớp 1.1 | **Partial** (normalize master) | Intake «Lớp 1.1 loại dụng cụ» |
| Facade bổ sung kho | D-17 · MDM Lớp 1.4 | **Deferred** | Ledger kho ổn + UAT CSSD C1–C3 |
| Dead-code hygiene | CI WARN | Boy Scout từng PR | Không audit big-bang |

## Không làm trong Sóng 4 (cho đến khi PO mở chat)

- Gộp bảng fact / đổi KPI đã chốt
- Rewrite module Quản trị (F-04)
- Hard-block cấp phát CSSD
- Đổi Auth provider

## Cách mở slice

1. Chat mới `/intake-nv` — một hạng mục / một chat.  
2. Tham chiếu: [`improvement-roadmap-20260717.md`](../../modules/mdm/improvement-roadmap-20260717.md), [`debt-register.md`](./debt-register.md).  
3. Verify tối thiểu: `verify:engineering` (+ `verify:cssd` / `verify:mdm` nếu đụng schema).

## Liên kết chương trình

- Cải tổ IA/UX đã ship: Sóng 0–2 code + [`uat-after-reform-20260728.md`](./uat-after-reform-20260728.md)  
- Entity QR: [`entity-qr-allocation-20260728.md`](./entity-qr-allocation-20260728.md)
