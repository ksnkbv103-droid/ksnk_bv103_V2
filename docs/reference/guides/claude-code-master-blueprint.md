# CẨM NANG TOÀN DIỆN: THIẾT LẬP AGENT, RULES, SKILLS, MCP VÀ TỐI ƯU HÓA CLAUDE CODE & CLAUDE PRO
## (Chuẩn mực Khoa học — Thông minh nhất — Tiết kiệm Credits & Tokens tối đa — Độ chính xác tuyệt đối)

> **Mục đích tài liệu:** Tài liệu này tổng hợp toàn bộ tri thức kỹ thuật từ tài liệu chính thức của Anthropic, các diễn đàn chuyên sâu (Reddit r/ClaudeAI, Anthropic Discord, X/Twitter), các kênh YouTube kỹ thuật hàng đầu (IndyDevDan, Matthew Berman, Claude Code Camp), và kinh nghiệm thực chiến từ các dự án phức tạp.
> 
> Bạn có thể copy toàn bộ tài liệu này hoặc Phần 1 giao cho **Claude Pro / Claude Chat / Claude Code** để tự động phân tích và cài đặt toàn bộ hệ thống cho bất kỳ dự án nào.

---

## PHẦN 1: META-PROMPT GIAO CHO CLAUDE PRO TỰ ĐỘNG THIẾT LẬP DỰ ÁN

*Hướng dẫn: Copy toàn bộ khối lệnh bên dưới gửi cho Claude Pro (trong Claude Chat hoặc Claude Code).*

