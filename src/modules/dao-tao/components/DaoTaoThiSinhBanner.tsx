"use client";

import type { ExamFormThongTin } from "@/lib/dao-tao/types";
import { DaoTaoExamInfoForm } from "@/modules/dao-tao/components/DaoTaoExamInfoForm";

type Props = {
  form: ExamFormThongTin;
  onChange: (v: ExamFormThongTin) => void;
  complete: boolean;
  banner: string | null;
};

/** Hồ sơ đủ thì chỉ hiện dòng xác nhận; thiếu thì hỏi các ô bắt buộc. */
export function DaoTaoThiSinhBanner({ form, onChange, complete, banner }: Props) {
  if (complete && banner) {
    return <p className="text-sm text-slate-600">Thi với tư cách: {banner}</p>;
  }
  return <DaoTaoExamInfoForm value={form} onChange={onChange} />;
}
