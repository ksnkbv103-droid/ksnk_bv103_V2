/** Tính “đã gán nhưng chưa nộp” — thuần, không I/O. */

export type AssignedStaff = {
  id: string;
  hoTen: string;
  maNv: string | null;
  khoaId: string | null;
  khoaTen: string;
  authUserId: string | null;
};

export function splitCoverage(
  staff: AssignedStaff[],
  submittedAuthUserIds: string[],
): { chuaNop: AssignedStaff[]; chuaTaiKhoan: AssignedStaff[] } {
  const done = new Set(submittedAuthUserIds.filter(Boolean));
  const chuaNop: AssignedStaff[] = [];
  const chuaTaiKhoan: AssignedStaff[] = [];
  for (const s of staff) {
    if (!s.authUserId) {
      chuaTaiKhoan.push(s);
      continue;
    }
    if (!done.has(s.authUserId)) chuaNop.push(s);
  }
  return { chuaNop, chuaTaiKhoan };
}