```markdown
Bạn là một Chuyên gia Cao cấp về AI Agentic Systems và Kỹ sư Trưởng chuyên về Claude Code của Anthropic. 
Nhiệm vụ của bạn là rà soát toàn bộ repository này và tự động thiết lập/chuẩn hóa hệ sinh thái Claude Code (.claude/ và CLAUDE.md) đạt chuẩn mực cao nhất:
1. Thông minh nhất & làm việc tự chủ, khôn ngoan nhất.
2. Tiết kiệm tokens, credits và API quotas tối đa (tận dụng tối đa Anthropic Prompt Caching).
3. Đạt độ chính xác kỹ thuật tuyệt đối, loại bỏ hoàn toàn hallucination (bịa đặt) và code drift.
4. Tách biệt rõ ràng các tầng: Rules theo paths, Slash Commands theo quy trình, Subagents cô lập context, và Settings phân quyền.

Hãy thực hiện tuần tự theo quy trình khoa học sau:

### BƯỚC 1: KHẢO SÁT & ĐO ĐẠC HỆ THỐNG
- Đọc package.json, configs, cấu trúc thư mục, kiến trúc dự án (framework, DB, state, testing).
- Xác định các vùng code nhạy cảm, các file sinh tự động, thư mục nặng (node_modules, build, logs, assets, docs thô) để đưa vào danh sách chặn đọc.

### BƯỚC 2: XÂY DỰNG FILE HIẾN PHÁP `CLAUDE.md` (Tối ưu Prompt Cache)
- Giữ độ dài gọn gàng (< 100 - 150 dòng, ~5KB).
- Chỉ chứa: Lệnh build/test/lint ngắn gọn; 3-5 nguyên tắc kiến trúc cốt lõi; Kỷ luật bất di bất dịch (Do & Do Not); Bảng lệnh verify bắt buộc.
- Cấu trúc tĩnh và đặt ở root để tận dụng Prefix Matching của Anthropic Prompt Caching (giảm 90% chi phí đọc lại).

### BƯỚC 3: CẤU HÌNH BẢO VỆ & TIẾT KIỆM TẠI `.claude/settings.json`
- permissions.allow: Cho phép tự động chạy các lệnh test, lint, verify, git diff/status an toàn (không hỏi popup gây gián đoạn).
- permissions.ask: Yêu cầu xác nhận với git commit, push, deploy, DB migration.
- permissions.deny: Chặn cứng lệnh nguy hiểm (`rm -rf`, `git push --force`, `reset --hard`) VÀ chặn quyền Read(...) vào các thư mục nặng (assets, generated code, locks, data dumps) để tránh Claude tự ý nuốt hàng triệu token.
- Chỉ định model mặc định (ưu tiên Sonnet cho coding, ghim Haiku cho subagents).

### BƯỚC 4: THIẾT LẬP CONDITIONAL PATH-SCOPED RULES (`.claude/rules/*.md`)
- Tuyệt đối không nhồi nhét quy tắc domain vào CLAUDE.md.
- Tách thành các file rule riêng biệt trong `.claude/rules/` có YAML frontmatter `paths: [...]`.
- Chỉ khi Claude đọc/sửa file khớp đường dẫn thì rule tương ứng mới được nạp vào context window.

### BƯỚC 5: THIẾT LẬP SUBAGENTS CÔ LẬP CONTEXT (`.claude/agents/*.md`)
- Tạo các subagent chuyên trách: khảo sát (explore), đối chiếu DB (db-verify), review độc lập (review-diff), kiểm thử (qa-runner).
- Ghim model rẻ (Haiku 3.5) cho subagent đọc nhiều file; ghim Sonnet cho subagent phân tích chất lượng cao.
- Toàn bộ quá trình quét hàng chục file diễn ra trong context riêng của subagent; phiên chính chỉ nhận kết quả tóm tắt delta (tiết kiệm 80% context main).

### BƯỚC 6: THIẾT LẬP LỆNH GÕ TẮT QUY TRÌNH (`.claude/commands/*.md`)
- Tạo bộ lệnh chuẩn: `/intake` (khóa scope trước khi code), `/implement` (code lát tối thiểu), `/review` (chạy review độc lập), `/ship-slice` (chạy verify & nghiệm thu).
- Có `argument-hint` và nhận `$ARGUMENTS`.

### BƯỚC 7: KIỂM ĐỊNH TỰ ĐỘNG
- Kiểm tra tính hợp lệ của toàn bộ file markdown, JSON, liên kết file.
- Chạy thử các lệnh verify của dự án đảm bảo trạng thái pass 100%.
- Báo cáo rõ cấu trúc đã tạo và hướng dẫn cách vận hành chi tiết.
```

---

## PHẦN 2: BẢN ĐỒ KIẾN TRÚC 5 TẦNG CỦA CLAUDE CODE (5-TIER GOLDEN ARCHITECTURE)

Các chuyên gia hàng đầu từ Anthropic và cộng đồng mã nguồn mở đã chứng minh: **Nhồi nhét mọi thứ vào một file `CLAUDE.md` duy nhất là sai lầm lớn nhất gây cạn kiệt credits và làm AI bị "ngợp" (instruction fatigue).**

Kiến trúc chuẩn mực bắt buộc phải phân tách thành 5 tầng độc lập:

```
[Repository Root]
├── CLAUDE.md                       <-- TẦNG 0: Hiến pháp cốt lõi (<120 dòng, Hot Cache)
├── .mcp.json                       <-- TẦNG 0: Cấu hình MCP Server (Supabase, GitHub, Vercel)
└── .claude/
    ├── settings.json               <-- TẦNG 4: Deterministic Guardrails & Token Blocker
    ├── rules/                      <-- TẦNG 1: Path-Scoped Rules (Nạp động theo paths)
    │   ├── src.md                  (paths: "src/**")
    │   ├── data-access.md          (paths: "**/actions/**", "**/hooks/**")
    │   ├── migrations.md           (paths: "supabase/migrations/**")
    │   └── [domain-specific].md    (paths: "src/modules/[module]/**")
    ├── commands/                   <-- TẦNG 2: Workflow Slash Commands (/intake, /implement, /review)
    │   ├── intake.md
    │   ├── implement.md
    │   ├── review.md
    │   └── ship-slice.md
    ├── agents/                     <-- TẦNG 3: Context-Isolated Subagents (Haiku/Sonnet)
    │   ├── explore-module.md       (model: haiku, Read-only)
    │   ├── db-verify.md            (model: haiku, Read-only)
    │   └── review-code.md          (model: sonnet, Read-only)
    ├── skills/                     <-- TẦNG 2: Thư viện quy trình kỹ thuật dài (nạp on-demand)
    │   ├── smart-db/
    │   └── react-best-practices/
    └── hooks/                      <-- TẦNG 4: Lifecycle Automation (PreToolUse, PostToolUse)
```

---

## PHẦN 3: CHIẾN LƯỢC TIẾT KIỆM TOKENS & CREDITS TRIỆT ĐỂ (TOKEN ECONOMICS)

### 1. Cơ chế Anthropic Prompt Caching (Bí quyết tiết kiệm 90% chi phí)
- **Cách thức hoạt động:** Anthropic tính phí đọc lại context đã cache rẻ hơn **90%** (0.30$/M tokens thay vì 3.00$/M với Sonnet). Prompt caching hoạt động theo nguyên tắc **Prefix Matching** (so khớp tiền tố từ trên xuống dưới).
- **Quy tắc vàng giữ Cache luôn "HOT":**
  1. `CLAUDE.md` và `.mcp.json` phải tuyệt đối ổn định, không thay đổi nội dung liên tục giữa các câu chat.
  2. **Không đổi model giữa chừng trong cùng một phiên:** Nếu đang dùng Sonnet mà gõ `/model opus`, toàn bộ cache bị hủy và tính tiền lại từ đầu 100%. Muốn đổi model, hãy gõ `/clear` trước!
  3. Không chèn các biến thời gian thực, timestamp hay thông tin biến động vào đầu context.

### 2. Kỹ thuật "Caveman Prompting" & "Delta-Only Output"
- **Vấn đề:** Các LLM thông thường tốn 400 - 800 tokens đầu ra (output tokens đắt gấp 5 lần input tokens!) cho những câu chào hỏi lịch sự vô nghĩa: *"Tôi hiểu rồi, tôi sẽ phân tích file X và sửa đổi hàm Y cho bạn..."*.
- **Giải pháp:** Cài đặt chỉ thị trong `CLAUDE.md` hoặc rule:
  ```markdown
  - Phong cách: Trả lời cực kỳ ngắn gọn, trực diện, không chào hỏi, không lặp lại yêu cầu của user.
  - Output: Chỉ báo Delta (những gì đã sửa, kết quả test, bước tiếp theo).
  ```
- **Kết quả:** Tiết kiệm 40–50% lượng token sinh ra, tăng tốc độ phản hồi lên gấp 2 lần.

### 3. Kỹ thuật "Terminal Pipe Hygiene" (Chống tràn Context từ Terminal)
- **Vấn đề lớn:** Một lệnh `npm test` hoặc `git log` in ra 2.000 dòng log sẽ ngay lập tức "bơm" 50.000 tokens rác vào context window của Claude Code. Từ lượt chat tiếp theo, mỗi câu nói của bạn đều phải trả tiền để đọc lại 50.000 tokens này!
- **Giải pháp:** Thiết lập trong hướng dẫn hoặc script wrapper:
  - Lọc test: `npm test 2>&1 | tail -30` hoặc `npm test 2>&1 | grep -E "FAIL|ERROR"`
  - Lọc git: `git log -n 5 --oneline`
  - Đọc file: Dùng `grep -n` tìm đúng dòng trước khi đọc, không bao giờ dùng `cat` cả file > 500 dòng.

### 4. Ma Trận Lựa Chọn Model (The 80/20 Rule)

| Model | Chi phí (Input/Output) | Khi nào dùng trong Claude Code? | Vai trò |
| :--- | :--- | :--- | :--- |
| **Claude 3.5 Haiku** | **$0.80 / $4.00** mỗi triệu token | - Subagents khảo sát đọc nhiều file (`explore-module`, `db-verify`)<br>- Viết commit message (`/commit`), kịch bản test (`/uat-cases`)<br>- Tóm tắt diff nhỏ | **Trinh sát & Thư ký** (Cực rẻ, cực nhanh) |
| **Claude 3.5 / 3.7 Sonnet** | **$3.00 / $15.00** mỗi triệu token | - 90% công việc lập trình chính thức: code feature, refactor, viết test, server action, migration, bug fix. | **Kỹ sư Trưởng thực thi** (Cân bằng hoàn hảo giữa trí tuệ và chi phí) |
| **Claude 3.5 / 3.7 Opus (hoặc OpusPlan)** | **$15.00 / $75.00** mỗi triệu token | - **Chỉ dùng khi:** Thiết kế kiến trúc đa phân hệ phức tạp, giải quyết mâu thuẫn domain khó, debug các bug logic ngầm mà Sonnet thất bại sau 2 lần.<br>- **Cách dùng:** Bấm `Shift+Tab` vào **Plan Mode**, hoặc gõ `/model opusplan` (Opus lập kế hoạch, Sonnet thực thi). **Cấm dùng Opus để gõ lệnh bash hay sửa CSS/nhãn!** | **Kiến trúc sư Chiến lược** (Trí tuệ tối đa) |

### 5. Kỷ Luật Vòng Đời Phiên Chat (Session Lifecycle)
- **1 Nhiệm vụ (Slice) = 1 Phiên Chat:** Đạt được mục tiêu là gõ `/clear` ngay. Không bao giờ tích tụ 3-4 tính năng khác nhau trong một phiên kéo dài 30-40 lượt hỏi đáp.
- **Sử dụng `/compact`:** Khi phiên làm việc về một tính năng bắt đầu dài và context chạm ngưỡng 40-50%, gõ `/compact` để cô đọng lịch sử, giải phóng bộ nhớ.

---

## PHẦN 4: NGUYÊN TẮC "CHÍNH XÁC TUYỆT ĐỐI" (ZERO HALLUCINATION & ZERO DRIFT)

Để Claude Code không bao giờ "đoán mò" và phá vỡ kiến trúc dự án:

1. **Contract-First & DB-First (Không bao giờ đoán schema):**
   - Trước khi sửa code có liên quan đến cơ sở dữ liệu: Bắt buộc đọc file migration hoặc chạy lệnh introspect schema. Tuyệt đối cấm suy diễn tên cột, tên bảng.
2. **Kỷ luật "Grep trước khi Read" & Giới hạn 8 files:**
   - Với file > 500 dòng: Phải dùng `grep` tìm số dòng cụ thể rồi mới đọc đoạn liên quan.
   - Mỗi task chỉ đọc tối đa ≤ 8 files. Nếu cần đọc nhiều hơn, phải chuyển việc đó cho subagent độc lập.
3. **Spec Freeze (Đóng băng yêu cầu):**
   - Trước khi gõ code, chạy quy trình `/intake` để khóa cứng: *Goal, In-scope files, Out-of-scope files, Acceptance Criteria, Verify Plan*.
   - Sau khi duyệt intake, yêu cầu được đóng băng. Nếu người dùng đổi ý giữa chừng, ghi rõ `Spec Change`, cập nhật lại intake ngắn rồi mới làm tiếp.
4. **Cổng Kiểm Định Bắt Buộc (Verification Gates):**
   - Sau mỗi lát cắt code, không chỉ dựa vào việc "code không báo lỗi đỏ". Bắt buộc chạy lệnh verify theo đúng cấp độ:
     - Sửa UI thuần: `lint` + `build/typecheck`
     - Sửa logic/action: unit test + engineering contract check
     - Sửa DB/migration: migration dry-run + schema parity check

---

## PHẦN 5: CÁC MẪU FILE THIẾT LẬP CHUẨN MỰC (COPY-PASTE READY)

### 1. Template `CLAUDE.md` (Đặt tại root dự án)

```markdown
# [TÊN DỰ ÁN] — Claude Code Instructions

Hệ thống [Mô tả 1 câu về dự án]. Stack: [Next.js / TypeScript / Postgres...].
File này nạp tự động mỗi phiên — giữ ngắn gọn (<120 dòng) để tối ưu Prompt Caching.

## 1. Lệnh Phát Triển Cốt Lõi
- Dev: `npm run dev`
- Build / Typecheck: `npm run build`
- Test: `npm test -- <path>`
- Lint: `npm run lint`
- Verify Kỹ thuật: `npm run verify`

## 2. Kiến Trúc & Nguồn Chân Lý (SSOT)
- Cấu trúc: `src/app/` (routes mỏng) · `src/modules/` (DDD modules) · `src/lib/` (logic thuần).
- Tra cứu SSOT nghiệp vụ: Đọc `docs/ssot-map.md`. Đọc hiểu tối thiểu: `docs/core/read-minimum.md`.
- Quy tắc chi tiết theo đường dẫn: Tự động nạp từ `.claude/rules/*.md` khi chạm file.
- Lệnh quy trình: Gọi bằng dấu gạch chéo trong `.claude/commands/` (`/intake`, `/implement`, `/review`, `/ship-slice`).

## 3. Kỷ Luật Tuyệt Đối (Do & Do Not)
- **Always:** Một lát cắt (vertical slice) tại một thời điểm. Diff tối thiểu. Verify pass mới commit.
- **Never:** Không đoán mò schema cơ sở dữ liệu. Không migrate production nếu không có lệnh rõ ràng.
- **Never:** Không mở đọc các file dữ liệu thô, binary, generated build (`.next/`, `node_modules/`, `coverage/`).
- **Phong cách trả lời:** Delta-only, trực diện, không chào hỏi xã giao, báo rõ file đã sửa và kết quả verify.
```

### 2. Template `.claude/settings.json` (Đặt tại `.claude/settings.json`)

```json
{
  "enableAllProjectMcpServers": true,
  "model": "sonnet",
  "permissions": {
    "allow": [
      "Bash(npm run lint*)",
      "Bash(npm run build*)",
      "Bash(npm run test*)",
      "Bash(npm run verify*)",
      "Bash(git status*)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(git branch*)"
    ],
    "ask": [
      "Bash(git commit*)",
      "Bash(git push*)",
      "Bash(vercel*)",
      "Bash(npx supabase db push*)",
      "Bash(npx supabase db reset*)"
    ],
    "deny": [
      "Bash(rm -rf*)",
      "Bash(git push --force*)",
      "Bash(git reset --hard*)",
      "Read(./node_modules/**)",
      "Read(./.next/**)",
      "Read(./build/**)",
      "Read(./dist/**)",
      "Read(./coverage/**)",
      "Read(./package-lock.json)",
      "Read(./public/assets/**)",
      "Read(./**/*.tsbuildinfo)",
      "Read(./.env)",
      "Read(./.env.*)"
    ]
  }
}
```

### 3. Template Path-Scoped Rule: `.claude/rules/database.md`

```markdown
---
paths:
  - "supabase/migrations/**"
  - "src/lib/db/**"
  - "scripts/sql/**"
