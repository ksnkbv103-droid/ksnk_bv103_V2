# PO — Dùng Cursor khi không rành code

> Cheat sheet 1 trang. Chi tiết: [`cursor-operating-playbook.md`](cursor-operating-playbook.md).

## Mỗi việc mới

```
Chat MỚI → /intake-nv → duyệt 「OK triển khai」→ /implement → acceptance-ui → test tay → /ship-slice
```

## Bạn chỉ cần nói

- Module / màn hình
- Muốn gì (hiện tại → mong muốn)
- Ai dùng
- 3 cách kiểm trên màn hình (hoặc để AI đề xuất)

## Bạn duyệt

- Kế hoạch intake — Go / sửa / Spec change
- 3 case test tay — pass / fail cụ thể

## AI tự lo

- File code, migration, verify, review kỹ thuật

## Lệnh hay dùng

| Lệnh | Khi |
|------|-----|
| `/intake-nv` | Mọi tính năng / bug không trivial |
| `/explain` | Chỉ hỏi, chưa sửa |
| `/implement` | Sau OK triển khai |
| `/ship-slice` | Sau test tay pass |
| `/commit`, `/pr-create` | Khi muốn đẩy git |

## Agent / skill (tùy chọn)

| Gọi | Khi |
|-----|-----|
| `intake-coach` | Chưa rõ thuộc module nào |
| `acceptance-ui` | Cần checklist click từng bước |
| `@po-intake` | Cùng vai trò intake-nv |
| `@qlcv-pilot` / `@giam-sat-pilot` / `@dashboard-pilot` | Sửa module pilot tương ứng |

## User Rule gợi ý (toàn Cursor — tùy chọn)

Nếu làm việc **ngoài** repo BV103, dán vào Cursor Settings → Rules → User Rules:

```
Tôi là PO không rành code. Luôn /intake-nv trước khi sửa. Giải thích bằng tiếng Việt nghiệp vụ.
Tự chạy verify và báo kết quả. 1 chat = 1 tính năng. Không mở rộng scope không hỏi.
```

**Trong repo BV103:** rule `04-po-workflow.mdc` (`alwaysApply: true`) đã bật sẵn — không cần dán User Rule riêng khi chat trong project này.

## Tránh

- 1 chat nhiều module
- 「Implement ngay」không mô tả
- 「Vẫn lỗi」không nêu bước tay
