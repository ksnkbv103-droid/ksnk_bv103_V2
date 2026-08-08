/** Types thuần cho engine thi KSNK — không I/O. */

export type DaoTaoQuestionLoai =
  | "single"
  | "multi"
  | "true_false_cluster"
  | "order";

export type BloomLevel = 1 | 2 | 3 | 4 | 5;

export type DaoTaoCheDo = "thi_thu" | "thi_that";

export type DapAnDung =
  | { kind: "single"; optionId: string }
  | { kind: "multi"; optionIds: string[] }
  | { kind: "true_false_cluster"; byOptionId: Record<string, boolean> }
  | { kind: "order"; orderedOptionIds: string[] };

export type BankOption = {
  id: string;
  nhanGoc: string;
  noiDung: string;
  thuTuGoc: number;
  tfDung?: boolean | null;
};

export type BankQuestion = {
  id: string;
  /** Mã chủ đề (cân đề đa chiều). */
  chuDeMa: string;
  loai: DaoTaoQuestionLoai;
  bloomLevel: BloomLevel;
  stem: string;
  giaiThich?: string | null;
  dapAnDung: DapAnDung;
  options: BankOption[];
};

export type QuotaMap = Record<string, number>;

export type SelectExamInput = {
  bank: BankQuestion[];
  soCau: number;
  bloomQuota: QuotaMap;
  loaiQuota: QuotaMap;
  seed: string;
  shuffleCau?: boolean;
  shuffleDapAn?: boolean;
};

export type SnapshotOption = {
  id: string;
  noiDung: string;
  /** Vị trí hiển thị sau shuffle (0-based). */
  displayIndex: number;
  tfDung?: boolean | null;
};

export type ExamQuestionSnapshot = {
  cauHoiId: string;
  chuDeMa: string;
  loai: DaoTaoQuestionLoai;
  bloomLevel: BloomLevel;
  stem: string;
  giaiThich?: string | null;
  options: SnapshotOption[];
  dapAnDung: DapAnDung;
};

export type QuotaReport = {
  requested: number;
  selected: number;
  byLoai: Record<string, number>;
  byBloom: Record<string, number>;
  byChuDe: Record<string, number>;
  notes: string[];
};

export type SelectExamResult = {
  questions: ExamQuestionSnapshot[];
  report: QuotaReport;
};

export type TraLoi =
  | { kind: "single"; optionId: string | null }
  | { kind: "multi"; optionIds: string[] }
  | { kind: "true_false_cluster"; byOptionId: Record<string, boolean | null> }
  | { kind: "order"; orderedOptionIds: string[] };

export type ExamFormThongTin = {
  hoTen: string;
  khoaDonVi: string;
  soDienThoai?: string;
  email?: string;
};
