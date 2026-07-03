import { z } from "zod";
import { type CssdIncidentReportInput } from "@/modules/cssd-su-co/contracts/su-co-report-input.schema";

export { type CssdIncidentReportInput };

export const cssdMaintenanceStartInputSchema = z.object({
  thiet_bi_id: z.string().trim().optional(),
  ma_thiet_bi_hoac_qr: z.string().trim().optional(),
  ly_do: z.string().trim().min(1, "Nhập lý do / nội dung bảo trì."),
  loai_phieu: z.enum(["DINH_KY", "SUA_CHUA"]).optional(),
  su_co_id: z.string().trim().optional(),
});

export type CssdMaintenanceStartInput = z.infer<typeof cssdMaintenanceStartInputSchema>;
