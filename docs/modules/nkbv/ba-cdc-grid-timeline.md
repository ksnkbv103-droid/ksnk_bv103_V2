# Bệnh án — Timeline lưới CDC (tham chiếu)

> **SSOT UI hiện hành (Wave 1 multi-timeline):** [`ba-multi-timeline-architecture.md`](ba-multi-timeline-architecture.md).  
> Tài liệu này giữ hợp đồng hàng IWP / Index−7/+14 cho bảng phân tích hội chứng kiểu Chương 2.

## 1. Multi-timeline (tóm tắt)

1. **Bảng chung:** ngày lịch · HD · XN vi sinh (+) · CĐHA · khoa — luôn hiện.
2. **Bảng phân tích** chỉ mở khi chọn bệnh phẩm tương ứng (PNEU / UTI / BSI / VAE / SSI).
3. PNEU/UTI/BSI dùng **IWP ±3**; VAE dùng Event Period; SSI dùng SP 30/90 — **không** tô IWP giả.
4. Cấy máu: vai trò kép (PNU2 / Secondary S1·S2 / Primary BSI) — xem architecture §4.

## 2. Cột ngày (bảng phân tích đã mở)

Neo **Index**: trước **7** ngày · sau **14** ngày.

## 3. Hàng bảng IWP (PNEU / UTI / Primary BSI)

| Hàng | Ghi chú |
|------|---------|
| Index / Ngày X | XN hoặc CĐHA |
| IWP | Index ±3 |
| Triệu chứng LS | Catalog theo hội chứng |
| Lab / máu (PNEU) | Máu (+) ∈ IWP có thể gắn PNU2 |
| Can thiệp | Vent / Foley / CVC |
| NSK · RIT · SBAP | DOE → RIT 14d · SBAP |
| Kết luận · In phiếu văn bản | `NkbvBaGridCasePrintView` |

## 4. Runtime

| Việc | File |
|------|------|
| Architecture | `ba-multi-timeline-architecture.md` |
| Workspace | `NkbvBaMultiTimelineWorkspace.tsx` |
| Specimen map | `nkbv-specimen-syndrome.ts` |
| Secondary BSI | `nkbv-secondary-bsi-gate.ts` |
| IWP engine (shared math) | `nkbv-ba-grid-engine.ts` |
