# Quy trình Agent & phân tách tác vụ (Cursor)

Tài liệu định hướng **cách làm việc** với AI trong Cursor — không thay thế `AGENTS.md` hay spec nghiệp vụ.

## Nguyên tắc

1. **Một luồng chốt thiết kế:** SSOT (`permission-registry`, mapping **10**, `dm_*`/registry) phải nhất quán trước khi nhân đôi PR hay agent phụ.
2. **Domain trước code:** Đọc [`READ_MINIMUM_BY_CHANGE.md`](./READ_MINIMUM_BY_CHANGE.md) và spec domain tương ứng trước khi sửa sâu.
3. **KSNK > skill ngoài:** Chi tiết kỹ thuật chung xem [`SKILLS_CATALOG.md`](./SKILLS_CATALOG.md) — không dùng skill để quyết định schema hay luồng bệnh viện.

## Khi nào tách bước / delegate

| Tình huống | Gợi ý |
| ---------- | ----- |
| Khảo sát codebase rộng, chỉ đọc | Dùng chế độ explore / đọc có chừng; tránh sửa nhầm boundary. |
| Migration + action + UI cùng lúc | Chia pha: (1) SQL + mapping + types (2) action (3) UI — mỗi pha verify. |
| Song song | Chỉ song song các **phạm vi độc lập** (ví dụ docs vs test UI); **không** hai nhánh cùng sửa một bảng mà không merge kịch bản. |

## “Subagents” trong thực tế Cursor

Tool/Task delegate trong Cursor là **phiên làm việc phụ** (explore, shell, v.v.). Quy ước:

- **Phiên phụ** mang đầu vào/đầu ra rõ: ví dụ “chỉ liệt kê call site của `saveX`”, không tự đổi schema.
- **Phiên chính** giữ **quyết định** mapping UI → Action → DB và permission.

## Sau khi rà soát module

Ghi nhận vào `PROGRESS_REPORT.md` (nếu dùng) hoặc PR: module đã đối chiếu spec nào, còn nợ gì (NFR, mobile, import).
