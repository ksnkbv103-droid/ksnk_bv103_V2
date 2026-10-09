---
description: PO mô tả nghiệp vụ — dịch thành intake, chưa code
argument-hint: "[mô tả nghiệp vụ]"
---

# /intake-nv — Khóa phạm vi theo ngôn ngữ nghiệp vụ (PO)

**Đầu vào:** $ARGUMENTS

Dành cho **người không rành code**. **Không sửa code** — chỉ lập kế hoạch để user duyệt.

Agent gợi ý: `intake-coach` khi chưa rõ module. Luôn đọc `read-minimum.md` dòng module; rule `.claude/rules/*` tự nạp khi chạm file.

## User điền (tiếng Việt nghiệp vụ)

1. **Module / màn hình** — QLCV, CSSD, Giám sát VST/GSC, Dashboard, Danh mục, NKBV, …
2. **Tính năng hoặc lỗi** — hiện tại thế nào, muốn thế nào (2–5 câu)
3. **Ai dùng** — role, khoa, quyền
4. **Luồng mong muốn** — bước 1 → 2 → kết quả
5. **Không được đụng** — module khác, dữ liệu cũ, công thức KPI đã chốt, …
6. **Kiểm tra tay** — ít nhất 3 tình huống: làm gì → thấy gì (user có thể để trống; AI đề xuất thêm)

## AI tự điền (phần kỹ thuật — user không cần viết)

Sau khi nhận mô tả nghiệp vụ, bổ sung:

| Mục | Nội dung |
|-----|----------|
| Goal | Một câu kết quả |
| In scope | File/module path (từ mapping + read-minimum) |
| Out of scope | Cấm đụng (kỹ thuật + nghiệp vụ) |
| Acceptance criteria | 3 case kiểm UI/RPC (song ngữ: nghiệp vụ + kỹ thuật ngắn) |
| Verify plan | Lệnh BV103 phù hợp (bảng dưới) |
| Risk | Tối đa 3 regression |
| Module map | CSSD vs MDM vs Giám sát — hỏi user nếu mơ hồ |

## Map từ khóa → module (gợi ý)

| User nói | Module |
|----------|--------|
| công việc, kanban, checklist, nghiệm thu, định kỳ | QLCV |
| mẻ tiệt khuẩn, QR, cấp phát, dụng cụ | CSSD |
| vệ sinh tay, WHO, VST | Giám sát VST |
| giám sát chung, phiên GSC | Giám sát GSC |
| bảng kiểm template | Bang kiem / MDM |
| báo cáo, dashboard, thống kê, KPI, CCS | Dashboard |
| danh mục, khoa, nhân viên, MDM | Danh mục |
| nhiễm khuẩn, NKBV | NKBV |

## Verify BV103 (AI chọn — user chỉ duyệt)

| Loại thay đổi | Lệnh tối thiểu |
|---------------|----------------|
| UI nhỏ, không action | `npm run verify:quick` |
| Server Action / `fact_*` | `npm run verify:engineering` |
| CSSD | + `npm run verify:cssd` |
| Dashboard / analytics RPC | `verify:engineering` + spec liên quan |
| Migration / schema | `mdm:migrate:local` → `verify:mdm` → `verify:engineering` |
| PR / ship | `npm run verify` |

## Output bắt buộc

1. **Tóm tắt nghiệp vụ** (3–5 câu, không jargon)
2. **Kế hoạch 3–5 bước** — mỗi bước kèm `verify: …`
3. **Top 3 rủi ro**
4. **Giả định** cần user xác nhận (nếu có)
5. **Câu hỏi** — tối đa 2, chỉ khi thiếu thông tin chặn triển khai

Chờ user trả lời **「OK triển khai」** hoặc chỉnh sửa trước `/implement`.


# PO workflow (BV103)

User là **Product Owner, không rành code**. Áp dụng mọi chat trong repo này:

## Bắt buộc

1. **Luôn `/intake-nv` trước khi sửa code** — trừ typo/1 dòng user nói rõ "sửa nhanh không intake".
2. **Giải thích bằng tiếng Việt nghiệp vụ** — tránh jargon; thuật ngữ kỹ thuật chỉ khi cần, kèm dịch ngắn.
3. **Tự chạy verify** theo intake và **báo kết quả** pass/fail — user không cần chạy terminal.
4. **1 chat = 1 tính năng** — đổi việc → nhắc mở chat mới.
5. **Không mở rộng scope** (file/module khác) **không hỏi user**.

## Intake & implement

- Chưa duyệt intake → không `/implement`.
- Output intake: tóm tắt nghiệp vụ + kế hoạch 3–5 bước + 3 case kiểm tay.
- Sau implement: files changed, verify, residual risk — ngắn gọn.

## Tham chiếu

- Command: `/intake-nv`
- Agents: `intake-coach`, `acceptance-ui`
