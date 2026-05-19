# Engineering KPI Baseline BV103

Cap nhat: 08/05/2026 — chot sau dot tinh gon ke hoach 14 ngay (static scan + huong dan do runtime).

## Hot paths

1. Dashboard compliance (`/?dash=compliance`)
2. NKBV list (`/giam-sat-nkbv`)
3. VST history (`/giam-sat-vst/lich-su`)
4. CSSD kho hoa chat (`/cssd-erp/kho-hoa-chat`)
5. Cong viec (`/quan-ly-cong-viec`)

## Baseline codebase (snapshot — `npm run engineering:baseline`)

| Chi so | Gia tri (08/05/2026, sau phase tinh gon) |
|--------|----------------------|
| Action files (`*.actions.ts` trong `src/modules`) | 108 |
| Read action files (`*read.actions.ts`) | 12 |
| `verifyPermission(` calls (tong) | 153 |
| `verifyPermissions(` calls (tong) | 1 |
| `.range(` | 8 |
| `.limit(` | 31 |
| `.rpc(` | 10 |
| List `fact_*` read khong range/limit/rpc (canh bao gate) | 0 |

**Ghi chu:** p95 thoi gian trang, so API call runtime, error rate can do tren staging (Chrome DevTools Performance / Lighthouse, hoac Vercel Speed Insights). Dien vao bang duoi khi co so lieu.

## Bang KPI runtime (TBD tren moi truong that)

| Route | p95 load (ms) | API calls | Query count (server) | Error rate | Click to complete |
|---|---:|---:|---:|---:|---:|
| `/?dash=compliance` | TBD | TBD | TBD | TBD | TBD |
| `/giam-sat-nkbv` | TBD | TBD | TBD | TBD | TBD |
| `/giam-sat-vst/lich-su` | TBD | TBD | TBD | TBD | TBD |
| `/cssd-erp/kho-hoa-chat` | TBD | TBD | TBD | TBD | TBD |
| `/quan-ly-cong-viec` | TBD | TBD | TBD | TBD | TBD |

## Sau dot trien khai (static — chay lai `verify:engineering`)

- Cap nhat lai bang snapshot sau moi phase lon.
- Muc tieu: `verifyPermission` giam danh gianh cho `verifyPermissions` theo luong; giu `Potential full fact reads = 0`.

## Nguong dat

- p95 route nong < 600ms hoac cai thien >= 30% so voi baseline runtime.
- 100% list `fact_*` hot path: server pagination mac dinh **20** (`FACT_LIST_DEFAULT_PAGE_SIZE`).
- Khong tang loi type/lint sau moi PR phase.

## Backlog P0 / P1 / P2 (con lai sau chuan hoa dot nay)

| Muc | Noi dung |
|-----|----------|
| P0 | Giam `verifyPermission` lap trong cung request: chuyen dan sang `verifyPermissions([...])` theo man (Dashboard, MDM). |
| P1 | `getVSTSessions` legacy (full list) da gioi han 100 dong — neu con route dung, chuyen het sang `getVSTSessionsPaginated`. |
| P1 | Module quan tri: dan import sang `@/modules/quan-tri-he-thong/actions/read.actions` / `write.actions` theo tung PR nho. |
| P2 | Giam LOC view > 180 dong theo `.cursor/rules/30` khi cham file. |

## Chu ky cap nhat

- Hang tuan: `WEEKLY_ENGINEERING_REVIEW_BV103.md` + chay `npm run verify:full`.
