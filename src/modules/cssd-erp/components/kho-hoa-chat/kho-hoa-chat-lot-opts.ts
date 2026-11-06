import { fefoSortLots, pickFefoLotKey, isLotExpired, lotRowToKey } from "@/lib/domain/cssd-kho-hoa-chat-fefo";
import { formatDateVi } from "@/lib/format-datetime-vi";
import type { KhoHoaChatTonLo } from "../../actions/cssd-kho-hoa-chat.actions";

/** `huyHetHan`: lý do «Hết hạn, hủy» — chỉ lô quá hạn được chọn; ngược lại lô quá hạn bị khóa. */
export function lotOptsForDm(
  dmId: string,
  tons: KhoHoaChatTonLo[],
  huyHetHan = false,
): { key: string; label: string; ton: number; disabled: boolean }[] {
  const rows = tons.filter((t) => t.dm_hoa_chat_id === dmId && t.ton_so_luong > 0);
  const fefoKey = pickFefoLotKey(rows);
  return fefoSortLots(rows).map((t) => {
    const expired = isLotExpired(t.han_su_dung);
    const key = lotRowToKey(t);
    const fefoHint = fefoKey && key === fefoKey ? " ★ FEFO" : "";
    return {
      key,
      label: `${t.ma_lo?.length ? `Lô ${t.ma_lo}` : "Không lô"}${t.han_su_dung ? ` — HSD ${formatDateVi(t.han_su_dung)}` : ""} — Tồn ${t.ton_so_luong}${fefoHint}${expired ? " (HẾT HẠN)" : ""}`,
      ton: t.ton_so_luong,
      disabled: huyHetHan ? !expired : expired,
    };
  });
}