---

# Quy Tắc Quản Trị Cơ Sở Dữ Liệu & Migrations

Quy tắc này chỉ nạp tự động khi chạm vào file migration, db schema hoặc script SQL.

1. **Quy tắc Additive:** Mọi thay đổi schema phải tương thích ngược. Ưu tiên `ADD COLUMN IF NOT EXISTS`, tạo index trước khi drop.
2. **Đặt tên file:** Theo chuẩn `YYYYMMDDHHMMSS_<mô_tả_ngắn>.sql`. Tuyệt đối không sửa tên các file migration đã chạy trong quá khứ.
3. **Hiệu năng & Index:**
   - Mọi khóa ngoại (Foreign Key) và cột thường xuyên `WHERE / JOIN` bắt buộc phải đánh INDEX.
   - Truy vấn danh sách phải luôn có phân trang (`limit` / `range`), cấm `SELECT *` toàn bảng lịch sử.
4. **Không đoán schema:** Bắt buộc đối chiếu file migration thực tế trước khi định nghĩa interface trong mã nguồn.
```

### 4. Template Subagent: `.claude/agents/explore-module.md`

```markdown
---
name: explore-module
description: Khảo sát một module (route, server action, DB mapping, logic ranh giới). Read-only, context cô lập.
tools: Read, Grep, Glob
model: haiku
---

