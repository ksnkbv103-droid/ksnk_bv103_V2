# Đào tạo / Thi trắc nghiệm KSNK

## Schema lean (3 bảng)

| Bảng | Nội dung |
|------|----------|
| `dao_tao_cau_hoi` | Ngân hàng: `ma_cau` (khóa upsert), stem, loại, Bloom, `chu_de_ma/ten`, `phuong_an` jsonb, `dap_an_dung` |
| `dao_tao_cau_hinh` | Cấu hình: `thi_thu_muc_do` hoặc `thi_that` (+ `gan` jsonb khoa/NV) |
| `dao_tao_lan_thi` | Lần làm bài: timer, điểm, `de_snapshot` jsonb (đề + trả lời + chấm) |

Đáp án luôn gắn **id phương án** trong JSON — đảo vị trí hiển thị không làm sai câu sắp xếp thứ tự.

## Ngân hàng — Export / Import / Reimport

Chuẩn MDM (P4):

1. **Export mẫu** hoặc **Export ngân hàng** từ `/dao-tao/admin/ngan-hang`
2. Sửa Excel (giữ `ma_cau` khi cập nhật; để trống `ma_cau` khi thêm mới)
3. **Import Excel** → xem trước → chọn *An toàn* (chỉ thêm/sửa) hoặc *Đồng bộ đầy đủ* (ẩn câu thiếu trong file, cùng chủ đề)

Cột khóa: `ma_cau | chu_de_ma | chu_de_ten | stt | loai | stem | A | B | C | D | dap_an | bloom | giai_thich | is_active`  
Sheet `Huong_dan` mô tả format đáp án 4 loại.

**Import từ chối khi:** đáp án trỏ cột A–D trống; multi dưới 2 đáp án; sắp xếp thiếu đủ phương án; chùm Đúng/Sai thiếu nhãn. Dialog xem trước liệt kê dòng lỗi (tối đa 20).

Trên UI: bật/tắt từng câu (Đang dùng / Tạm ẩn) và **Sửa**.

### CLI

```bash
npx tsx scripts/dao-tao-import-mcq.ts --local --dry-run path.xlsx
npx tsx scripts/dao-tao-import-mcq.ts --local --sync-full path.xlsx
# --replace = alias của --sync-full
```

File gốc `MCQ to form_2.xlsx` (layout cũ) vẫn parse được; mã câu sinh từ STT + chủ đề.

## Chế độ thi

| | Thi thử | Thi thật |
|---|---|---|
| Ai | User có `DAO_TAO` view | User/khoa/NV trong `gan` của cấu hình `thi_that` published |
| Cấu hình | `thi_thu_muc_do`: số câu, phút (Bloom chỉ dùng khi máy rút đề — không hiện trên ngân hàng / làm bài) | `thi_that`: số câu, phút, điểm đạt, số lần, đảo câu/đáp án, chủ đề, gán khoa+NV, hạn chứng chỉ (tháng) |
| Kết quả | Ôn tập + bài của tôi | Sổ quản trị: lọc kỳ/khoa, chưa nộp, xuất Excel, cột chứng chỉ |

**Chứng chỉ (DT-LMS, lát 1):** lần thi thật **đạt** → còn hạn `han_chung_chi_thang` tháng (mặc định 12). Hub `/dao-tao` nhắc sắp hết (30 ngày) / hết hạn. **Chưa có:** lớp học, điểm danh, chứng chỉ giấy PDF.

Mở kỳ thật **bắt buộc** đã gán ít nhất một khoa hoặc NV (UI + server).

## Routes

`/dao-tao` · `/dao-tao/thi-thu` · `/dao-tao/thi-that` · `/dao-tao/lam-bai/[id]` · `/dao-tao/ket-qua/[id]` · admin/*
