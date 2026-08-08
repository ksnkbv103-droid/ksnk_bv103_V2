# Chương trình thống nhất giao diện — B+4 (2026-08-03)

> Tiếp B+3 ([`ui-consistency-program-20260802.md`](./ui-consistency-program-20260802.md)).  
> Scorecard: [`../reports/ui-consistency-scorecard-20260731.md`](../reports/ui-consistency-scorecard-20260731.md) · backlog: [`open-backlog-20260731.md`](./open-backlog-20260731.md).

## Luật cứng (không invent dialect thứ 4)

Giữ nguyên B+3: `KsnkPageChrome` · `--radius-shell` · `btnPrimary`/`btnSecondary` · `KsnkContextBanner` · IN HOA chỉ nav / touch choice.

**Giữ cố ý:** CSSD/VST segment Đạt–Không (`choiceBtn` / `btnTouch`).  
**Giữ cố ý (form measure):** Đào tạo màn thi/làm bài `max-w-2xl|3xl` trong shell — hẹp để đọc đề, không phải page shell thứ 2.

## Bản đồ sóng

| Sóng | ID backlog | Phạm vi | Mục tiêu score | Trạng thái |
|------|------------|---------|----------------|------------|
| **S0** | — | Scorecard residual + backlog ID + file này | Baseline sau B+3 | **Done 2026-08-03** |
| **S1** | `UI-NKBV-01` | NKBV thin: bỏ premium poster | NKBV Ops ≥ **4.0** | **Done 2026-08-03** |
| **S2** | `UI-ADMIN-01` | Admin/MDM modal + typography + BangKiem width | Admin ≥ **3.8** | **Done 2026-08-03** |
| **S3** | `UI-POLISH-01` | Gate chrome · `text-[10px]` · notice · sync doc | Gate sạch | **Done 2026-08-03** |

**Ngoài chương trình:** nghiệp vụ, schema, Wave 4 HIS/FHIR, rewrite Quản trị, hard-block cấp phát.

## Gate

```bash
npm run layout:drift-check
npm run layout:typography-check
npm run panel:chrome-check
npm run verify:quick
```

## Liên kết

- B+3 Done: [`./ui-consistency-program-20260802.md`](./ui-consistency-program-20260802.md)  
- Visual SSOT: [`../guides/bv103-visual-language.md`](../guides/bv103-visual-language.md)  
- Dialect: [`./design-dialect-matrix-20260731.md`](./design-dialect-matrix-20260731.md)
