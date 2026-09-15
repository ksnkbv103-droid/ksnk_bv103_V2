## Grok Lead ↔ Cursor (RACI go-live)

**Mục tiêu:** hoàn thiện từng lát tới vận hành — **ít token Cursor**, đúng nghiệp vụ.

| Ai | Việc |
|----|------|
| **Grok Bot** | Đọc CDC/WHO/BYT/QT BV103 + SSOT; chắt DoD; sửa local mặc định (≤~5 file); review `git diff`; báo cáo |
| **Cursor IDE** | Chỉ khi PO nói «dùng Cursor» hoặc lát lớn — `/grok-handoff`; **cấm** đọc CDC/NHSN thô |
| **PO (Nghĩa)** | Chốt lát; UAT localhost; `commit` / `deploy Vercel` chỉ khi ra lệnh rõ |

| Bước | Ai | Lệnh / việc |
|------|----|-------------|
| Chốt hướng | Grok + PO | A/B/hoãn |
| Sửa mỏng | Grok | Local Mac |
| Giao IDE | Grok → PO | Khối DoD + whitelist |
| Code IDE | Cursor | `/grok-handoff` |
| Giám sát | Grok (+ `@slice-supervise`) | Diff + verify |
| UAT | PO | Localhost; `/uat-cases` |
| Ship | PO lệnh | `/ship-slice`; commit/Vercel khi bảo |

Domain phần mềm: **CDC → WHO → BYT/Cục Quân y → QT/QĐ chính thức BV103 → SSOT repo** (Grok đọc; Cursor chỉ neo đã chắt). Không soạn Word QĐ/QT trong chat phần mềm.
