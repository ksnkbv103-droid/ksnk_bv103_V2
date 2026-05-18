"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const isoDay = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải dạng YYYY-MM-DD");

/** Schema dùng chung client + server (dashboard, giám sát). */
export const bv103DateRangeSchema = z
  .object({
    tu_ngay: isoDay,
    den_ngay: isoDay,
  })
  .refine((v) => v.tu_ngay <= v.den_ngay, {
    message: "Từ ngày phải ≤ Đến ngày",
    path: ["den_ngay"],
  });

export type Bv103DateRangeValues = z.infer<typeof bv103DateRangeSchema>;

export function useBv103DateRangeForm(defaults: Bv103DateRangeValues) {
  return useForm<Bv103DateRangeValues>({
    resolver: zodResolver(bv103DateRangeSchema),
    defaultValues: defaults,
    mode: "onChange",
  });
}
