/** Giá trị đánh giá từng tiêu chí trong bảng kiểm giám sát chung */
export type ChecklistResultValue = "DAT" | "KHONG_DAT" | "NA";

export interface ChecklistResult {
  criterionId: string;
  value: ChecklistResultValue;
  note?: string | null;
}

export interface ChecklistCriterion {
  id: string;
  label: string;
  description?: string | null;
  maxScore?: number;
}

export interface ChecklistTemplate {
  id: string;
  dbId?: string;
  title: string;
  /** Nhóm hiển thị (tuỳ màn hình) */
  category?: string;
  criteria: ChecklistCriterion[];
}
