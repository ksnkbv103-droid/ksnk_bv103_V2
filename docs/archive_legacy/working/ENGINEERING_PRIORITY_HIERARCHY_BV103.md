# Engineering Priority Hierarchy BV103

Cap nhat: 08/05/2026

Tai lieu nay khoa thu tu uu tien de tranh xung dot huong dan.

## Thu tu uu tien (cao -> thap)

1. `AGENTS.md`
2. `.cursor/rules/*.mdc` (noi bo BV103)
3. `docs/specs/*` (router + mapping + governance)
4. Rule/skill external (chi bo tro ky thuat)

Neu co mau thuan: lop thap hon vo hieu.

## Cach ap dung trong moi task

- Buoc 1: chi ro file/rule nao la SSOT.
- Buoc 2: map thay doi vao `UI -> Action -> DB`.
- Buoc 3: neu dung DB/migration, bat buoc doi chieu `10-bv103-implementation-mapping.md`.
- Buoc 4: verify bang build + KPI.

## Cac anti-pattern can cam

- Dua quy tac external len tren AGENTS/rules noi bo.
- Suy schema moi tu tai lieu legacy/pseudo-ERD.
- Toi uu hoa khi khong co pain do duoc.
