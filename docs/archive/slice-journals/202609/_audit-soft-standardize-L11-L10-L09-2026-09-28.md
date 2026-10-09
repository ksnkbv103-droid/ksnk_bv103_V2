# Soft audit — NKBV L11/L10/L09 deep (after Soft Soft-queue 25c/L04) — 2026-09-28

| Tip | `7f0fc61` + Soft Soft-local uncommitted |
| Neo | SSOT §C.4.10.4 / C.4.8 #8–9 · §C.5.9 / 9.2 Reset SP · §0.3 Pediatric OUT · backlog 21 L09–L11 |

## Deep vs SSOT (not superficial)

### L11 VAE Event Period — **IMPLEMENTED Soft Soft-safe**

| SSOT lock | Tip before | Soft Soft-safe now |
|-----------|------------|--------------------|
| §C.4.10.4 Khóa 14d từ DOE — không VAE mới chồng | `vaeEventPeriod` chỉ dùng Secondary PVAP; **evaluate*** không suppress ca mới | `evaluateVaeEventPeriodSuppress` + gate đầu `useVaePathway`; field `prior_open_vae_doe` |
| Secondary chỉ PVAP + máu ∈ Event Period | Đã có | Giữ — không đổi |
| **Không** = RIT Ch.2 | `findPriorRitOwner` có thể lẫn VAE | `sampleMajor === "VAE" → null` (bypass RIT); Event Period riêng |
| DOE = day 1 → end DOE+13 | `vaeEventPeriod` OK | Spec DOE+5 suppress · DOE+14 allow |

Files: `lib/nkbv-vae-event-period.ts` (+spec) · `nkbv-rules-engine.ts` · `types/nkbv-verification.ts` · `nkbv-index-event-disposition.ts` (VAE bypass RIT).

Bridge hydrate `prior_open_vae_doe` từ prior events = **DONE Soft Soft Soft-safe** (see `_audit-soft-L11-hydrate-L07-2026-09-28.md`).

### L10 SSI SP reset — **PARK**

| SSOT | Tip evidence |
|------|----------------|
| §9.2 / neo «Reset SP»: mổ NHSN mới cùng vết → SP từ mổ mới | Chỉ **một** `surgery_date` trên `SsiVerificationData` / form |
| C.5.9 fields tối thiểu | `procedure_code_nhsn`, `surgery_date`, … — **không** `procedure_history[]` / `same_incision` |
| Soft rule | Park — không invent UX «cùng vết» |

### L09 infant strip — **VERIFY tip**

| Tip | Status |
|-----|--------|
| `infantGasOk = true` residual | **Already absent** on tip `7f0fc61` (overnight Soft) |
| `isInfantLe1FromAge` → luôn false | Đã deprecated |
| Taxonomy legacy SUTI_2/LCBI_3 read-map | Giữ read-compat (không emit mới) — OK Pediatric OUT |

Không fan-out refactor rộng thêm trong lát này.

### L07 ba_ngay — verify vs 20c

20c Transfer multi-khoa đã trên tip overnight. Incomplete-grid warn (L07 Domain A) = **DONE Soft Soft Soft-safe residual** (tip overnight + submit/delete warn this beat).

## Tests

- `nkbv-vae-event-period.spec.ts`
- rules-engine L11 addendum (EVENT_PERIOD_SUPPRESS / VAC after 14d)
- cssd-state-engine toast Kiểm bộ
- me-tiet-khuan-ab-gates AB-6 (pre-existing)

## Không

commit / push / prod migrate / invent CDC / MBI / APRV.
