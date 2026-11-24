# Claude Code — bản đồ cấu hình & chọn model (BV103)

> Thân duy nhất nằm trong `.claude/`. File này chỉ là mục lục — không chép nội dung rule/skill vào đây.
> Cửa vào: [`../../CLAUDE.md`](../../CLAUDE.md) (nạp sẵn, ~6 KB).

## 1. Cơ chế nạp (vì sao tốn ít token)

| Lớp | Nạp khi nào | Dùng cho |
|-----|-------------|----------|
| `CLAUDE.md` | Mỗi phiên | Lệnh, kiến trúc, kỷ luật, khóa PO |
| `.claude/rules/*.md` | **Tự động khi Claude đọc/sửa file khớp `paths`** | Luật theo vùng code (không tốn token nếu không chạm vùng đó) |
| `.claude/commands/*.md` | Khi gõ `/lệnh` | Quy trình có thứ tự |
| `.claude/skills/*` | Chỉ phần mô tả; thân nạp khi việc khớp | Kỹ thuật chung, dài |
| `.claude/agents/*.md` | Khi giao việc (context cô lập, model ghim) | Đọc nhiều file, review, kiểm tra |
| `.claude/settings.json` | Mỗi phiên | Model mặc định, allow/ask/deny |

## 2. Rules theo đường dẫn (`.claude/rules/`)

| Rule | Nạp khi chạm | Nội dung |
|------|--------------|----------|
| `src.md` | `src/**` | Ranh giới module, prefix DB, style, domain thuần |
| `data-access.md` | `**/actions/**`, `**/hooks/**`, `*server*.ts` | Schema-sync, phân trang, `verifyPermission` |
| `migrations.md` | `supabase/migrations/**`, `scripts/sql/**` | Additive, tên file, không đoán schema |
| `cssd.md` | `cssd-*` | Tiệt khuẩn, bộ vô khuẩn, CSSD ≠ MDM |
| `nkbv.md` | `giam-sat-nkbv` | ADR 1 module, cấm CDC thô |
| `giam-sat.md` | VST/GSC/bảng kiểm | Trần 3 đối tượng, scoring, `results_jsonb` |
| `qlcv.md` | `quan-ly-cong-viec` | Trạng thái, checklist RPC, spawn định kỳ |
| `dashboard.md` | dashboard, analytics, thống kê | CCS, nguồn RPC, đổi chỉ số = Spec change |
| `mdm.md` | `quan-tri-he-thong`, `master-data` | Đặt chỗ master data, registry, `sys_lookup_value` |
| `dao-tao.md` | `dao-tao` | Schema 3 bảng, chấm theo id phương án |

## 3. Lệnh (`.claude/commands/`)

| Lệnh | Mục đích | Model |
|------|----------|-------|
| `/intake-nv` | *Không dùng — xem bảng luồng ở `CLAUDE.md`.* PO mô tả nghiệp vụ → intake (chưa code) | Sonnet |
| `/intake` | Khóa scope kỹ thuật | Sonnet |
| `/domain-slice` | *Không dùng — xem bảng luồng.* Rà + sửa một lát theo SSOT đã chốt | Sonnet |
| `/implement` | Code lát đã duyệt | Sonnet |
| `/review` | Verify theo intake + giao subagent `review-bv103` soát whitelist/DoD, Go/No-go (chưa deploy) | Sonnet |
| `/uat-cases` | Kịch bản test tay cho PO | Haiku |
| `/go-live-check` | Cổng sẵn sàng pilot (không deploy); có bước so schema prod chỉ đọc + lỗi runtime Vercel sau deploy | Sonnet |
| `/explain` | Giải thích, không sửa | Sonnet |
| `/commit` · `/pr-create` | Chỉ khi PO ra lệnh (cờ `disable-model-invocation: true`: model không tự gọi) | Haiku |

## 4. Skills (`.claude/skills/`)

| Skill | Khi nào |
|-------|---------|
| `smart-db-bv103` | Schema, RPC, index, RLS, import lô, báo cáo chậm |
| `supabase-postgres-best-practices` | Luật Postgres/RLS/index/migration chính thức của Supabase (chép nguyên văn, ghim sha — xem §9 dòng 1). `smart-db-bv103` chỉ giữ phần riêng BV103 |
| `supabase` | Auth, RLS, client, CLI |
| `react-dev` | Component React 19 / hook mới (không mở khi chỉ sửa action/SQL) |
| `destructive-change` | DROP, xóa module, đổi không đảo được — dừng chờ PO |

