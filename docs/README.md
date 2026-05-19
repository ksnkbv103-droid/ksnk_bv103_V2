# Documentation Index - KSNK BV103

> **Mục tiêu**: Cung cấp cấu trúc tài liệu rõ ràng, dễ tìm, dễ bảo trì cho Hệ thống Kiểm soát Nhiễm khuẩn Bệnh viện 103.

## Cấu trúc Tài liệu

```
docs/
├── README.md                 # Index này (bạn đang đọc)
├── architecture/             # Kiến trúc hệ thống, diagram, quyết định công nghệ
├── guides/                   # Hướng dẫn phát triển, deploy, vận hành
├── specs/                    # Đặc tả kỹ thuật chi tiết
├── adr/                      # Architecture Decision Records
├── decisions/                # Các quyết định quan trọng khác
├── reviews/                  # Báo cáo review, đánh giá
├── handover/                 # Tài liệu bàn giao, completion report
├── operations/               # Runbook, SOP, migration guides
└── internal/                 # Tài liệu nội bộ (AGENTS.md, quy tắc làm việc)
```

## Quick Navigation

| Loại tài liệu              | Mô tả                                      | Link |
|---------------------------|--------------------------------------------|------|
| **Tổng quan dự án**       | Giới thiệu, quick start, công nghệ         | [README.md](../README.md) |
| **Lịch sử thay đổi**      | Thay đổi theo phiên bản                    | [CHANGELOG.md](../CHANGELOG.md) |
| **Quy tắc làm việc**      | Rule cho dev & AI                          | [AGENTS.md](../AGENTS.md) |
| **Kiến trúc**             | Architecture, diagrams                     | [architecture/](./architecture/) |
| **Hướng dẫn**             | Development, Deployment, Vercel, Supabase  | [guides/](./guides/) |
| **Đặc tả kỹ thuật**       | Specs, implementation mapping              | [specs/](./specs/) |
| **Quyết định kiến trúc**  | ADR (Architecture Decision Records)        | [adr/](./adr/) |
| **Review & Đánh giá**     | External review, internal review           | [reviews/](./reviews/) |
| **Bàn giao**              | Handover documents, completion reports     | [handover/](./handover/) |
| **Vận hành**              | Runbooks, SOP, Migration, Troubleshooting  | [operations/](./operations/) |

## Nguyên tắc Documentation

- **Single Source of Truth**: Mỗi thông tin chỉ nằm ở một nơi.
- **Tối giản root**: Root chỉ chứa README, CHANGELOG, AGENTS.md.
- **Dễ bảo trì**: Cấu trúc phân cấp rõ ràng theo mục đích sử dụng.
- **Boy Scout Rule**: Khi cập nhật docs, hãy để lại sạch sẽ và cập nhật index này.

## Trạng thái hiện tại (19/05/2026)

Đang trong quá trình dọn dẹp và chuẩn hóa cấu trúc tài liệu.

---

**Last updated**: 19/05/2026
