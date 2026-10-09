# Skills, Agents & Commands Catalog — BV103

> **Bản chuẩn hóa cho Claude Code** (2026-10-09).  
> Toàn bộ lệnh, skill và agent chuyên biệt nằm duy nhất trong thư mục `.claude/`.  
> Claude Code tự nạp [`../../CLAUDE.md`](../../CLAUDE.md) (ngắn gọn, tối ưu credits). Skill và subagent chỉ nạp on-demand khi khớp việc.

---

## 1. Slash Commands (`.claude/commands/`)

Gọi bằng dấu `/` trong phiên làm việc với Claude Code:

| Lệnh | Mục đích | Ai dùng |
|------|----------|---------|
| `/intake-nv` | PO mô tả nghiệp vụ thuần tiếng Việt → chuyển thành intake chuẩn | PO |
| `/intake` | Khóa scope kỹ thuật trước khi code | Kỹ thuật / Dev |
| `/implement` | Thực thi một lát (vertical slice) sau khi intake đã duyệt | Dev / Claude |
| `/domain-slice` | Rà soát, phản biện, chọn theo SSOT đã chốt, sửa 1 lát | Dev / Claude |
| `/uat-cases` | Sinh kịch bản nghiệm thu tay (UAT) cho PO | PO / Dev |
| `/ship-slice` | Chạy bộ verify và kiểm tra trước khi hoàn tất lát | Dev / Claude |
| `/go-live-check` | Kiểm tra trạng thái sẵn sàng golive (không deploy) | Dev / PO |
| `/review` | Review diff theo checklist BV103 | Dev / Claude |
| `/explain` | Giải thích kiến trúc hoặc logic (chỉ đọc, không sửa) | Dev / PO |
| `/commit` | Tạo commit theo convention sau khi verify pass | Dev / Claude |
| `/pr-create` | Tạo Pull Request | Dev / Claude |

---

## 2. Skills (`.claude/skills/`)

Skill được cấu hình tự động hoặc nạp on-demand theo từng module/tình huống công việc:

### Domain & Modules

| Skill | Module / Tình huống |
|-------|---------------------|
| `cssd-pilot` / `cssd-spec` | Quy trình tiệt khuẩn CSSD, mẻ hấp, kiểm soát dụng cụ, sự cố |
| `giam-sat-pilot` / `giam-sat-spec` | Giám sát tuân thủ VST, GSC, phiên kiểm tra |
| `bang-kiem-spec` | Ma trận bảng kiểm, tiêu chí, rubric đánh giá |
| `nkbv-spec` | Nhiễm khuẩn bệnh viện (BSI, UTI, PNEU, SSI, VAE) — cấm đọc CDC thô |
| `qlcv-pilot` / `qlcv-spec` | Quản lý công việc, Kanban, phân công, checklist |
| `dashboard-pilot` / `dashboard-spec` | Dashboard, báo cáo tổng hợp, KPI, RPC phân tích |
| `dao-tao-spec` | Ngân hàng câu hỏi, đề thi MCQ đào tạo |
| `mdm-spec` / `master-data-placement` | Quản trị danh mục dùng chung (MDM), chuẩn hóa vị trí lưu |

### Kỹ thuật & Hạ tầng

| Skill | Chức năng |
|-------|-----------|
| `smart-db-bv103` | Best practices Postgres/Supabase, index, keyset pagination, cache |
| `migration-rules` | Luật viết migration additive, mapping schema, an toàn dữ liệu |
| `destructive-change` | Cổng kiểm soát thay đổi phá hủy (DROP table/column, breaking change) |
| `schema-sync` | Đồng bộ type TypeScript với schema Supabase |
| `react-dev` | React 19, Server/Client components, Hooks, tối ưu UI |
| `frontend-performance` | Tối ưu bảng, tránh re-render, ảo hóa danh sách |
| `architecture-quality` | DDD ranh giới module, boy-scout rule, clean code |
| `agent-efficiency` | Kỷ luật tiết kiệm token/credits, không đọc file thừa |
| `supabase` | Tương tác CLI Supabase, Auth, RLS |
| `po-intake` / `po-workflow` / `intake-freeze` | Quy trình khóa yêu cầu của PO |
| `reviewing-code` | Tiêu chuẩn đánh giá code |
| `src-editing` | Kỷ luật chỉnh sửa code trong `src/` |

---

## 3. Subagents (`.claude/agents/`)

Chuyên trách các nhiệm vụ đọc nhiều file hoặc kiểm tra độc lập (ưu tiên chạy bằng model tiết kiệm credits như Haiku/Sonnet):

| Subagent | Chức năng | Chế độ |
|----------|-----------|--------|
| `explore-module` | Khảo sát một module (route, action, RPC, DB) | Read-only |
| `db-verify` | Đối chiếu migration với mapping DB | Read-only |
| `intake-coach` | Hướng dẫn và hoàn thiện intake từ yêu cầu thô | Read-only |
| `acceptance-ui` | Lập danh sách kiểm thử giao diện cho PO | Read-only |
| `slice-supervise` | Giám sát độ gọn gàng của lát cắt so với DoD | Read-only |
| `review-bv103` | Review độc lập trước khi merge | Read-only |

---

## 4. MCP Servers (`.mcp.json`)

- **Supabase**: Kết nối project `cvzwslpxwgqiugzzhqej`
- **GitHub**: Tương tác repo `ksnkbv103-droid/ksnk_bv103_V2`
- **Vercel**: Deploy và quản lý preview `ksnk-bv103-v2`