# explore-module — Agent Khảo Sát Module

Bạn là subagent hoạt động ở chế độ **CHỈ ĐỌC (Read-only)** trong context window riêng biệt, chạy bằng model **Haiku** siêu tiết kiệm token.

## Nhiệm Vụ
1. Khảo sát cấu trúc của module được yêu cầu (routes, components, server actions, RPC DB).
2. Dùng `grep` để định vị điểm mấu chốt, không đọc tràn lan quá 8 file.
3. Trả về cho phiên chính bản tóm tắt delta ngắn gọn gồm:
   - Danh sách Routes & Màn hình chính.
   - Danh sách Server Actions và bảng dữ liệu thao tác.
   - Các điểm lưu ý về ranh giới hoặc lỗ hổng tiềm ẩn.
4. Tuyệt đối không chỉnh sửa file, không tạo code mới.
```

### 5. Template Slash Command: `.claude/commands/intake.md`

```markdown
---
description: Khóa phạm vi kỹ thuật trước khi lập trình một tính năng hoặc sửa lỗi
argument-hint: "[Mô tả tính năng hoặc bug cần giải quyết]"
---

# /intake — Khóa Phạm Vi Trước Khi Code

**Mục tiêu yêu cầu:** $ARGUMENTS

Thực hiện ngay quy trình khóa scope kỹ thuật. Không chỉnh sửa bất kỳ file code nào trong lượt này:

