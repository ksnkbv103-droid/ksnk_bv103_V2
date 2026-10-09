# 18b — CSSD phiếu mẻ · nhắc AB-1…6 (Domain default A) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Neo | `18-CSSD-PHIEU-ME-TIET-KHUAN-SSOT.md` §5; backlog CSSD-L06 |
| Trạng thái | **PO chốt A ×6** 2026-09-28 02:38 +07 — Soft harden M-01…M-27 P0 theo A |
| Không | Invent quy tắc lâm sàng mới; sửa code |

## Bảng nhắc (một trang)

| # | Câu hỏi ngắn | Domain A | Lý do anti-bias (1 dòng) |
|---|--------------|----------|---------------------------|
| AB-1 | Mẻ KHÔNG ĐẠT → bộ về đâu? | Về `TIEP_NHAN` (làm sạch lại như bẩn) | Khớp QT21; B = về `DONG_GOI` (code cũ) lệch «xử lý lại» |
| AB-2 | Implant gấp chưa có BI? | Chặn cứng, không nhả khẩn trên Soft | An toàn tử số/implant; B = nhả khẩn phụ thuộc kỷ luật |
| AB-3 | Phạm vi thu hồi BI (+)? | Conservative **mọi PP**: từ BI (−) gần nhất → BI (+) | CDC conservative; B hẹp hơi nước dễ bỏ sót |
| AB-4 | Plasma/EO nhả khi nào? | Chờ BI (−) (`CHO_BI`) rồi mới nhả | QT23 «sinh học đạt khi áp dụng»; B nhả sớm → M-23 muộn |
| AB-5 | Bộ sai PP vào phiếu hơi nước? | Chặn cứng **khi quét** vào phiếu | Sớm hơn nút Bắt đầu; B để vào phiếu rồi mới chặn |
| AB-6 | Ai được «Nhả mẻ»? | NV/QC có quyền nhả thường; **chỉ tổ trưởng** nhả implant/`CHO_BI` | Ít tắc ca thường; B = chỉ tổ trưởng mọi mẻ → tắc ops |

**Nguồn A/B nguyên văn:** neo 18 §5. Soft harden M-01…M-27 P0 **sau** PO chọn (hoặc xác nhận default A).


## PO chốt

**A ×6** (AB-1…6) — 2026-09-28. Soft implement; không invent ngoài neo 18.

## Soft map (không invent — 2026-09-28 Soft)

| AB | Soft evidence |
|----|---------------|
| AB-1 | `recallTargetStationForLotMember` → `TIEP_NHAN` · `rpc_cssd_me_thu_hoi` |
| AB-2 | `evaluateMeQcRelease` → `CHO_BI`; `assertImplantReleaseWithoutBiBlocked`; **no** emergency API |
| AB-3 | `selectBiRecallBatchIds` (machine window, mọi PP) |
| AB-4 | `biRequiredForBatch` Plasma/EO/implant → `CHO_BI` |
| AB-5 | `assertKitFitsSterilizerMethod` + `fn_cssd_me_ly_do_lech_phuong_phap` on scan/add |
| AB-6 | `requiresToTruongReleaseRight` → `verifyCssdBatchQc` (`CSSD_ME_TIET_KHUAN.qc` = tổ trưởng) |

Audit: `docs/modules/_audit/_audit-soft-cssd-phieu-me-18b-2026-09-28.md`.
