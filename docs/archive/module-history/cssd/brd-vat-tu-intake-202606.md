# BRD intake — Vật tư phi-hóa-chất (CSSD)

> **Phase 4.3** · Intake trước code module mới. Trạng thái: **Chờ workshop NV KSNK**.  
> **Điều kiện mở workshop:** W1 §E đã ký; khuyến nghị W2 hóa chất P4 Pass.

## Bối cảnh

- Route `/cssd-hoa-chat` hiện gộp **hóa chất tiệt trùng** và nhãn UI «vật tư» trên cùng `cssd_dm_hoa_chat` + ledger `cssd_fact_kho_hoa_chat_giao_dich`.
- Rubric audit Phase 0: module hóa chất ~3.0 — thiếu ranh giới nghiệp vụ với vật tư tiêu hao khác (bao bì, indicator, vải, …).

## Agenda workshop W-VAT (90 phút)

| Phút | Mục | Owner |
|------|-----|-------|
| 0–10 | Mục tiêu: tách hay gộp vật tư vs hóa chất | PO |
| 10–40 | Trả lời V1–V5 (bảng dưới) — không code | NV KSNK + CSSD |
| 40–60 | Ranh giới MDM vs CSSD kho (draft bảng dưới) | IT + KSNK |
| 60–80 | Chốt: tab trong `/cssd-hoa-chat` vs route mới vs hoãn | PO |
| 80–90 | Gán chữ ký Exit intake; mở chat `/intake-nv` **chỉ khi** V1–V5 đủ | PO |

**Không** tạo migration trong buổi họp.

## Câu hỏi intake (workshop W-VAT)

| ID | Câu hỏi | Quyết định (điền sau họp) |
|----|---------|---------------------------|
| V1 | Vật tư phi-hóa-chất có cần **tồn theo lô / FEFO** như hóa chất? | ☐ Có ☐ Không ☐ Một phần |
| V2 | CRUD danh mục thuộc **MDM** hay **CSSD kho**? | ☐ MDM ☐ CSSD ☐ Tách loại |
| V3 | Ngưỡng cảnh báo và incident có **dùng chung** taxonomy `CHEMICAL_STOCK_OUT`? | ☐ Có ☐ Tách mã mới |
| V4 | Có liên kết **chi phí / phiếu xuất** ERP bệnh viện (ngoài pilot)? | ☐ Có ☐ Không |
| V5 | Pilot có mở rộng **trong** `/cssd-hoa-chat` (tab thứ 3) hay route riêng? | ☐ Tab ☐ Route mới ☐ Hoãn |

## Ranh giới đề xuất (draft — chưa freeze)

| Loại | SSOT danh mục | Vận hành tồn |
|------|---------------|--------------|
| Hóa chất tiệt trùng (dung dịch, bột) | `cssd_dm_hoa_chat` (MDM) | CSSD kho hiện tại |
| Vật tư tiêu hao (bao bì, indicator, nhãn) | **TBD** — có thể `mdm_*` mới hoặc mở rộng DM | **TBD** — ledger riêng vs mở rộng fact |
| Thiết bị / máy | `cssd_dm_thiet_bi` | Bảo trì (Phase 4.2) |

## Exit intake

- [ ] V1–V5 có chữ ký NV KSNK + IT
- [ ] Cập nhật [`implementation-mapping.md`](../../core/implementation-mapping.md) nếu quyết định schema
- [ ] **Không** migration mới cho đến khi intake đóng

## Tham chiếu

- [`pilot-checklist-hoa-chat-202606.md`](./pilot-checklist-hoa-chat-202606.md)
- [`../../archive/reports/domain-audit-phase3-20260610.md`](../../archive/reports/domain-audit-phase3-20260610.md) §4.3
