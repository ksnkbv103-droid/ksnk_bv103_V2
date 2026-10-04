-- CSSD-02: vòng đời phiếu sự cố — trạng thái ĐÃ ĐÓNG (giải phóng).
-- Trạng thái cất trong attributes.INCIDENT_STATUS (không cột enum riêng).
-- Giá trị hợp lệ: OPEN | DA_XAC_NHAN | DA_DONG | VO_HIEU.
-- Audit đóng: INCIDENT_CLOSED_AT, INCIDENT_CLOSED_BY_*, INCIDENT_CLOSE_REASON, INCIDENT_CLOSE_BIEN_BAN.
-- Quyền tạm (app): ADMIN | HOI_DONG_KSNK | TRUONG_CSSD.
-- File-only / chưa apply trên local trừ khi PO ra lệnh migrate.

COMMENT ON TABLE public.cssd_fact_su_co IS
  'Sự cố CSSD — attributes.INCIDENT_STATUS: OPEN | DA_XAC_NHAN | DA_DONG (giải phóng) | VO_HIEU';
