# 19 — QLCV · Quản lý công việc khoa KSNK · SSOT

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1.0 draft cho Lead/PO · 2026-09-25 (Asia/Saigon) |
| Chủ sở hữu | KSNK Soft · Domain — BVQY 103 / `ksnk_bv103_V2` · QLCV |
| Phạm vi | DOMAIN ONLY — công việc nội bộ khoa KSNK (+ deep-link analytics nếu code đã có). Không sửa code, không commit, không Cloud, không Word QĐ/QT |
| Ngoài phạm vi | CSSD trạm/mẻ/SC · form GSC/VST (chỉ ghi liên kết menu nếu tạo việc từ analytics) · KH năm/tuần/mốc (đã DROP) |
| Neo pack | `KSNK-DOMAIN-SSOT.md` §4 · `02-entity-list-v2-ssot.md` §4b · `06-data-dictionary-v1.md` §3c · `08-domain-coverage-map-full.md` §6 · macwork `docs/modules/qlcv/*` |
| Trạng thái | **Applied A** 2026-09-25 (Nghĩa skip widget); xem `19b-QLCV-SIMPLIFY-20260925.md` · assignee-first |

## §0. Nguồn (ký hiệu cột «Nguồn»)

| Ký hiệu | Nguồn đã đọc |
|---------|--------------|
| D-PACK | `/workspace/ksnk-domain/` — `KSNK-DOMAIN-SSOT.md`, `02`/`04`/`05`/`06`/`08`/`09`, README |
| MW-DOC | `ksnk_bv103_macwork/docs/modules/qlcv/` (README, pilot-checklist, intake KSNK-only, continuity-matrix) · `docs/core/domain-specification.md` §2.3 · `docs/ssot-map.md` · `docs/wiki/entities.md` · ADR text-check deferred |
| CODE | Đọc tĩnh: `src/lib/domain/qlcv/*`, `src/modules/quan-ly-cong-viec/*`, migrations `*qlcv*` — HEAD `f5ba649` (2026-09-18 07:07 +07). Không sửa `src/` |
| DRV | Drive MCP trong «02. Khuyến cáo…» + «Quy trình…KSNK_final»: **không có QT rõ vòng đời phiếu việc**; BDNL = mô tả vị trí, không neo workflow. Không viện dẫn BYT bịa |

**SSOT trước:** chưa có file `19`. Pack chỉ có **mảnh mỏng** (3 entity + 7 TT + DD rút gọn) + pilot/continuity macwork — thiếu RACI, Q-rules IN/OUT, báo cáo kỳ theo thanh Nghĩa.

## §1. Mục tiêu quan sát (thanh Nghĩa)

Chuẩn mực · khoa học · chính xác · đơn giản · dễ quan sát/thực hiện · **rõ người–việc–tiến độ–trách nhiệm** · thống kê/báo cáo được.

Mỗi phiếu mở trả lời ngay: **ai giao · ai làm · ai duyệt · việc gì · hạn · %/checklist · trạng thái · quá hạn?**

## §2. Entity tối thiểu (giữ vocabulary code)

| Entity | Table / view | Vai trò |
|--------|--------------|---------|
| **CongViec** | `qlcv_fact_cong_viec` · đọc `v_qlcv_cong_viec_full` | Phiếu việc (fact) |
| **CongViecDinhKy** | `qlcv_fact_cong_viec_dinh_ky` | Mẫu → spawn (`fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay`) |
| **NhiemVu** | `qlcv_fact_nhiem_vu` | Mục tiêu độc lập; FK tùy chọn `nhiem_vu_id` trên phiếu |
| NguoiGiao | `nguoi_giao_viec_id` → `mdm_nhan_su` | Người giao / kích hoạt đề xuất |
| NguoiThucHien | `nguoi_phu_trach_id` | Người làm chính (**1**) |
| PhoiHop / TheoDoi | `nguoi_phoi_hop_ids[]` · `nguoi_theo_doi_ids[]` | C / I |
| NguoiDuyet | **không cột** — actor nghiệm thu/phê đề xuất trong `nhat_ky` + RBAC APPROVE | A khi đóng đột xuất/khẩn hoặc phê đề xuất |
| Han/Ky | `han_hoan_thanh` · `ngay_thuc_hien` · `gio_bat_dau`/`gio_ket_thuc` | Hạn + lịch thực hiện |
| TienDo | `phan_tram_hoan_thanh` · `checklist` jsonb · `fn_qlcv_update_checklist` | Tiến độ quan sát |
| KetQua/BangChung | `nhat_ky` jsonb · `hoan_thanh_luc` · `analytics_meta` | Dấu vết đóng / PDCA |
| LienKet | `dinh_ky_mau_id` · `to_cong_tac_id` · `dia_diem_khoa_id` · `vi_tri_thuc_hien` · `?from=analytics` | Menu/module; địa điểm ≠ giao việc ngoài KSNK |
| Loai / UU_TIEN | `loai_cong_viec` ∈ `DINH_KY`\|`DOT_XUAT`\|`KHAN_CAP` · `muc_do_uu_tien` ∈ `THAP`\|`TRUNG_BINH`\|`CAO` | Phân loại |