1. **Phân tích mục tiêu (Goal):** Định nghĩa 1 câu duy nhất về kết quả cần đạt được.
2. **Xác định In-Scope:** Liệt kê chính xác các file/thư mục được phép chạm vào (ưu tiên ≤ 5 files).
3. **Xác định Out-of-Scope:** Liệt kê rõ những module, bảng DB, hoặc luồng nghiệp vụ CẤM ĐỤNG.
4. **Tiêu chí nghiệm thu (Acceptance Criteria):** Ít nhất 3 kịch bản kiểm thử rõ ràng (User làm gì → Thấy gì / RPC trả về gì).
5. **Kế hoạch kiểm tra (Verify Plan):** Lệnh kiểm tra cụ thể cần chạy (lint, unit test, build).
6. **Top 3 Rủi ro tiềm ẩn:** Dự đoán các điểm có thể gây lỗi hồi quy (regression).

Xuất ra bảng Intake chuẩn và yêu cầu người dùng xác nhận **「OK TRIỂN KHAI」** trước khi bắt đầu `/implement`.
```

---

## PHẦN 6: QUY TRÌNH PHỐI HỢP ĐỈNH CAO GIỮA CLAUDE PRO (CHAT) VÀ CLAUDE CODE (TERMINAL)

Sự kết hợp thông minh nhất giữa Claude Chat/Pro (giao diện web) và Claude Code (giao diện terminal) theo chuẩn mực 2026:

```
[BƯỚC 1: CLAUDE PRO (WEB / PROJECTS)]
- Khám phá ý tưởng, phân tích tài liệu PDF dày hàng trăm trang.
- Brainstorming kiến trúc hệ thống, đối chiếu tiêu chuẩn y tế / nghiệp vụ phức tạp.
- Soạn thảo bản Đặc tả kỹ thuật (Technical Specification / Intake Spec).
       │
       ▼ (Copy Intake Spec hoặc xuất file Markdown)
