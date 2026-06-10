# LEAN Execution — BV103

> Một trang thực thi + checklist PR. Cổng tài liệu: [`../README.md`](../README.md).

## Một nhịp (vertical slice)

1. Chọn **một** mảnh (module + luồng UI rõ).
2. Đọc tối thiểu: [`read-minimum.md`](read-minimum.md).
3. Implement surgical — mỗi dòng diff truy vết được yêu cầu ([`01-agent-discipline.mdc`](../../../.cursor/rules/01-agent-discipline.mdc)).
4. Verify theo bảng dưới → Pilot DoD trong [`AGENTS.md`](../../../AGENTS.md).

## Pilot DoD (xong task)

| # | Tiêu chí |
|---|----------|
| 1 | Người dùng / môi trường (pilot, role) xác định |
| 2 | ≥3 kịch bản tay trên UI (hoặc RPC) cho luồng vừa sửa |
| 3 | Migration/RPC apply đúng nếu đụng schema (`mdm:migrate` khi cần) |
| 4 | Lệnh verify phù hợp pass (không chỉ `build`) |

## Lệnh verify

| Loại thay đổi | Trước push (local) | CI tương đương |
|---------------|-------------------|----------------|
| Mặc định / PR | `npm run verify` (= full gate) | job `verify` |
| Chỉ UI nhỏ, không action | `npm run verify:quick` | — |
| Server Action / `fact_*` | `npm run verify:engineering` tối thiểu | `verify:engineering` |
| CSSD module | + `npm run verify:cssd` | lint cssd-arch + tests |
| MDM / migration | + `npm run verify:mdm` sau migrate | (manual / pipeline) |
| Ship pilot DB | `npm run pilot:ship` | — |
| Go-live gate | `npm run pilot:go-live:gate` | DB + auth + verify + smoke |

**Lưu ý:** `verify:quick` chỉ `build` — không thay PR checklist.

## Checklist PR

- [ ] Đúng module; không vi phạm CSSD vs MDM ([`implementation-mapping.md`](implementation-mapping.md))
- [ ] `UI → Action → DB` khớp mapping; quyền qua `verifyPermission`
- [ ] Không dead link doc; nếu đổi bảng SSOT → dòng changelog trong mapping
- [ ] `npm run verify` pass (hoặc `verify:full` tương đương)
- [ ] Đã chạy tay ≥1 luồng chính trên UI

## Boy Scout vs Surgical

- **Surgical:** không refactor file lân cận / audit cả repo.
- **Boy Scout:** chỉ file đang sửa — xóa orphan do diff của bạn, đặt tên rõ hơn trong cùng function.
