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
| `dashboard.md` | dashboard, analytics, thống kê | CCS, nguồn RPC, đổi KPI = Spec change |
| `mdm.md` | `quan-tri-he-thong`, `master-data` | Đặt chỗ master data, registry, `sys_lookup_value` |
| `dao-tao.md` | `dao-tao` | Schema 3 bảng, chấm theo id phương án |

## 3. Lệnh (`.claude/commands/`)

| Lệnh | Mục đích | Model |
|------|----------|-------|
| `/intake-nv` | PO mô tả nghiệp vụ → intake (chưa code) | mặc định |
| `/intake` | Khóa scope kỹ thuật | mặc định |
| `/domain-slice` | Rà + sửa một lát theo SSOT đã chốt | mặc định |
| `/implement` | Code lát đã duyệt | mặc định |
| `/review` | Giao subagent `review-bv103` | Sonnet |
| `/ship-slice` | Verify + review + Go/No-go (chưa deploy) | mặc định |
| `/uat-cases` | Kịch bản test tay cho PO | Haiku |
| `/go-live-check` | Cổng sẵn sàng pilot (không deploy) | mặc định |
| `/explain` | Giải thích, không sửa | mặc định |
| `/commit` · `/pr-create` | Chỉ khi PO ra lệnh | Haiku |

## 4. Skills (`.claude/skills/`)

| Skill | Khi nào |
|-------|---------|
| `smart-db-bv103` | Schema, RPC, index, RLS, import lô, báo cáo chậm |
| `supabase` | Auth, RLS, client, CLI |
| `react-dev` | Component React 19 / hook mới (không mở khi chỉ sửa action/SQL) |
| `destructive-change` | DROP, xóa module, đổi không đảo được — dừng chờ PO |

## 5. Subagent (`.claude/agents/`; read-only trừ `test-writer` chỉ ghi `*.spec.ts`)

| Agent | Việc | Model |
|-------|------|-------|
| `explore-module` | Khảo sát một module trước khi sửa | Haiku |
| `db-verify` | Đối chiếu migration với mapping | Haiku |
| `acceptance-ui` | ≥3 kịch bản test tay | Haiku |
| `intake-coach` | Dịch mô tả PO thành intake | Sonnet |
| `review-bv103` | Review diff, Go/No-go | Sonnet |
| `slice-supervise` | Soát lát theo whitelist + DoD | Sonnet |
| `verify-runner` | Chạy verify, chỉ trả lỗi gọn (giữ log ngoài phiên chính) | Haiku |
| `test-writer` | Viết spec vitest cho logic thuần của lát đã chốt | Sonnet |

## 6. Chọn model

| Việc | Model | Ghi chú |
|------|-------|---------|
| Sửa lát theo SSOT đã chốt, UI, action, docs, verify | **Sonnet** (mặc định) | 90% công việc |
| Đọc nhiều file, khảo sát, checklist, commit/PR | **Haiku** (subagent/lệnh đã ghim) | Rẻ nhất |
| Ranh giới CSSD vs MDM mơ hồ, thiết kế migration/RPC khó, KPI lệch, debug sau 2 lần Sonnet thất bại | **`/model opusplan`** | Opus lập kế hoạch, Sonnet thực thi |
| Kiến trúc đổi lớn (hiếm) | **Opus** | Phiên riêng; xong thì `/clear`, phiên sau mở bằng Sonnet |
| Không dùng Opus | — | Sửa nhãn, UI nhỏ, docs, chạy verify |

Giữ credit (đo 2026-10-12: hai phiên ~900 lượt, ngữ cảnh trung bình 340–480 nghìn token **mỗi lượt** — đây là chỗ tốn nhất):

1. **Một việc = một phiên.** Xong lát → `/clear`. `/clear` chỉ xóa trí nhớ hội thoại; plan (`~/.claude/plans/`), code, memory vẫn còn.
2. **Chọn model lúc mở phiên, không đổi giữa chừng.** Cache gắn với model: đổi là ghi lại toàn bộ ngữ cảnh.
3. **Quá ~100 lượt hoặc chậm** → ghi tiến độ vào plan rồi `/clear` (hoặc `/compact`). `/context` xem phần đang nạp.
4. **Prompt ba phần:** làm gì (một lát) · xong trông thế nào · không đụng gì. Bỏ nhân vật («chuyên gia…») và khẩu hiệu («chính xác tuyệt đối») — luật đã nằm ở `CLAUDE.md`.
5. **Hỏi quyết định, không hỏi «rà soát toàn bộ».** Một tuần một lần: «việc nào đáng làm nhất theo số liệu dùng thật?».
6. **Kiểm giao diện bằng `read_page`**, chỉ chụp ảnh khi cần xem bố cục.
7. **Đọc nhiều file thì giao subagent** (Haiku) để phiên chính gọn. Plan mode (`Shift+Tab`) trước việc lớn · đọc ≤ 8 file/task.
8. **Prod chỉ `SELECT`.** Thử thì dùng DB local.

## 7. Một lát chuẩn

`/intake-nv` (PO) hoặc `/intake` → duyệt → `/implement` → verify theo bảng ở `CLAUDE.md` → `/review` → PO test tay (`/uat-cases`) → `/ship-slice` → `/commit` chỉ khi PO bảo.

## 8. MCP (`.mcp.json`)

Supabase `cvzwslpxwgqiugzzhqej` · GitHub `ksnkbv103-droid/ksnk_bv103_V2` · Vercel `ksnk-bv103-v2`. OAuth một lần bằng `/mcp`.