**Đề xuất:** cùng bảng CongViec với `is_active=false` + `trang_thai=MOI` (lane Kanban ảo «Đề xuất chờ duyệt» — không mã DB riêng).

**Scope runtime:** KSNK-only (`ensureQlcvKsnkAccess`); không giao NV khoa lâm sàng.

## §3. Vòng đời trạng thái (7 mã Track B)

Canonical CHECK / app (`trang-thai-canonical.ts` · mig `20260709140000`):  
`MOI` · `DANG_LAM` · `CHO_DUYET` · `HOAN_THANH` · `TU_CHOI` · `QUA_HAN` · `DA_HUY`.

Alias legacy chỉ đọc: `CHUA_BAT_DAU`→`MOI`; `CHO_NHAN_VIEC`/`DANG_THUC_HIEN`→`DANG_LAM`; `CHO_XAC_NHAN_HOAN_THANH`→`CHO_DUYET`.

| Từ → Đến | IN | OUT |
|----------|----|-----|
| (tạo chỉ huy) → `DANG_LAM` | Có `nguoi_phu_trach_id` KSNK; `is_active=true` | Thiếu phụ trách; NV ngoài KSNK |
| (đề xuất) → `MOI` + `is_active=false` | NV KSNK đề xuất | — |
| Đề xuất → `DANG_LAM` | `fn_qlcv_transition` `PHE_DUYET_DEXUAT` + giao tổ/phụ trách | `TU_CHOI_DEXUAT` → đóng/`DA_HUY` |
| `DANG_LAM` → `CHO_DUYET` | `DOT_XUAT`/`KHAN_CAP` + checklist/% = 100 | Định kỳ vào cổng này |
| Định kỳ @100% → `HOAN_THANH` | `loai_cong_viec=DINH_KY` + tick đủ | Ép nghiệm thu định kỳ |
| Đủ cổng → `HOAN_THANH` | `NGHIEM_THU` + APPROVE + `isEligibleForNghiemThu` | Force đóng khi &lt;100% (trừ đang `CHO_DUYET`) |
| Cổng → `TU_CHOI` | `TU_CHOI_NGHIEM_THU` | — |
| Mở → `QUA_HAN` | Cron `fn_sync_overdue_tasks` khi `han_hoan_thanh` &lt; hôm nay và chưa đóng | Đóng (`HOAN_THANH`/`DA_HUY`) |
| * → `DA_HUY` | Transition hủy (quyền) | — |

**Quá hạn quan sát:** mã `QUA_HAN` **hoặc** cờ view `is_qua_han` **hoặc** hạn đã qua trên phiếu mở — cùng ý «đang làm quá hạn», **không** phải cổng riêng.

**Lane Kanban (continuity):** đóng → đề xuất → quá hạn → chờ nghiệm thu → đang làm.

## §4. RACI tối thiểu

| Vai trò domain | Cột / cơ chế code | R | A | C | I |
|----------------|-------------------|---|---|---|---|
| Người giao | `nguoi_giao_viec_id` (+ tạo/phê đề xuất) | | A (giao đúng người–hạn) | | |
| Người làm | `nguoi_phu_trach_id` | **R** | | | |
| Phối hợp | `nguoi_phoi_hop_ids` | | | **C** | |
| Theo dõi | `nguoi_theo_doi_ids` | | | | **I** |
| Người duyệt | Actor `nhat_ky` + RBAC APPROVE | | **A** (nghiệm thu đột xuất/khẩn; phê đề xuất) | | |
| Xem / thống kê | List + gate chips + `v_qlcv_cong_viec_qua_han` | | | | **I** (lãnh đạo khoa) |

