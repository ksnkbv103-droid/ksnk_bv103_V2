> ⚠️ **SUPERSEDED (2026-09-17)** — Không dùng làm plan đang hiệu lực.  
> **Plan hiệu lực:** [`BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md`](./BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md) (+ rà rối [`BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md`](./BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md)).  
> File này giữ lịch sử.

# Cleanup wave 2026-09-17 — chồng chéo / nợ / dead code

**Phạm vi:** app local (không migrate prod, không commit).  
**Nguyên tắc:** an toàn trước — xóa cái không còn import; % ưu tiên counts; CCS không lộ UI.

## Đã xử lý (P0)

| Việc | Kết quả |
|------|---------|
| Xóa `dashboard-decision-queue-signals.actions.ts` | Không importer sau H2 |
| Xóa `command-center-dashboard-page.tsx` | `/` → BCTH; trang CC không còn route |
| Bỏ export `computeCcs` khỏi `supervision-metrics` | CCS không còn đường vào barrel |
| `gscTyLeFromMatrixCounts` + `resolveKhoaAggregateTyLe(..., matrixCounts)` | Charts/sort tính lại GSC từ counts (né ROUND SQL 1 chữ số) |
| TGS / BCTH KPI format (P.A + C) | Giữ formatPercent1/2 đúng metric |

## Chưa đụng (cố ý)

| Nợ | Lý do |
|----|--------|
| SQL `ROUND(..., 1)` trên ~8 migration GSC RPC | Cần lệnh «migrate» của Nghĩa |
| NKBV nhánh infant / SUTI_2 legacy map | Đã purge diagnosis path; residual đọc DB cũ + age gate — không xóa mù |
| `computeCcs` pure fn trong `formulas.ts` | Giữ @deprecated nội bộ; không export |
| Hub Giám sát + ModeNav | Hub = cửa ghi nhận; ModeNav = công tắc trong module (P.A) |
| Docs NKBV / bang-kiem dirty lớn | Ngoài lát cleanup giám sát; không xóa SSOT |

## Việc Nghĩa

1. UAT H2 + P.A + C (form/%/in).  
2. Khi muốn sửa ROUND SQL GSC → nói «migrate» (Grok soạn migration, không tự apply prod).  
3. «commit» khi chốt các lát trên.

## Wave tiếp (nếu bảo tiếp tục)

- Dọn duplicate section trong `BV103-GSC-KE-HOACH-CHINH-20260917.md`  
- Rà import Excel GSC deprecate stubs  
- NKBV: ẩn hẳn UI infant nếu còn lộ (lát riêng, có UAT)

## Wave 2026-09-17 (tiếp) — dọn dọc

| Việc | Kết quả |
|------|---------|
| Dedup plan §11 | Còn 1 block H2/P.A/C/cleanup (bỏ 9× duplicate) |
| Xóa `CommandCenterRateGlance` + `useCommandCenterBriefData` | Không importer |
| Xóa `decision-queue.ts` + spec | Chỉ còn self-ref sau H2 |
| Xóa thư mục `components/command-center/` rỗng | — |
| BCTH Dimension/Topic % | `formatPercent1/2` thay `` `${n}%` `` |
| GSC navigator + intervention | `gscTyLeFromMatrixCounts` (né ROUND SQL 1 chữ số) |

### NKBV infant (cố ý chưa xóa engine)
- UI Ch.17/SSI đã ép `isInfantLe1={false}`.
- Engine còn map legacy SUTI_2/LCBI_3 + nhánh tuổi — cần lát UAT riêng, không xóa mù.
