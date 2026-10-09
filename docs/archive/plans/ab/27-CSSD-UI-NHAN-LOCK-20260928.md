# 27 — CSSD UI · NHÃN LOCK · 2026-09-28

| Trường | Giá trị |
|---|---|
| Lane | **Domain** · naming lock · **không code** |
| Thời điểm | Nghĩa 09:30 (Asia/Saigon): «giải quyết cái tên này đi» |
| Cách làm | Tự phản biện A/B/C, tự chốt; chỉ báo tổng kết |
| Phạm vi | UI labels đã nêu; **không đổi IA**, không mở cửa ghi mới |

## Neo và phạm vi quyết định

- **Lead plan A — P1-3**: nhãn admin «Sổ rà soát» đối lập «Lịch sử kho»; giữ ít click, không nhập nhầm ngữ cảnh kho.
- **Lead plan A — §6**: cố ý giữ hai lớp **Kiểm bộ** (trạm) và **QC** (mẻ); trạm ≠ QC load.
- **P0-5 / file 26**: «cửa Chuyển» đã chết tên; cửa ghi đúng là tab **Luân chuyển** tại Dụng cụ. File neo: `26-CSSD-GOLIVE-A-P0-DOORS-AB-20260928.md`.
- Bot/internal chỉ dùng **Soft-ready** một lần; không đưa «Soft Soft Soft» lên UI.

## Anti-bias ngắn → CHỐT

| # | Câu hỏi | A/B/C đã cân | **CHỐT** | Điểm khóa |
|---:|---|---|---|---|
| 1 | Trạm QC vs QC mẻ | A: trạm **Kiểm bộ**, mẻ **QC**; B: gom Kiểm bộ; C: gom QC | **A** | Trạm = «Kiểm bộ»; mẻ giữ «Chờ QC / Đạt QC / Nhập QC». Khớp plan §6; không đổi QC mẻ → Kiểm bộ. |
| 2 | Tab admin «Lịch sử» vs Lịch sử kho (P1-3) | A: admin **Sổ rà soát**, Dụng cụ **Lịch sử kho**; B: Nhật ký danh mục; C: Lịch sử + tooltip | **A** | Khớp plan «sổ rà soát»; ít click, không nhầm lịch sử kho. |
| 3 | «cửa Chuyển» (P0-5) | A: bỏ tên chết; B/C: mở lại hoặc giữ tên cũ | **A** | UI dùng **Luân chuyển**. Không mở lại «cửa Chuyển» trên Sự cố; nhắc lại file 26. |
| 4 | Link report trên shell Quy trình (menu B) | A: **Báo cáo CSSD**; B: Thống kê; C: Sản lượng | **A** | Một cửa đọc; không lẫn `/thong-ke` giám sát. |
| 5 | Jargon bot «Soft Soft Soft» | A: không lên UI, nội bộ bot dùng **Soft-ready** một lần; B/C: đưa jargon lên UI | **A** | Người dùng chỉ thấy nhãn nghiệp vụ; Soft-ready là trạng thái nội bộ. |
| 6 | Sidebar «Tra cứu» chứa tab ghi (P1-2) | A: giữ nhóm **CSSD · Tra cứu**; trong Dụng cụ tách **Việc** (Đề nghị, Luân chuyển) / **Tra cứu** (Bộ, Loại, Lịch sử kho); B: đổi nhóm sidebar thành Dụng cụ | **A** | Nhãn-only, không đổi IA; khớp P1-2 plan D, ít đụng nav. |

## Bảng nhãn sau khi khóa

| Vị trí | Nhãn khóa |
|---|---|
| Trạm kiểm | **Kiểm bộ** |
| Mẻ tiệt khuẩn | **QC** · Chờ QC / Đạt QC / Nhập QC |
| Tab admin | **Sổ rà soát** |
| Dụng cụ | **Lịch sử kho** |
| Cửa ghi P0-5 | **Luân chuyển** |
| Link report trên shell Quy trình | **Báo cáo CSSD** |
| Sidebar | **CSSD · Tra cứu** |
| Cụm tab trong Dụng cụ | **Việc** / **Tra cứu** |
| Nội bộ bot | **Soft-ready** (một lần; không lên UI) |

## DoD Soft-ready

- P0-5 banner + link **Báo cáo CSSD** trên shell Quy trình: lát B hoặc F; đã Soft-ready theo file 26.
- Nhãn **Sổ rà soát**: lát D (P1-3); **Soft-ready — Domain unlock now** theo autonomy của Nghĩa.
- Không đổi **QC mẻ → Kiểm bộ**.
- Không code, không đổi IA, không mở lại «cửa Chuyển», không thêm cửa report thứ hai.

## Report paths

| Bản | Path |
|---|---|
| Domain SSOT (box) | `/workspace/ksnk-domain/27-CSSD-UI-NHAN-LOCK-20260928.md` |
| Macwork mirror (box) | `/workspace/ksnk_bv103_macwork/docs/modules/cssd/27-CSSD-UI-NHAN-LOCK-20260928.md` |
| Mac repo mirror | `/Users/drnghia/Desktop/ksnk_bv103/docs/modules/cssd/27-CSSD-UI-NHAN-LOCK-20260928.md` |
| Previous lock | `26-CSSD-GOLIVE-A-P0-DOORS-AB-20260928.md` |
| Lead plan A | `docs/modules/_audit/_plan-golive-A-ia-doors-2026-09-28.md` |

**CHỐT cuối:** A cho cả sáu điểm. Nhãn đã khóa; Domain unlock P1-3 «Sổ rà soát» theo autonomy. Không code.
