# Unified Engineering Standard BV103

Cap nhat: 08/05/2026

Muc tieu: gom tinh hoa tu AGENTS, rules, skills thanh mot bo chuan ngan gon de giam roi, giam loi va tang toc do ra san pham.

## Core 10 Rules (bat buoc)

1. Contract-first: module moi phai co `types.ts` truoc.
2. Migration-then-code: khong viet action cho bang chua co migration.
3. One Screen = One Query Contract: man chinh toi da 1-2 read action.
4. One Permission Call: `verifyPermissions` 1 lan/luong.
5. One Pagination Standard: list `fact_*` bat buoc server pagination (mac dinh 20).
6. DB does heavy lifting: join/group/rate/rank dat tai View/RPC neu co pain do duoc.
7. Zod at boundary: moi input user/form/url validate tai server action.
8. Feature-first delivery: dung luong nghiep vu truoc, polish UI sau.
9. Small reversible changes: PR nho, co rollback nhanh.
10. Measure before optimize: moi toi uu phai co baseline va so do truoc/sau.

## Hop dong trien khai

- Moi task phai chi ro: module, rule chi phoi, KPI muc tieu.
- Moi module chi xong khi build pass + khong con fetch full list `fact_*` + co so do cai thien.
- Neu 2 ngay lien tiep KPI khong tang, dung mo rong scope va chot debt tai cho.

## Kiem soat roi/loi

- Khong bat nhieu skill cung luc neu khong can.
- Khong refactor co hoc theo thu muc neu khong co pain do duoc.
- Uu tien lat cat doc theo bounded context, khong big-bang.

## Tai lieu lien ket

- `AGENTS.md`
- `docs/specs/READ_MINIMUM_BY_CHANGE.md`
- `docs/specs/10-bv103-implementation-mapping.md`
- `docs/specs/SMART_DB_PRAGMATIC_PLAYBOOK.md`
- `docs/specs/README.md` (router tài liệu)
