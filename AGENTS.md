# AGENTS.md - KSNK BV103

> Phiên bản làm sạch - 19/05/2026

## Triết lý cốt lõi

**Boy Scout Rule**
Khi chạm vào code, hãy để lại nó sạch đẹp hơn — **trong phạm vi slice đang làm**, không refactor lan sang file khác (xem kỷ luật agent bên dưới).

**Kỷ luật agent (LLM)** — áp dụng task không trivial; chi tiết [`.cursor/rules/01-agent-discipline.mdc`](.cursor/rules/01-agent-discipline.mdc):

| Nguyên tắc | BV103 |
|------------|--------|
| Think first | Hỏi khi nghiệp vụ / CSSD vs MDM mơ hồ; nêu tradeoff trước code |
| Simplicity | Một vertical slice; không abstraction thừa |
| Surgical | Diff tối thiểu; Boy Scout chỉ file/logic vừa chạm |
| Goal-driven | Pilot DoD + `npm run verify:engineering` khi đụng action / DB |

**Ưu tiên:**
1. Long-term Maintainability + Developer Experience
2. Đúng nghiệp vụ + Dữ liệu nhất quán
3. Security, Test Coverage, Observability
4. Không tạo technical debt mới

## Quy trình phát triển

### Làm theo mảnh (Vertical Slice)
Chỉ làm một mảnh tại một thời điểm. Mỗi mảnh phải có Pilot DoD rõ ràng.

### Pilot DoD
1. Xác định rõ người dùng/môi trường
2. Ít nhất 3 kịch bản tay chạy được
3. Dữ liệu + Migration/RPC đã apply đúng
4. Build + verify:engineering pass

## App ↔ Database

| Tình huống | Việc cần làm |
|------------|----------------|
| Đổi schema / RPC / view | Migration trong `supabase/migrations/` → `npm run mdm:migrate` (local: `mdm:migrate:local`) |
| Sau migrate | `npm run verify:mdm` (hoặc `:local`) |
| Đổi action/query khớp DB | `npm run verify:engineering` |
| Cập nhật SSOT ánh xạ | Dòng changelog trong `docs/core/implementation-mapping.md` |
| Ship pilot | `npm run pilot:ship` |

Chi tiết: [`governance-pipeline.md`](docs/core/governance-pipeline.md), [`lean-execution.md`](docs/core/lean-execution.md).

## Kiến trúc & Code Quality

- DDD rõ ràng trong src/modules/
- Logic nghiệp vụ để trong lib/ và actions/
- Bắt buộc dùng verifyPermission
- Ưu tiên Server Action
- Viết test cho phần thuần

## Quy tắc làm việc

- Tập trung vào một mảnh
- Chạy `npm run verify` trước khi push (full gate; `verify:quick` chỉ khi chắc không đụng action/DB)
- PR nhỏ, mô tả rõ ràng
- Conventional Commits

## Lưu ý quan trọng

- Dữ liệu đúng quan trọng hơn UI đẹp
- Không thay đổi DB mà chưa có migration
- Security và quyền phải rõ ràng
- **Cấm đoán mò và che giấu sự mơ hồ:** Luôn kiểm tra cấu trúc DB thực tế bằng CLI hoặc migrations; cấm tự tiện phán đoán cột/bảng hoặc validation dựa trên phỏng đoán.
- **Quản trị Pre-aggregation chặt chẽ:** Chỉ tạo bảng tổng hợp/summary khi chứng minh được sự cần thiết vật lý bằng số liệu cụ thể (dung lượng, CPU cycle, latency) và được người dùng phê duyệt thông qua kế hoạch đánh đổi (tradeoffs).


## Tài liệu — cổng duy nhất

| Việc | Đọc |
|------|------|
| **Sửa code / migration / PR** | [`docs/README.md`](docs/README.md) → [`docs/core/read-minimum.md`](docs/core/read-minimum.md) → SSOT `core/*` |
| **Khám phá nghiệp vụ / câu hỏi tổng hợp** | [`docs/wiki/entities.md`](docs/wiki/entities.md) + [`docs/wiki/concepts.md`](docs/wiki/concepts.md) |
| **Ingest / cập nhật / lint tài liệu wiki** | [`docs/wiki/WIKI_SCHEMA.md`](docs/wiki/WIKI_SCHEMA.md) (ingest · query · lint) + `log.md` |

`AGENTS.md` = cổng **ship code**; `WIKI_SCHEMA.md` = quy trình **duy trì wiki** — không thay `read-minimum` khi implement.
- **Quy chuẩn Kỹ thuật & UI/UX:** [`docs/core/engineering-guidelines.md`](docs/core/engineering-guidelines.md)
- **Đặc tả Nghiệp vụ y tế:** [`docs/core/domain-specification.md`](docs/core/domain-specification.md)
- **Cẩm nang Vận hành, Bảo mật & DB:** [`docs/core/operations-sop.md`](docs/core/operations-sop.md)
- **Bàn giao & Lộ trình:** [`docs/core/handover-roadmap.md`](docs/core/handover-roadmap.md)