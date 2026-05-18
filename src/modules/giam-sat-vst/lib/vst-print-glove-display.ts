/**
 * Cột "Găng tay" trên phiếu in chỉ có ý nghĩa ở hành động "Bỏ sót".
 * Với hành động tuân thủ, dữ liệu không thu thập trường này.
 */
export function getVstPrintGloveDisplay(isMissed: boolean, coDeoGang: boolean | null | undefined): string {
  if (!isMissed) return "—";
  if (coDeoGang === true) return "Có";
  if (coDeoGang === false) return "Không";
  return "—";
}