## 5. Subagent (`.claude/agents/`; read-only trừ `test-writer` ghi `*.spec.ts`, `slice-fixer` và `migration-author` có ghi)

| Agent | Việc | Model |
|-------|------|-------|
| `explore-module` | Khảo sát một module trước khi sửa | Haiku |
| `db-verify` | Đối chiếu migration với mapping | Haiku |
| `acceptance-ui` | ≥3 kịch bản test tay | Haiku |
| `intake-coach` | Dịch mô tả PO thành intake | Sonnet |
| `review-bv103` | Review diff + soát whitelist/DoD, Go/No-go | Sonnet |
| `chay-kiem` (toàn cục, `~/.claude/agents`) | Chạy lệnh verify được giao, chỉ trả lỗi gọn (giữ log ngoài phiên chính) | Haiku |
| `test-writer` | Viết spec vitest cho logic thuần của lát đã chốt | Sonnet |
| `slice-fixer` | Sửa MỘT lát code theo mẫu rõ (≤ 8 file), có spec + commit | Sonnet |
| `security-auditor` | Rà quyền/RLS/DEFINER/IDOR trong MỘT vùng hẹp, chỉ báo Nghiêm trọng/Cao | Sonnet |
| `migration-author` | Migration/RPC khó (nguyên tử, khóa dòng, ACL), apply local, không prod | **Opus** (duy nhất) |

## 6. Chọn model

| Việc | Model | Ghi chú |
|------|-------|---------|
| Sửa lát theo SSOT đã chốt, UI, action, docs, verify | **Sonnet** (mặc định) | 90% công việc |
| Đọc nhiều file, khảo sát, checklist, commit/PR | **Haiku** (subagent/lệnh đã ghim) | Rẻ nhất |
| Ranh giới CSSD vs MDM mơ hồ, thiết kế migration/RPC khó, chỉ số lệch, debug sau 2 lần Sonnet thất bại | **`/model opusplan`** | Opus lập kế hoạch, Sonnet thực thi |
| Kiến trúc đổi lớn (hiếm) | **Opus** | Phiên riêng; xong thì `/clear`, phiên sau mở bằng Sonnet |
| Không dùng Opus | — | Sửa nhãn, UI nhỏ, docs, chạy verify |

Giữ credit (đo 2026-10-12: hai phiên ~900 lượt, ngữ cảnh trung bình 340–480 nghìn token **mỗi lượt** — đây là chỗ tốn nhất):

1. **Một việc = một phiên.** Xong lát → `/clear`. `/clear` chỉ xóa trí nhớ hội thoại; plan (`~/.claude/plans/`), code, memory vẫn còn.
2. **Chọn model lúc mở phiên, không đổi giữa chừng.** Cache gắn với model: đổi là ghi lại toàn bộ ngữ cảnh.
3. **Quá ~100 lượt hoặc chậm** → ghi tiến độ vào plan rồi `/clear` (hoặc `/compact`). `/context` xem phần đang nạp.
   - **Cuối mỗi trả lời** có khối 4 dòng Lộ trình / Clear / Bước kế / Model (luật ở `~/.claude/CLAUDE.md`). `/clear` = có khi vừa xong một lát hoặc đổi sang việc khác; không khi còn đang giữa lát.
4. **Prompt ba phần:** làm gì (một lát) · xong trông thế nào · không đụng gì. Bỏ nhân vật («chuyên gia…») và khẩu hiệu («chính xác tuyệt đối») — luật đã nằm ở `CLAUDE.md`.
5. **Hỏi quyết định, không hỏi «rà soát toàn bộ».** Một tuần một lần: «việc nào đáng làm nhất theo số liệu dùng thật?».
6. **Kiểm giao diện bằng `read_page`**, chỉ chụp ảnh khi cần xem bố cục.
7. **Đọc nhiều file thì giao subagent** (Haiku) để phiên chính gọn. Plan mode (`Shift+Tab`) trước việc lớn · đọc ≤ 8 file/task.
8. **Prod chỉ `SELECT`.** Thử thì dùng DB local.
9. **Điều phối agent (bài học 2026-10-12: 9 agent Opus, 5 chạy song song → tuần 70%, agent chết giữa chừng, commit lẫn lát).** Hook toàn cục `~/.claude/hooks/guard-agent.mjs` chặn: `model: opus/fable` cho agent không ghim model đó trong frontmatter; mọi agent không có file ghim ở `.claude/agents` hoặc `~/.claude/agents` (`general-purpose`/`Explore`/`Plan`...). Quy tắc: một agent ghi tại một thời điểm; rà soát một vùng hẹp, chỉ Nghiêm trọng/Cao; kiểm `get_usage` trước khi giao (tuần > 60% → chỉ lát chặn pilot); lát nào cần cả RPC và code thì `migration-author` trước rồi `slice-fixer`.

