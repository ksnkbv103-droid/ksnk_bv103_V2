---
paths:
  - ".claude/agents/review-bv103.md"
  - ".claude/agents/security-auditor.md"
  - ".claude/commands/review.md"
  - ".github/**"
---

# Quy trình review theo tầng rủi ro

Mục tiêu: giảm thời gian người duyệt mà không tăng revert/sự cố. Ngân sách agent theo [`CLAUDE.md`](../../CLAUDE.md) vẫn là trần (một reviewer, tối đa 2 agent đọc song song, không verifier bỏ phiếu).

## Tầng rủi ro (chọn trước khi review)
| Tầng | Phạm vi | Review |
|---|---|---|
| Thấp | docs, nhãn/copy UI, test thuần | verify theo intake; không cần reviewer |
| Vừa | action thường, form, helper | verify + `review-bv103` một vòng; PO duyệt |
| Cao | RLS, migration/RPC, auth/`verifyPermission`, `.github/workflows`, mọi thứ chạm prod | verify + `review-bv103` + `security-auditor` (vùng hẹp); PO duyệt, finding Critical/High mở = No-go |

Không chắc tầng nào → lấy tầng cao hơn.

## Hội tụ
- Tối đa **3 vòng** review/fix. Hết 3 vòng còn finding mở → dừng, báo PO.
- Vòng 2+ chỉ review phần diff mới; không nêu lại finding đã xử lý; nêu lớp lỗi để sửa một lần.

## Trách nhiệm
- Phê duyệt của agent **không** thay phê duyệt của người. Tầng vừa/cao luôn cần PO.
- Có commit mới sau lần duyệt → duyệt lại (duyệt tính theo từng commit).
- Người ra lệnh cho agent chịu trách nhiệm về kết quả merge.
- PR phải ghi Risk (tầng) và How to revert (xem `.github/pull_request_template.md`).
