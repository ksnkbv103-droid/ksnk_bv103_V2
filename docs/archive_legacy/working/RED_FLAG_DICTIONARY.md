# Red Flag Dictionary

> **Neo:** Ma loi thong nhat voi action/UI; khong rac string magic — xem [`PREP0_CONTRACT_PACK.md`](./PREP0_CONTRACT_PACK.md).

Cap nhat: 28/04/2026  
Nguon tham chieu: [`../legacy-only/DATA_FLATTEN_REFERENCE.md`](../legacy-only/DATA_FLATTEN_REFERENCE.md) (RedFlag schemas/webhook) + `PROGRESS_REPORT.md` (root) (incident + rollback)

## 1) Muc tieu
- Chot bo ma loi nghiem trong de trigger canh bao.
- Lam nguon duy nhat cho logic alert, bao cao va thong bao webhook.

## 2) Nhom ma loi uu tien khoi tao

| Error code | Module | Mo ta ngan |
|---|---|---|
| `ERR_HH_MISSED_BEFORE_ASEPTIC` | HandHygiene | Bo sot VST truoc thao tac vo khuan |
| `ERR_HH_GLOVE_ABUSE` | HandHygiene | Lam dung gang thay cho VST |
| `ERR_WASTE_MIXED_INFECTIOUS_INTO_GENERAL` | WasteManagement | Rac lay nhiem bo sai thung |
| `ERR_WASTE_MIXED_GENERAL_INTO_INFECTIOUS` | WasteManagement | Rac sinh hoat bo vao thung lay nhiem |
| `ERR_LINEN_SHAKING_IN_AIR` | LinenManagement | Giu vai ban trong khong khi |
| `ERR_LINEN_MIXED_TRANSPORT_CART` | LinenManagement | Tron luong van chuyen do vai ban/sach |
| `ERR_INJ_RECAPPING_TWO_HANDS` | InjectionSafety | Day nap kim bang 2 tay |
| `ERR_INJ_BENDING_OR_REMOVING_NEEDLE` | InjectionSafety | Be cong/thao roi kim bang tay |

## 3) Trigger rule co ban
- Trigger alert khi:
  - tieu chi co `is_red_flag = true`
  - va ket qua danh gia = `KhongDat`
- Payload canh bao can co toi thieu:
  - thoi gian
  - khoa/phong
  - nguoi vi pham (hoac id)
  - nguoi giam sat
  - danh sach ma loi vi pham

## 4) Webhook contract toi thieu
- Method: `POST`
- Body (JSON):
  - `level`: `CRITICAL_RED_FLAG`
  - `timestamp`
  - `department`
  - `violator`
  - `observer`
  - `violations` (array error codes)
  - `message`

## 5) Gate truoc release
- [ ] Khong hard-code text loi trong UI; dung dictionary.
- [ ] Rule trigger duoc test voi 3 tinh huong: co trigger, khong trigger, trigger nhieu ma loi.
- [ ] Co log audit cho moi alert gui di.
- [ ] Error code trong DB/UI/report thong nhat 100%.
