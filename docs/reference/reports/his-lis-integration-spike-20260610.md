# HIS/LIS integration spike (Phase 6.5 — research)

> **Out of pilot scope.** Không implement trong W1–W3.

## Bối cảnh NKBV

Luồng hiện tại ([`clinical-forms.md`](../../modules/nkbv/clinical-forms.md)):

1. LIS → cấy dương tính (manual import / portal `NkbvViSinhImportPortal`).
2. **Phán quyết mẫu cấy** — lâm sàng/KSNK chọn UTI / BSI / VAE / SSI / Loại trừ.
3. Form lâm sàng + rules engine → `CHO_DUYET` / adjudication.

Gap N-G3: **không** auto-map loại NKBV từ tên mẫu LIS.

## Phương án tích hợp (khi BV sẵn sàng)

| # | Phương án | Effort | Ghi chú |
|---|-----------|--------|---------|
| H1 | **File drop / SFTP** CSV vi sinh | M | Mở rộng import portal; MD5 dedupe đã có |
| H2 | **HL7 ORU^R01** listener (Edge Function) | L | Cần VPN + mapping mã xét nghiệm BV |
| H3 | **API REST** LIS vendor | L | Contract từng BV |
| H4 | **Manual only** (pilot) | — | **Hiện tại** |

## Ranh giới dữ liệu

| Hệ | SSOT app | Không làm |
|----|----------|-----------|
| LIS | Import → `nkbv_fact_*` draft | Không ghi đè adjudication đã duyệt |
| HIS | (future) BN, ngày vào viện, chuyển khoa | Không thay MDM khoa/phòng pilot |

## Tiền đề trước code H2/H3

- [ ] Danh mục mã xét nghiệm ↔ loại mẫu (UTI/BSI/…) do KSNK duyệt
- [ ] SLA latency + retry + audit log
- [ ] UAT sandbox LIS tách staging

## Exit spike

Workshop với IT BV + vendor LIS → chọn H1–H4 → intake riêng (không gộp pilot go-live).
