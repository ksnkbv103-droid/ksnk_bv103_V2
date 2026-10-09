# BOOTSTRAP.md
# Claude Code Self-Setup — Phiên bản tối ưu credits nhất (2026)

Bạn là Claude Code. Nhiệm vụ: thiết lập môi trường làm việc tối ưu nhất cho project hiện tại theo đúng nguyên tắc chính thức Anthropic + tối ưu credits.

### Nguyên tắc bắt buộc

1. Discover trước – viết sau. Không được bịa lệnh.
2. CLAUDE.md ≤ 150 dòng (lý tưởng < 120).
3. Chỉ ghi những gì Claude không thể suy ra từ code.
4. Quy trình lặp lại → Skill (load on-demand).
5. Quy tắc theo path → `.claude/rules/`.
6. Task đọc nhiều file / research / song song → Subagent với model rẻ.
7. Không tạo skill/agent/rule nếu chưa cần.
8. Luôn Explore → Plan → Implement → Verify.
9. Không suy đoán. Thiếu thông tin thì hỏi.
10. **Chọn model đúng việc** (xem bảng dưới) để tiết kiệm credits tối đa.

---

### Bảng chọn Model (bắt buộc tuân thủ)

| Model     | Khi nào dùng                                      | Chi phí | Ví dụ sử dụng                          |
|-----------|----------------------------------------------------|---------|----------------------------------------|
| **Haiku** | Task đơn giản, nhanh, thu thập thông tin, tóm tắt, commit message, research nhỏ | Rẻ nhất | Subagent researcher, shipper, tóm tắt diff, tìm file |
| **Sonnet**| Hầu hết công việc coding hàng ngày, implement, review thông thường | Trung bình | Implementer chính, viết code + test, review thường |
| **Opus**  | Suy luận phức tạp, kiến trúc, debug khó, quyết định lớn, phân tích sâu | Đắt     | Plan lớn, architecture decision, debug phức tạp, review sâu |
| **Fable** | Chỉ khi thật sự cần frontier (hiếm)                | Rất đắt | Hầu như không dùng trong setup này     |

**Quy tắc vàng tiết kiệm credits:**
- Main session nên dùng **Sonnet** làm mặc định.
- Subagent research / thu thập thông tin / commit → **Haiku**.
- Chỉ chuyển sang **Opus** khi task thật sự khó hoặc bạn yêu cầu rõ.
- Không bao giờ dùng Opus cho việc đơn giản.

---

## BƯỚC 0: Chuẩn bị

- Xác nhận đang ở đúng thư mục project.
- Liệt kê nhanh các file quan trọng (package.json, pyproject.toml, go.mod, Makefile, README, src/, tests/…).
- Nếu project gần trống → hỏi user mục tiêu chính trước.

---

## BƯỚC 1: Phân tích sâu codebase (Explore – dùng Haiku nếu có thể)

1. Xác định stack chính (ngôn ngữ, framework, package manager, test runner, linter…).
2. Tìm **tất cả lệnh thật sự chạy được** (dev, build, test, lint, typecheck, format…).
3. Nắm cấu trúc thư mục + trách nhiệm.
4. Phát hiện convention đặc biệt.
5. Tìm gotcha / quirk môi trường.
6. Ghi chú pattern lặp lại có thể thành skill.

**Output**: Tóm tắt ngắn những phát hiện quan trọng (không viết file).

---

## BƯỚC 2: Tạo / Cập nhật CLAUDE.md

- Chưa có → chạy `/init` rồi tinh chỉnh.
- Đã có → giữ phần tốt, loại bỏ thừa.

**Cấu trúc bắt buộc** (ngắn, bullet, imperative):

```markdown
# [Tên project]

[1–2 câu: đây là gì + stack chính]

## Commands
- Install: `...`
- Dev: `...`
- Build: `...`
- Test: `...`          # ưu tiên single test nếu có
- Lint / Typecheck: `...`
- Format: `...`

## Architecture
- [Cấu trúc thư mục chính + trách nhiệm]
- [Quyết định kiến trúc quan trọng]

## Always
- Luôn chạy typecheck/lint sau khi sửa series file.
- Không commit khi test hoặc typecheck fail.
- Prefer [package manager chính xác].
- [Các quy tắc “luôn luôn” khác]

## Do Not
- Never …
- Never …

## Gotchas
- [Quirk / biến môi trường / hành vi không tự nhiên]