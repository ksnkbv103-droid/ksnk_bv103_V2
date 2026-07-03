# Pilot CSSD — Báo cáo sự cố (`/cssd-su-co`)

> **Slice A–D + bản chất nguyên nhân** · Migration `20260630100000`, `20260630120000`.

**Verify auto:**

```bash
npm run mdm:migrate:local
npm run verify:mdm:local
npm run verify:engineering
npm run verify:cssd
npx vitest run src/modules/cssd-su-co/domain/
```

| # | Kịch bản | Các bước | Pass khi |
|---|----------|----------|----------|
| S1 | Quy trình + bản chất | Nhóm **Quy trình** → chọn **Lỗi chủ quan** hoặc **Quy trình kỹ thuật** → QR + gửi | Lưu OK; biên bản in tự động; có dòng bản chất |
| S2 | Máy / HC mặc định hệ thống | Nhóm **Máy** hoặc **Hóa chất** | Mặc định **Hệ thống**; có thể đổi sang Quy trình nếu pha sai tay |
| S3 | CHEMICAL → kho | Báo HC + lô → panel kho → ghi xuất | Liên kết `su_co_id` |
| S4 | EQUIPMENT → bảo trì | Chọn thiết bị thực → mở phiếu từ sự cố | `su_co_id` trên phiếu bảo trì |
| S5 | Nhật ký | `/cssd-erp/report?tab=incident` | Cột **Bản chất** + **Tình huống** đúng |
| S6 | Accountability | Tab accountability | Chỉ lỗi **quy trình + chủ quan** (không có hệ thống) |
| S7 | In lại | Nút **In** trên nhật ký | Biên bản đủ 3 lớp phân loại |

**Pass pilot:** ≥6/7 ☐