`to_cong_tac_id` = nhóm thực hiện — không thay phụ trách cá nhân khi đã giao.

## §5. Quy tắc Q-xx (≤20)

| ID | Mức | Quy tắc | IN | OUT | Nguồn |
|----|-----|---------|----|-----|-------|
| Q-01 | P0 | Scope **chỉ khoa KSNK** — giao/phụ trách/đề xuất ∈ NV KSNK | `ensureQlcvKsnkAccess` + validate | Giao khoa lâm sàng | MW intake · CODE |
| Q-02 | P0 | Phiếu active: có **việc** (`tieu_de`) + **người làm** khi đang thực hiện | `DANG_LAM` + `nguoi_phu_trach_id` | `DANG_LAM` không phụ trách | Pilot Q1 · Nghĩa |
| Q-03 | P0 | **Người giao** ghi khi tạo/phê đề xuất | `nguoi_giao_viec_id` | Phiếu active không rõ ai giao | Continuity · Nghĩa |
| Q-04 | P0 | **Hạn** bắt buộc với `DOT_XUAT`/`KHAN_CAP`; định kỳ = ngày instance/`han_hoan_thanh` spawn | Có `han_hoan_thanh` khi không định kỳ | Việc mở không hạn | Domain (AB-4 nếu nới) |
| Q-05 | P0 | Tiến độ = checklist và/hoặc `%`; đột xuất/khẩn @100% → `CHO_DUYET` | `fn_qlcv_update_checklist` | `HOAN_THANH` tay khi &lt;100% | Continuity · nghiem-thu-gate |
| Q-06 | P0 | Định kỳ @100% → `HOAN_THANH` tự (không nghiệm thu) | `DINH_KY` | Ép `CHO_DUYET` định kỳ | dinh-ky-auto-complete · Pilot Q3c |
| Q-07 | P0 | Nghiệm thu chỉ khi đủ cổng (`CHO_DUYET` hoặc đang làm/`QUA_HAN` @100%) | APPROVE + `isEligibleForNghiemThu` | Nghiệm thu sớm | nghiem-thu-gate |
| Q-08 | P0 | Chuyển cổng (phê đề xuất, nghiệm thu, từ chối, hủy) qua `fn_qlcv_transition` + `nhat_ky` | Có entry nhật ký | Sửa `trang_thai` ngoài transition | Continuity |
| Q-09 | P0 | Quá hạn: hệ thống đánh dấu; vẫn làm/nghiệm thu khi đủ % | Cron + `is_qua_han` | Ẩn quá hạn khỏi quan sát | sync overdue · board |
| Q-10 | P0 | Đề xuất: `is_active=false` đến khi phê + giao phụ trách | Lane đề xuất | Làm trên đề xuất chưa duyệt | Pilot Q2 |
| Q-11 | P0 | Spawn định kỳ idempotent `(dinh_ky_mau_id, han_hoan_thanh)` | 1 instance/ngày đến hạn | Trùng spawn | Spawn RPC |
| Q-12 | P1 | Địa điểm: `dia_diem_khoa_id` + `vi_tri_thuc_hien` khi gắn nơi làm — không phá KSNK-only | Ghi nơi thực hiện | Coi địa điểm = khoa được giao ngoài KSNK | assignment fields |
| Q-13 | P1 | `NhiemVu` độc lập; FK optional — **không** khôi phục KH năm/tuần/mốc | Optional FK | Container kế hoạch cũ | DROP `20260802140000` · 09-gap |
| Q-14 | P0 | Báo cáo kỳ đếm được: theo người · trạng thái · quá hạn · đúng hạn | Aggregate fact/view | Chỉ cảm tính Kanban | §6 · Nghĩa |
| Q-15 | P1 | `analytics_meta` / deep-link = nguồn tạo việc PDCA — không thay RACI phiếu | Meta optional | Báo cáo GS thay QLCV | mig analytics_meta |
| Q-16 | P1 | Không soft-warn domain; thiếu P0 → chặn hành động (implement) | — | Lecture UI | PO style 17b |

