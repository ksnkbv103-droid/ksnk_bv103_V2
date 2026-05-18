import { z } from "zod";
import {
  cssdIncidentReportInputSchema,
  type CssdIncidentReportInput,
} from "@/modules/cssd-su-co/contracts/su-co-report-input.schema";

export { cssdIncidentReportInputSchema, type CssdIncidentReportInput };

export const cssdMaintenanceStartInputSchema = z.object({
  thiet_bi_id: z.string().trim().optional(),
  ma_thiet_bi_hoac_qr: z.string().trim().optional(),
  ly_do: z.string().trim().min(1, "Nhập lý do / nội dung bảo trì."),
});

export type CssdMaintenanceStartInput = z.infer<typeof cssdMaintenanceStartInputSchema>;
