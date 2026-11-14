# Nhật ký vòng lặp /chay-lien-tuc

Một dòng mỗi vòng: ngày giờ · module · ID · phương án chọn (điểm) · verify · kết quả.

- 2026-11-14 · NEN · NEN-003 · không sửa được ở local (lệch version migration trên prod) · — · CHO_PO, mặc định: `migration repair` trước lô prod
- 2026-11-14 · CSSD · CSSD-004 · A: migration UPDATE theo mã, chỉ khi tên lệch (40đ) thắng B: file seed rời không nằm trong chuỗi nào (35đ); phản biện «ghi đè tên prod đã sửa tay» → chỉ 6 mã, tên đích PO đã chốt · thử trong transaction: 2 lệch → 0, rollback; local 0 lệch · 2997a33a
