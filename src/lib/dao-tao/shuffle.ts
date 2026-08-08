import type { BankQuestion, DapAnDung, ExamQuestionSnapshot, SnapshotOption } from "@/lib/dao-tao/types";
import { shuffledCopy } from "@/lib/dao-tao/rng";

/**
 * Đảo thứ tự hiển thị phương án an toàn:
 * - single/multi/TF: hoán vị display; dapAnDung giữ nguyên theo option id.
 * - order: chỉ xáo thứ tự hiển thị các bước; dapAnDung.orderedOptionIds = chuỗi id gốc (không dịch theo nhãn).
 */
export function buildShuffledSnapshot(
  q: BankQuestion,
  rng: () => number,
  shuffleDapAn: boolean,
): ExamQuestionSnapshot {
  const opts = [...q.options].sort((a, b) => a.thuTuGoc - b.thuTuGoc);
  const displayOrder = shuffleDapAn ? shuffledCopy(opts, rng) : opts;

  const options: SnapshotOption[] = displayOrder.map((o, displayIndex) => ({
    id: o.id,
    noiDung: o.noiDung,
    displayIndex,
    tfDung: o.tfDung ?? null,
  }));

  // dapAnDung luôn theo id — không remap theo nhãn A/B/C/D sau shuffle.
  const dapAnDung: DapAnDung = structuredClone(q.dapAnDung);

  return {
    cauHoiId: q.id,
    chuDeMa: q.chuDeMa,
    loai: q.loai,
    bloomLevel: q.bloomLevel,
    stem: q.stem,
    giaiThich: q.giaiThich,
    options,
    dapAnDung,
  };
}
