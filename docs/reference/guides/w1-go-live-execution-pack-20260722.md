# Gói thực thi đóng go-live W1 — 2026-07-22

> Mục tiêu: biến pilot kỹ thuật (đã PASS gate máy) thành **go-live W1 có chữ ký**.  
> Wave: MDM + GSC/VST + QLCV với `KSNK_PILOT_CORE_MODULES=1`.  
> Bảng ký tổng: [`../../core/pilot-go-live-signoff-202606.md`](../../core/pilot-go-live-signoff-202606.md).

## A. Việc IT (trước khi NV KSNK test tay)

| # | Việc | Lệnh / chỗ làm | Pass khi |
|---|------|----------------|----------|
| 1 | Cấp **Supabase Access Token** mới | Dashboard → Account → Access Tokens → dán vào `.env.local` / CI secret | `supabase projects list` không 401 |
| 2 | Link staging (nếu chưa) | `npx supabase link --project-ref <ref>` | Linked OK |
| 3 | Migrate + precheck DB | `npm run mdm:migrate` → `npm run trial:db:precheck` | Không blocker |
| 4 | Auth pilot | `npm run trial:auth:precheck` | `mdm_email_no_auth` = **0** |
| 5 | Gate máy linked (khi token OK) | `npm run pilot:go-live:gate` | Exit 0 |
| 6 | Local vẫn dùng được khi chưa có token | `npm run pilot:go-live:gate:local` | Exit 0 (đã PASS 2026-07-09) |

**Auth link SOP:** [`auth-pilot-link-sop.md`](./auth-pilot-link-sop.md) — chỉ tạo Auth theo danh sách KSNK duyệt; cấm bulk.

## B. Việc NV KSNK / PO (W1 only — ≥5/6 mỗi khối)

Thứ tự ngắn (chi tiết UI trong checklist từng module):

| Thứ tự | Khối | Checklist | Ghi vào §B |
|--------|------|-----------|------------|
| 1 | QLCV | [`../../modules/qlcv/pilot-checklist-202606.md`](../../modules/qlcv/pilot-checklist-202606.md) | Pass / Tester / Ngày |
| 2 | GSC + VST | [`../../modules/giam-sat/pilot-checklist-202606.md`](../../modules/giam-sat/pilot-checklist-202606.md) | Pass / Tester / Ngày |
| 3 | MDM / Quản trị | [`../../modules/mdm/README.md`](../../modules/mdm/README.md) § Pilot | Pass / Tester / Ngày |

Hướng dẫn PO chung: [`../../core/po-uat-signoff-202607.md`](../../core/po-uat-signoff-202607.md).

**Không** bắt buộc ký CSSD / NKBV / Dashboard để đóng **W1** — các khối đó thuộc W2/W3.

## C. Ký §E (điều kiện đóng W1)

Khi §A linked (hoặc local + staging smoke đã thỏa IT) **và** §B W1 ≥5/6:

| Vai trò | Họ tên | Ngày | Chữ ký |
|---------|--------|------|--------|
| Trưởng KSNK | | | |
| IT / triển khai | | | |
| Đại diện BV103 | | | |

Copy kết quả vào bảng §E của `pilot-go-live-signoff-202606.md`.

## D. Env production W1

```bash
KSNK_PILOT_CORE_MODULES=1
# Không bật KSNK_PILOT_FOUR_MODULES nếu cần QLCV
```

## E. Residual (không chặn chữ ký W1)

- Token staging hết hạn → chỉ chặn **precheck linked**; UAT tay trên app staging vẫn làm được nếu user Auth đã link.
- Chữ ký khoa NKBV #2–#5 → W3 ([`w3-nkbv-dashboard-enablement-20260722.md`](./w3-nkbv-dashboard-enablement-20260722.md)).
