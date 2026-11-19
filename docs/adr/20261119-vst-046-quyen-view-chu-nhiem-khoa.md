# ADR 20261119 — VST-046: CHU_NHIEM_KHOA thiếu 7 liên kết quyền `view` trên DB dựng mới

Dòng sổ lỗi: VST-046. Migration: `supabase/migrations/20261119190000_vst_046_quyen_view_chu_nhiem_khoa.sql`. Cùng lớp lỗi với [VST-045](20261119-vst-045-quyen-view-lanh-dao-khoa.md).

## Bối cảnh

Bốn migration (`20261111150000` ar1, `20261111150100` ar5d, `20261114110000`, `20261117100000`) nối vai `CHU_NHIEM_KHOA` vào quyền `view` bằng `JOIN`/`CROSS JOIN sys_permissions`. Không migration nào chèn các hàng `view` đó: trên prod chúng có sẵn, trên DB dựng mới chúng chỉ xuất hiện khi `supabase/seeds/00-rbac.sql` chạy, sau toàn bộ migration, và seed không nối quyền cho `CHU_NHIEM_KHOA`. Kết quả: DB dựng mới (và DB local) chỉ có 6 liên kết `approve`, thiếu 7 liên kết `view` — `GIAM_SAT_VST`, `GIAM_SAT_CHUNG`, `LOAI_DC`, `BO_DC`, `DC_LE`, `HOA_CHAT`, `THIET_BI`. Hậu quả: policy đọc VST (`fn_sys_has_permission('GIAM_SAT_VST','view')`) từ chối `CHU_NHIEM_KHOA` trước nhánh vai; trang GSC và 5 danh mục CSSD không mở được. Phát hiện khi review VST-045; `db-verify` xác minh 19/11: đo trên stack `db:dung` và DB local đều 6/13 liên kết.

## Phương án

- A. Một migration mới chèn 6 hàng `view` còn thiếu (`ON CONFLICT DO NOTHING`; `GIAM_SAT_VST:view` do `20261119180000` chèn, câu lệnh vẫn liệt kê cho độc lập thứ tự) rồi nối lại 7 liên kết cho `CHU_NHIEM_KHOA`.
- B. Sửa 4 file migration cũ.
- C. Chỉ thêm liên kết vào seed.
- D. Chỉ sửa 2 cặp ghi trong sổ (`GIAM_SAT_VST`, `GIAM_SAT_CHUNG`), bỏ 5 danh mục.

## Phản biện

- B: file nằm dưới `PROD_HEAD`, bất biến (`guard-migrations.mjs --bat-bien`).
- C: seed chạy sau migration nhưng vai `CHU_NHIEM_KHOA` do migration tạo; đưa liên kết vai vào seed tách phần cấp quyền khỏi lịch sử migration và `trial:prep`/CI vẫn đỏ nếu chỉ chạy migration.
- D: để lại đúng lỗi cùng lớp ở 5 danh mục mà ar1/ar5d đã ghi ý «xem để đọc được hàng chờ duyệt»; sẽ phải mở dòng sổ thứ ba.
- A: trên prod hàng đã có nên `DO NOTHING` không đổi hàng quyền; liên kết chỉ được thêm nếu prod thiếu (đúng ý các migration gốc). Không đụng RLS, GRANT, RPC; chỉ cấp `view`.

## Chọn

Phương án A.

Rủi ro prod: chưa đo được từ repo. Nếu `CHU_NHIEM_KHOA` trên prod đang thiếu liên kết `view` nào (ví dụ ai đó gỡ tay), migration thêm lại quyền xem đó. Đối chiếu trước khi áp (kỳ vọng 13 liên kết).

Kiểm chứng: `npm run db:dung` (pgTAP `vst_rls` kiểm 13 liên kết của `CHU_NHIEM_KHOA` và hai liên kết `GIAM_SAT_VST:view`, `GIAM_SAT_CHUNG:view`), `scripts/acl-snapshot.mjs` (không đổi: chỉ dữ liệu), `so-loi.mjs check` exit 0.

Hoàn tác: xem khối Rollback cuối file migration; chỉ áp dụng DB dựng mới/local, không xóa hàng `sys_permissions`.
