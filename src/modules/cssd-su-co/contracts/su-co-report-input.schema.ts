import { z } from "zod";

const stationEnum = z.enum(["TIEP_NHAN", "LAM_SACH", "QC", "DONG_GOI", "TIET_KHUAN", "CAP_PHAT"]);

const incidentGroupSchema = z.enum([
  "PROCESS",
  "INSTRUMENT",
  "CHEMICAL",
  "EQUIPMENT",
  "OTHER",
]);

const instrumentIncidentPayloadSchema = z.object({
  chiTietId: z.string().uuid().optional(),
  loaiDungCuId: z.string().uuid().optional(),
  boDungCuId: z.string().uuid().optional(),
  quyTrinhId: z.string().uuid().optional().nullable(),
  maQrNguon: z.string().trim().toUpperCase().optional(),
  maQrDen: z.string().trim().toUpperCase().optional(),
  tenDungCuLe: z.string().trim().optional(),
  quantity: z.number().int().positive().max(99).optional(),
  note: z.string().trim().max(500).optional(),
});

export const cssdIncidentReportInputSchema = z.object({
  maQR: z.string().trim().toUpperCase().optional(),
  station: stationEnum,
  incidentGroup: incidentGroupSchema,
  typeId: z.string().trim().min(1, "Thiếu tình huống cụ thể."),
  typeTen: z.string().trim().min(1, "Thiếu tên tình huống cụ thể."),
  faultStation: stationEnum.optional(),
  faultOperator: z.string().trim().max(150).optional(),
  nguoiPhatHien: z.string().trim().max(150).optional(),
  thoiGianPhatHien: z.string().trim().max(40).optional(),
  desc: z.string().trim().min(1, "Thiếu mô tả sự cố."),
  errorQR: z.string().trim().optional(),
  machineId: z.string().trim().optional(),
  anhMinhChung: z.string().trim().optional(),
  instrumentPayload: instrumentIncidentPayloadSchema.optional(),
});

export type CssdIncidentReportInput = z.infer<typeof cssdIncidentReportInputSchema>;

