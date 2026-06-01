import { z } from "zod";

const stationEnum = z.enum(["TIEP_NHAN", "LAM_SACH", "QC", "DONG_GOI", "TIET_KHUAN", "CAP_PHAT"]);

export const incidentGroupSchema = z.enum([
  "PROCESS",
  "INSTRUMENT",
  "CHEMICAL",
  "EQUIPMENT",
  "OTHER",
]);

export const cssdIncidentReportInputSchema = z.object({
  maQR: z.string().trim().toUpperCase().optional(),
  station: stationEnum,
  incidentGroup: incidentGroupSchema,
  typeId: z.string().trim().min(1, "Thiếu loại sự cố."),
  typeTen: z.string().trim().min(1, "Thiếu tên loại sự cố."),
  faultStation: stationEnum.optional(),
  faultOperator: z.string().trim().max(150).optional(),
  desc: z.string().trim().min(1, "Thiếu mô tả sự cố."),
  errorQR: z.string().trim().optional(),
  machineId: z.string().trim().optional(),
  anhMinhChung: z.string().trim().optional(),
});

export type CssdIncidentReportInput = z.infer<typeof cssdIncidentReportInputSchema>;