## 7. Một lát chuẩn

`/intake-nv` (PO) hoặc `/intake` → duyệt → `/implement` → verify theo bảng ở `CLAUDE.md` → `/review` → PO test tay (`/uat-cases`) → `/commit` chỉ khi PO bảo.

## 8. MCP (`.mcp.json`)

Supabase `cvzwslpxwgqiugzzhqej` · GitHub `ksnkbv103-droid/ksnk_bv103_V2` · Vercel `ksnk-bv103-v2`. OAuth một lần bằng `/mcp`.

## 9. Công cụ ngoài đã xét (sổ sống, đo 19/11/2026)

Chép từ plan «một con đường» §12. Mỗi dòng có bằng chứng và quyết định; cột Lát là lát của plan đó đưa quyết định vào cấu hình; ký hiệu «§n» trong bảng là mục của plan `git show 2222a336:.claude/plans/de-xuat-mot-con-duong-20261119.md`.

**Luật dùng sổ:**
- Dòng đã có quyết định thì không đề xuất lại. Muốn mở lại phải có số đo mới (theo luật đóng băng: lỗi lặp ≥ 2 lần).
- Ở cổng 2, phương án B của spec phải là «dùng công cụ có sẵn», tra trong sổ này hoặc catalog. Tra được công cụ mới thì thêm một dòng kèm quyết định.
- PO không cần tự đi tìm repo nữa.

