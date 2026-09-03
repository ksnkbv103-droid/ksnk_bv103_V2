import { z } from "zod";

const stationEnum = z.enum(["TIEP_NHAN", "LAM_SACH", "QC", "DONG_GOI", "TIET_KHUAN", "CAP_PHAT"]);

const incidentGroupSchema = z.enum([
  "PROCESS",
  "INSTRUMENT",
  "CHEMICAL",
  "EQUIPMENT",
  "OTHER",
]);

const causeClassSchema = z.enum(["SC_QUY_TRINH", "SC_CHU_QUAN", "SC_HE_THONG"]);

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

const setReconcileLineSchema = z.object({
  chiTietId: z.string().uuid().optional(),
  loaiDungCuId: z.string().uuid().optional(),
  maLoai: z.string().trim().optional(),
  tenDungCuLe: z.string().trim().min(1),
  soLuongChuan: z.number().int().min(0).max(999),
  soLuongThucTe: z.number().int().min(0).max(999),
  soLuongDem: z.number().int().min(0).max(999),
  soLuongChuanDeXuat: z.number().int().min(0).max(999).optional(),
  loaiDungCuIdDeXuat: z.string().uuid().optional(),
  maLoaiDeXuat: z.string().trim().optional(),
  tenDungCuLeDeXuat: z.string().trim().optional(),
  maKhac: z.string().trim().max(80).optional(),
  maKhacGoc: z.string().trim().max(80).optional(),
  maQrDen: z.string().trim().toUpperCase().optional(),
  kind: z.enum([
    "KHOP",
    "HONG",
    "MAT",
    "BO_SUNG",
    "TRA_KHO",
    "DOI_CHUAN",
    "DOI_LOAI",
    "DIEU_CHUYEN",
    "THEM_DONG",
    "XOA_DONG",
  ]),
  note: z.string().trim().max(300).optional(),
});

export const setReconcilePayloadSchema = z.object({
  boDungCuId: z.string().uuid(),
  draftIncidentId: z.string().uuid().optional(),
  quyTrinhId: z.string().uuid().optional().nullable(),
  maBo: z.string().trim().optional(),
  tenBo: z.string().trim().optional(),
  lines: z.array(setReconcileLineSchema).min(1).max(200),
});

/** PROCESS: gắn mẻ / bước — mirror cấu trúc instrumentPayload (không ledger). */
const processIncidentPayloadSchema = z.object({
  loTietKhuanId: z.string().uuid().optional(),
  maLo: z.string().trim().max(80).optional(),
  quyTrinhId: z.string().uuid().optional().nullable(),
});

export const cssdIncidentReportInputSchema = z.object({
  maQR: z.string().trim().toUpperCase().optional(),
  station: stationEnum,
  incidentGroup: incidentGroupSchema,
  typeId: z.string().trim().min(1, "Thiếu tình huống cụ thể."),
  typeTen: z.string().trim().min(1, "Thiếu tên tình huống cụ thể."),
  causeClass: causeClassSchema.optional(),
  faultStation: stationEnum.optional(),
  faultOperator: z.string().trim().max(150).optional(),
  faultOperatorId: z.string().uuid().optional(),
  nguoiPhatHien: z.string().trim().max(150).optional(),
  nguoiPhatHienId: z.string().uuid().optional(),
  thoiGianPhatHien: z.string().trim().max(40).optional(),
  desc: z.string().trim().min(1, "Thiếu mô tả sự cố."),
  errorQR: z.string().trim().optional(),
  machineId: z.string().trim().optional(),
  anhMinhChung: z.string().trim().optional(),
  instrumentPayload: instrumentIncidentPayloadSchema.optional(),
  setReconcilePayload: setReconcilePayloadSchema.optional(),
  processPayload: processIncidentPayloadSchema.optional(),
  /** G11: user đã xác nhận lập phiếu thứ hai cùng mẻ + bộ + loại. */
  confirmDuplicate: z.boolean().optional(),
});

export type CssdIncidentReportInput = z.infer<typeof cssdIncidentReportInputSchema>;

