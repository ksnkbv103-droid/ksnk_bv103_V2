# Soft audit — L11 hydrate prior_open_vae_doe + L07 ba_ngay residual — 2026-09-28

| Tip | `7f0fc61` + Soft Soft Soft-local (prior 25c/L04/L11 core + this beat) |
| Neo | SSOT §C.4.10.4 Event Period · Domain A L07 incomplete grid · backlog L11/L07 |
| Không | commit / push / prod migrate / invent CDC / reuse RIT Ch.2 cho VAE |

## L11 — hydrate Soft Soft Soft-safe

| Lát | Status |
|-----|--------|
| Engine gate `evaluateVaeEventPeriodSuppress` + field | Prior beat |
| `prior_open_vae_doe` trên **VaeVerificationData** (không còn nhầm `VaeVentDailyParam`) | Fixed |
| `hydratePriorOpenVaeDoe` / `priorCasesToPriorVaesForEventPeriod` | New |
| `resolveDoeBelongsPriorEvent` VAE → Event Period (label không RIT) | Wired |
| Open-session belongs VAE → Event Period | Wired |
| `DA_PHAN_TICH` VAE fallback `findPriorVaeEventPeriodOwner` | Wired |
| Write submit: load siblings cùng BA → hydrate trước `evaluateVaeVap` | Wired |
| RIT Ch.2 | VAE vẫn bypass (`findPriorRitOwner` → null) |

## L07 — ba_ngay / LOA (verify tip overnight + residual)

| Lát | Status |
|-----|--------|
| `attributeLocationOfAttribution` empty grid → null + warn reason | Tip overnight |
| Stay table empty-row warn | Tip overnight |
| Không silent default single-stay / fallback khoa ghi nhận | Tip overnight |
| Submit: warn khi lưới trống / chưa quy kết LOA; cho phép xóa hết stay | Residual Soft Soft Soft-safe this beat |
| Hard-error «phải ≥1 khoa» khi xóa | Removed (L07 Domain A) |

## Tests

- `nkbv-vae-event-period.spec.ts` (+ hydrate)
- `nkbv-index-event-disposition.spec.ts` (L11 Event Period BELONGS)
- `nkbv-rules-engine.spec.ts` L11 suppress
- `nkbv-timeline-math.spec.ts` L07 empty grid

## UAT ngắn

1. BA có VAC DOE D0 → mở phân tích VAE DOE D+5 → BELONGS Event Period / evaluate `EVENT_PERIOD_SUPPRESS` (không RIT toast).
2. DOE D+14 → cho VAE mới.
3. Hub ba_ngay trống → metrics không gán LOA; toast warn; attributed_khoa rỗng khi lưu.