| # | Công cụ | Làm gì | Bằng chứng (đo 19/11) | Quyết định | Lát |
|---|---|---|---|---|---|
| 1 | `supabase/agent-skills` → skill `supabase-postgres-best-practices` | Luật Postgres/RLS/index/migration do Supabase giữ; 34 file tham chiếu | ★3,1k · đẩy 12/11 · MIT · chính MCP Supabase khuyên cài | **Dùng.** Đã chép nguyên văn 19/11/2026 vào `.claude/skills/supabase-postgres-best-practices/`: `SKILL.md` + 5 file tham chiếu (`security-rls-basics`, `security-rls-performance`, `schema-foreign-key-indexes`, `lock-short-transactions`, `query-missing-indexes`). **Ghim sha `c9be0e931b7930f7d02126d04774d904c381e7d7`** (repo `supabase/agent-skills`). Cập nhật = chép lại từ sha mới và đổi dòng này. Không cài plugin `supabase` (partner), vì nó kèm thêm 1 MCP Supabase trùng `.mcp.json` | 3 |
| 2 | `typescript-lsp` (Anthropic) | Báo lỗi type ngay sau mỗi lần sửa; tìm định nghĩa/tham chiếu | Đã cài, `typescript-language-server` có sẵn, nhưng đang `false` | **Bật** | 3 |
| 3 | `supabase/setup-cli` (Action chính thức) | Cài Supabase CLI trong runner để chạy `supabase start` + `db:dung` | ★213 · đẩy 17/11 · MIT | **Dùng** trong `db-dung.yml` | 1 |
| 4 | `usebasejump/supabase-test-helpers` | Hàm pgTAP `tests.authenticate_as`, tạo user test, kiểm RLS bật; docs Supabase dùng các hàm này | ★133 · đẩy lần cuối 05/2024 (đứng yên 18 tháng) · MIT | **Mượn.** Chép đúng các hàm cần vào `supabase/tests/`; không cài qua dbdev để khỏi phụ thuộc gói đứng yên | 1b |
| 5 | `github/spec-kit` | constitution → … → analyze → implement | ★150k · đẩy 18/11 | **Không cài.** Mượn ý `analyze` (§11) | 2 |
| 6 | `mattpocock/skills` (catalog: `mattpocock-skills`) | 21 skill kỹ thuật; `grill-with-docs` = phỏng vấn dồn để bắt lỗ kế hoạch, ghi ADR + glossary | ★327k · đẩy 18/11 · MIT | **Mượn ý, không cài.** Cả bộ có `to-spec`, `implement`, `tdd`, `triage`… nên sẽ thành luồng chồng lam-het, đúng lỗi §1. Đọc skill «grilling» rồi đưa câu hỏi vào prompt giao `phan-bien` ở cổng 3 (chỉ đổi prompt, không thêm file) | 3 |
| 7 | `vercel-labs/agent-skills` | `react-best-practices`, `composition-patterns`, `web-design-guidelines` | ★34k · đẩy 12/11 · không ghi license | **Không, trừ khi cần.** Đã có skill `react-dev` + việc UI còn mở ở `docs/bo-tai-lieu/01` §6.7. Repo không ghi license nên không chép nguyên văn. Chỉ xét khi một lát UI có vấn đề hiệu năng đo được | — |
| 8 | `sbdchd/squawk` (+ `squawk-action`) | Linter migration: bắt thao tác khóa bảng lâu (index không CONCURRENTLY, thêm NOT NULL…) | ★1,27k · đẩy 18/11 · Apache-2.0 | **Không bây giờ.** Dữ liệu pilot nhỏ nên khóa bảng không gây gián đoạn. Lỗi thật của dự án là chuỗi gãy, sửa file đã áp và thân hàm hỏng, đã có `migration-bat-bien` + `db lint` lo. Xét lại khi bảng prod đủ lớn để khóa gây gián đoạn (đo bằng MCP) | — |
| 9 | `vercel/next-devtools-mcp` | Đọc lỗi runtime/route của dev server Next 16 | ★838 · đẩy 15/09 | **Không.** Browser pane + `read_console_messages` + `preview_logs` trên `dev-local` đã làm việc này | — |
| 10 | `context7` (Upstash) | Tra docs đúng phiên bản thư viện | ★65k · MIT · MCP chạy trên máy chủ ngoài | **Không.** Docs Supabase/Next đã tra được qua MCP Supabase/Vercel; context7 gửi truy vấn ra ngoài. Xét lại nếu lỗi dùng API cũ của React 19/Zod 4 lặp ≥ 2 lần | — |
| 11 | `obra/superpowers` | Brainstorm, TDD, subagent… | ★321k. Nạp từ plugin đồng bộ của tài khoản (`~/.claude/plugins/synced/…`), không qua `settings.json`. Mỗi phiên chèn khối «EXTREMELY_IMPORTANT» bắt gọi skill trước mọi việc, chồng lam-het | **Tắt** ở mục Plugins của app. Việc này ảnh hưởng mọi dự án; chưa kiểm được có tắt riêng một dự án được không | 3 (PO) |
| 12 | `security-guidance` (Anthropic) | Cảnh báo theo mẫu khi sửa; LLM review diff ở Stop; review commit | Catalog chính thức | **Không.** Thêm hook Stop gọi LLM mỗi lượt (docs: Stop phải nhanh). RLS/auth/migration đã có `security-auditor` + `review-bv103` | — |
| 13 | `code-review`, `pr-review-toolkit` (Anthropic); `coderabbit`, `greptile`, `claude-code-review-council` | Review PR nhiều agent | Catalog | **Không cài.** `/code-review` có sẵn trong Claude Code, cộng `review-bv103`. Dịch vụ ngoài gửi mã ra ngoài | — |
| 14 | `feature-dev`, `ralph-loop`, `hookify`, `claude-md-management`, `session-report` | Luồng phát triển, vòng lặp tự chạy, tạo hook, sửa CLAUDE.md, báo cáo token | Catalog | **Không.** Mỗi cái thêm một luồng hoặc lớp cấu hình, trái §7 và luật đóng băng. Token đã đo bằng `agent_dung.py` và `/usage` | — |
| 15 | `semgrep`, `sonarqube`, `sentry` | SAST; giám sát lỗi | Catalog; `package.json` không có `@sentry` | **Không bây giờ.** Lỗi runtime prod đọc qua Vercel MCP (§10 #7). ESLint + `security-auditor` lo phần mã | — |
| 16 | `playwright` (Microsoft) | Điều khiển browser, e2e | Đã nạp | **Giữ** | — |
