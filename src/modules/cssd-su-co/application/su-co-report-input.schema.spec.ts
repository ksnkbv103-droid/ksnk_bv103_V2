import { describe, expect, it } from "vitest";
import { cssdIncidentReportInputSchema } from "../contracts/su-co-report-input.schema";

/**
 * NEN-016 lát D: `faultOperatorId` (người gây lỗi) và `nguoiPhatHienId` (người phát hiện) là id nhân sự (mdm_nhan_su).
 * Zod 4 `.uuid()` kiểm RFC nên từ chối id seed; cột Postgres `uuid` chấp nhận mọi dạng 8-4-4-4-12 hex.
 */
describe("cssdIncidentReportInputSchema — id nhân sự (NEN-016 D)", () => {
  const SEED = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
  const V4 = "3f2b8c1e-9a4d-4e6b-8c2f-1d5a7b9e0c34";
  const base = {
    station: "LAM_SACH" as const,
    incidentGroup: "PROCESS" as const,
    typeId: "T1",
    typeTen: "Sai bước",
    desc: "Mô tả sự cố",
  };
  const FIELDS = ["faultOperatorId", "nguoiPhatHienId"] as const;

  it.each(FIELDS)("%s nhận id seed không chuẩn RFC và UUID v4", (field) => {
    expect(cssdIncidentReportInputSchema.safeParse({ ...base, [field]: SEED }).success).toBe(true);
    expect(cssdIncidentReportInputSchema.safeParse({ ...base, [field]: V4 }).success).toBe(true);
  });

  it.each(FIELDS)("%s bỏ trống vẫn hợp lệ, chuỗi rác bị từ chối", (field) => {
    expect(cssdIncidentReportInputSchema.safeParse(base).success).toBe(true);
    expect(cssdIncidentReportInputSchema.safeParse({ ...base, [field]: "khong-phai-uuid" }).success).toBe(false);
  });
});
