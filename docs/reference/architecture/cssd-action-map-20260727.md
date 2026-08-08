# CSSD action map (local — 2026-07-27)

> Mục tiêu: một bản đồ command/query — giảm import trùng tên, **không** đụng safety gate / RPC mẻ trong đợt này.

## Entry chuẩn (ưu tiên import)

| Vai trò | File | Ghi chú |
|---------|------|---------|
| Barrel tổng | [`cssd.actions.ts`](../../../src/modules/cssd-erp/actions/cssd.actions.ts) | Re-export read/write + workflow/batch/print |
| **Query** | [`read.actions.ts`](../../../src/modules/cssd-erp/actions/read.actions.ts) → `cssd-read.actions.ts` | Đọc trạm, map, báo cáo… |
| **Command ghi** | [`write.actions.ts`](../../../src/modules/cssd-erp/actions/write.actions.ts) → `cssd-write.actions.ts` | Ghi nghiệp vụ nhẹ (vd. inventory issue) |
| Workflow QR | `cssd-workflow.commands.actions.ts`, `cssd-workflow-ops.actions.ts`, `cssd-scan.actions.ts` | Giữ tách — safety |
| Mẻ / QC | `cssd-batch.actions.ts` | Giữ tách |
| Kho HC | `cssd-kho-hoa-chat*.actions.ts` | Giữ tách |
| Bảo trì TB | `cssd-bao-tri*.actions.ts` | Giữ tách |
| Catalog RO | `cssd-catalog.actions.ts` | Master đọc — ranh giới MDM |

## Quy ước import app

```ts
// Đúng (alias mỏng)
import { … } from "@/modules/cssd-erp/actions/read.actions";
import { … } from "@/modules/cssd-erp/actions/write.actions";

// Tránh trong code mới — file vật lý vẫn tồn tại cho barrel nội bộ
import { … } from "@/modules/cssd-erp/actions/cssd-read.actions";
```

## Việc chưa làm (cố ý)

- Không gộp `cssd-su-co` vào `cssd-erp`.
- Không đổi RPC / ledger / heat gate.
- Hợp nhất file vật lý `cssd-read` ↔ `read` chỉ khi grep sạch 100% caller.