## §6. Báo cáo / thống kê bắt buộc

| Báo cáo | Cắt | Cột tối thiểu | Ai dùng |
|---------|-----|---------------|---------|
| Việc theo người | Kỳ (tuần/tháng/quý) | Phụ trách · mở · quá hạn · hoàn thành · đúng hạn | Lãnh đạo khoa / tổ |
| Việc theo trạng thái | Thời điểm / kỳ | 7 mã + đề xuất (`is_active=false`) | Điều hành |
| Quá hạn | Thời điểm | Việc · hạn · phụ trách · người giao · % | Chỉ huy |
| Đúng hạn / trễ | Kỳ đóng | `hoan_thanh_luc` vs `han_hoan_thanh` | Thống kê |
| Định kỳ tuân thủ | Kỳ | Mẫu · spawn · hoàn thành | Quản lý mẫu |

**Hiện có (code):** gate chips (của tôi / cần làm / quá hạn / chờ tôi); `v_qlcv_cong_viec_qua_han`; brief CC — **chưa** đủ báo cáo kỳ §6 → gap P0 vs Nghĩa.

## §7. A/B (Domain khuyến nghị = A)

| # | Câu hỏi | **A (Domain khuyến nghị)** | B |
|---|---------|---------------------------|---|
| AB-1 | `QUA_HAN` lưu hay chỉ cờ? | **Giữ mã lưu + cờ `is_qua_han`** (khớp code/cron); diễn giải = «đang làm quá hạn», không cổng riêng | Bỏ mã `QUA_HAN`; chỉ derived flag (đổi CHECK) |
| AB-2 | Người duyệt có cột? | **Không thêm cột** — actor trong `nhat_ky` + APPROVE; list hiện «duyệt cuối» từ nhật ký | Thêm `nguoi_duyet_id` bắt buộc lúc giao |
| AB-3 | Định kỳ đủ checklist? | **Tự `HOAN_THANH`** (giữ code) | Luôn qua `CHO_DUYET` như đột xuất |
| AB-4 | Hạn bắt buộc? | `DOT_XUAT`/`KHAN_CAP`: **bắt buộc**; định kỳ = ngày instance | Hạn luôn optional |
| AB-5 | `NhiemVu`? | **Giữ entity độc lập** + FK optional | Gộp tag trên CongViec, DROP bảng |
| AB-6 | Scope mạng lưới? | **KSNK-only** (giữ intake) | Cho ML làm phụ trách/theo dõi |

## §8. Gap vs code (đọc tĩnh) và vs thanh Nghĩa

| Gap | Mức | Ghi chú |
|-----|-----|---------|
| Chưa có neo SSOT QLCV đủ RACI/Q-rules/báo cáo | P0 domain | File này bổ sung; `02`/`06` chỉ skeleton |
| Báo cáo kỳ (người–việc–đúng hạn) chưa SSOT / UI mỏng | P0 vs Nghĩa | Có gate + quá hạn; thiếu bảng kỳ |
| Người duyệt không cột → khó «rõ trách nhiệm duyệt» trên list | P1 | AB-2A: derive từ `nhat_ky` |
| `QUA_HAN` vừa mã vừa cờ — dễ lẫn cổng | P1 | AB-1A + §3 |
| `04`/`05` pack không có process/use-case QLCV | P1 | Neo bằng file 19; chưa viết lại 04/05 |
| DD `06` thiếu cột assignment (phối hợp/theo dõi/địa điểm/`nhat_ky`) | P1 | Align khi cập nhật DD |
| QT viện neo phân công việc khoa | — | DRV thiếu QT rõ → không bịa BYT |

## §9. Liên kết menu / ngoài QLCV

- Route app: `/quan-ly-cong-viec`.
- Deep-link analytics/TGS gap → tạo việc + `analytics_meta` (không mở domain GSC/CSSD).
- Không điều khiển trạm CSSD hay phiên GSC từ QLCV.

---

*Mirror đồng nhất: `ksnk_bv103_macwork/docs/modules/qlcv/19-QLCV-DOMAIN-SSOT.md`.*
