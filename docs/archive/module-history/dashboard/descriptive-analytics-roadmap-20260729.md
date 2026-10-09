# Roadmap thống kê mô tả (2026-07-29)

> Chương trình nâng «thống kê mô tả» theo góc nhìn Chủ nhiệm khoa KSNK + Quản trị viên.  
> **Không đổi** công thức CCS. SSOT KPI: [`metric-dictionary.md`](metric-dictionary.md) · Skill `@dashboard-pilot`.

## Persona

| Persona | Mục tiêu |
|---------|----------|
| Chủ nhiệm khoa KSNK / ADMIN điều hành | Glance 4 trụ → drill → báo cáo ký có draft nhận xét |
| Quản trị hệ thống | Panel sức khỏe master/RBAC tại `/quan-tri-he-thong` — **không** trộn CCS |

## Nguyên tắc mô tả

Mỗi tín hiệu điều hành: **Số → Câu 1 dòng → Vì sao (≤3) → Việc nên làm (deep-link / tạo việc)**.

## Pha

| Pha | Nội dung | Trạng thái |
|-----|----------|------------|
| 0 | Khóa doc + UAT baseline BI | Done |
| 1 | Câu chuyện 4 trụ trên `/` | Done |
| 2 | Draft Phần III BCTH | Done |
| 3 | Cầu QLCV từ Thiếu TGS + CTA chuẩn (`create=1` + prefill) | Done |
| 4 | So kỳ lãnh đạo (cùng độ dài kỳ) tách delta 2 tuần ISO | Done |
| 5 | Panel sức khỏe hệ thống (Quản trị `?tab=suc_khoe`) | Done |
| 6 | CSSD proxy sở hữu danh mục + disclaimer (SSOT destination vẫn gated) | Done (proxy) |

## Không làm

- Đổi CCS / gộp NKBV vào CCS  
- Rewrite Quản trị (F-04) · HIS/LIS (D-20)  
- Sidebar liệt kê hết `/thong-ke/*`

## Verify mỗi pha

`npm run verify:engineering` (+ spec compose khi đụng `bao-cao-tong-hop-core`).
