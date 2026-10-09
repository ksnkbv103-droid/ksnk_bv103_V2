# HIS / LIS — bước tiếp theo (sau W1–W3) — 2026-07-22

> Không implement trong pilot hiện tại. Spike gốc: [`../../archive/reports/his-lis-integration-spike-20260610.md`](../../archive/reports/his-lis-integration-spike-20260610.md).

## Hiện trạng

- NKBV nhận vi sinh qua **import Excel** + MD5 dedupe + Day-3 server gate.
- Chưa FHIR / HL7 / API vendor.

## Lộ trình đề xuất (khi BV sẵn sàng)

| Phase | Việc | Exit |
|-------|------|------|
| R0 | Workshop IT BV + KSNK + (optional) vendor LIS | Chọn H1 file-drop / H2 HL7 / H3 REST / H4 giữ manual |
| R1 | Nếu H1: đặc tả CSV cột + lịch SFTP + sandbox | Intake `/intake-nv` riêng |
| R2 | Mapping mã xét nghiệm ↔ UTI/BSI/VAE/SSI do KSNK duyệt | Bảng mapping versioned |
| R3 | UAT sandbox: không ghi đè ca đã `XAC_NHAN` | Checklist 3 case |
| R4 | Prod song song Excel 2 tuần rồi cắt dần | Sign-off Trưởng KSNK |

## Tiền đề cứng

- [ ] W1 §E đã ký
- [ ] NKBV UAT #2–#5 Pass
- [ ] SLA + audit log + retry thống nhất với ops ([`incident-backup-playbook.md`](./incident-backup-playbook.md))

## Không làm

- Không migration HIS/LIS trong chat go-live.
- Không thay MDM khoa/phòng bằng master HIS trong pilot.
