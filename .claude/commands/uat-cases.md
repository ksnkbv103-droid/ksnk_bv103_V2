---
description: Checklist test tay cho PO
argument-hint: "[lát hoặc intake]"
model: haiku
---

# /uat-cases — Checklist UAT tay từ DoD/intake

**Đầu vào:** $ARGUMENTS

Readonly. **Không** sửa code. **Không** bảo Agent đọc CDC.

1. Đọc DoD / acceptance trong chat hoặc intake đã chốt
2. Sinh ≥3 case: Role → Menu → Thao tác → Mong đợi → Thực tế (trống)
3. Ghi môi trường: local / preview; cần login staff?

Output markdown cho PO điền. Fail → PO hoặc `/implement` rework.