[BƯỚC 2: CLAUDE CODE (TERMINAL)]
- Chạy lệnh: `/implement "Dán Intake Spec từ Claude Pro"`
- Claude Code tự động nạp Path-scoped Rules tương ứng.
- Thực hiện diff code chính xác từng dòng theo đúng phạm vi.
       │
       ▼
[BƯỚC 3: KIỂM ĐỊNH & NGHIỆM THU (TERMINAL)]
- Claude Code tự chạy: `npm test`, `npm run verify`.
- Gọi Subagent `/review` chạy ngầm bằng Sonnet/Haiku kiểm tra diff.
- Nghiệm thu bằng lệnh `/ship-slice`.
```

### Lợi ích của quy trình này:
- Không bao giờ tốn credits của Claude Code để đọc các tài liệu nghiên cứu dài dòng.
- Claude Code chỉ nhận "đơn thuốc" đã được chốt và thực thi với tốc độ cao nhất, token ít nhất, độ chính xác 100%.

---

## TỔNG KẾT BẢNG KIỂM "CLAUDE EXCELLENCE CHECKLIST"
Trước khi bắt đầu bất kỳ dự án nào, hãy đảm bảo hệ thống đạt đủ 7 tiêu chí:
- [x] **CLAUDE.md** ngắn gọn (< 150 dòng), cố định ở root để tối ưu Prompt Caching.
- [x] **.claude/settings.json** đã chặn triệt để `Read(...)` vào thư mục nặng, allow lệnh verify an toàn.
- [x] Các quy tắc domain đã được tách thành **.claude/rules/*.md** có trường `paths: [...]`.
- [x] Các tác vụ đọc nhiều file được giao cho **Subagents** chạy bằng **Haiku**.
- [x] Mọi tính năng đều qua cổng **/intake** trước khi gõ code **/implement**.
- [x] Thiết lập phong cách **Delta-only** (không giải thích dài dòng, không chào hỏi thừa).
- [x] Luôn dùng **/clear** sau khi hoàn thành một vertical slice để bắt đầu phiên mới tinh tươm.
