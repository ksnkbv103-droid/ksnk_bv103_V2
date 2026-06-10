# /explain — Chỉ giải thích, không sửa code

Giải thích code, hành vi, tradeoff. **Không** dùng tool write/edit; **không** tạo diff.

## Ràng buộc

- Trích dẫn code bằng format `startLine:endLine:filepath`
- Nêu giả định nếu thiếu context; hỏi 1 câu nếu mơ hồ
- SSOT: `domain-specification.md`, `implementation-mapping.md`, migration khi hỏi DB

## Output

1. Trả lời trực tiếp câu hỏi
2. Luồng dữ liệu / quyết định thiết kế (nếu liên quan)
3. Tradeoff hoặc rủi ro (ngắn)

Dùng **Ask mode** hoặc Plan mode khi cần so sánh approach trước `/intake`.
