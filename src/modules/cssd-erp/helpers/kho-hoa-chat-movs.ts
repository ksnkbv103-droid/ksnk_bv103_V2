import type { KhoHoaChatGiaoDichRow } from "../actions/cssd-kho-hoa-chat.actions";

/** Lịch sử phiếu đã tải, gắn với mặt hàng nó thuộc về. */
export type DmMovsState = { dmId: string; rows: KhoHoaChatGiaoDichRow[] } | null;

/** Chỉ trả phiếu khi đúng mặt hàng đang mở; `null` = đang tải (không dùng phiếu của mặt hàng khác). */
export function movsForOpenDm(state: DmMovsState, openId: string | null): KhoHoaChatGiaoDichRow[] | null {
  return state && openId && state.dmId === openId ? state.rows : null;
}
