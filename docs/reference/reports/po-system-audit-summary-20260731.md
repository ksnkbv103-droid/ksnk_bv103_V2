# Tóm tắt PO — Đánh giá toàn hệ thống (2026-07-31)

## Kết luận một câu

Phần mềm **đúng hướng nghiệp vụ và đã qua cải tổ cửa vào**; điểm cần làm ngay là **thống nhất giao diện tối giản**, **vá lỗ hổng quyền master-CRUD**, và **khoa ký UAT** — không làm lại hệ thống.

## Điểm 8 chiều (1–5)

| Chiều | Điểm | Nhận xét ngắn |
|-------|:----:|---------------|
| 1 Nghiệp vụ / khoa học | 4 | Domain tách đúng; UAT lâm sàng chưa ký |
| 2 An toàn dữ liệu | 4 | Proxy + guest allowlist + master-CRUD harden Done |
| 3 Logic vận hành | 4 | Soft CAP_PHAT chủ đích; IA hub Done |
| 4 Cấu trúc FE | 4 | Dialect 3 vai trò; B+3 + B+4 Done |
| 5 Cấu trúc BE | 3 | Action nhiều; CSSD verify-before-admin partial |
| 6 CSDL | 3* | RPC legacy sạch; *local DB down lúc đo |
| 7 Hiệu quả vận hành | 3 | Gate sẵn; seed/parity cần re-run |
| 8 UX tối giản | 4 | B+3 + B+4 Done; còn UAT khoa / metric doc |

\*Đo lại khi Docker/Supabase local bật.

## Top việc (đã xếp Wave)

1. **Wave 1 + UI B+3:** dialect · thin CC/CSSD/QLCV/BCTH/banner/auth — **Done**.  
2. **UI B+4 (2026-08-03):** NKBV thin · Admin/MDM · polish gate — **Done** — [`ui-consistency-program-20260803.md`](../architecture/ui-consistency-program-20260803.md).  
3. **Wave 2 (UAT/ops):** guest proxy (**Done**) · ký UAT khoa · sync seed DAO_TAO khi DB local.  
4. **Wave 3:** metric-dictionary gaps (AN-GAP-01).  
5. **Wave 4:** HIS/LIS / Spaulding sâu — chỉ khi viện sẵn.

## Không làm

Gộp bảng · hard-block cấp phát · đổi Auth · rewrite Quản trị.

Chi tiết: [`open-backlog-20260731.md`](../architecture/open-backlog-20260731.md) · [`ui-consistency-scorecard-20260731.md`](./ui-consistency-scorecard-20260731.md) · [`system-audit-a1-a5-20260731.md`](./system-audit-a1-a5-20260731.md) · UI B+4: [`../architecture/ui-consistency-program-20260803.md`](../architecture/ui-consistency-program-20260803.md).
