import { z } from "zod";

const cssdQrHubCodeSchema = z
  .string()
  .trim()
  .min(1, "Thiếu mã quét.")
  .transform((v) => v.toUpperCase());

const cssdQrHubTargetTypeSchema = z.enum(["INSTRUMENT_SET", "MACHINE", "UNKNOWN"]);

export const cssdQrHubResolvedSchema = z.object({
  targetType: cssdQrHubTargetTypeSchema,
  code: cssdQrHubCodeSchema,
  workflowId: z.string().trim().min(1).optional(),
  machineId: z.string().trim().min(1).optional(),
  machineCode: z.string().trim().min(1).optional(),
});

export type CssdQrHubResolved = z.infer<typeof cssdQrHubResolvedSchema>;
