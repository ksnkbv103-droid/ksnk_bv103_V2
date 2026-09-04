/** QT.18 / trạm LAM_SACH — soft gate lot enzyme / máy rửa (washer). */

export type LamSachLotGateInput = {
  /** Mã lô enzyme / hóa chất làm sạch (extraPayload.enzyme_lot | ma_lo_enzyme | hoa_chat_ma_lo). */
  enzymeLot?: string | null;
  /** Id máy rửa (extraPayload.washer_machine_id | thiet_bi_rua_id). Optional per domain-overview. */
  washerMachineId?: string | null;
};

export type LamSachLotGateResult =
  | { ok: true }
  | { ok: true; warning: string };

/**
 * Soft-warn Q2-style: thiếu lot enzyme **và** washer vẫn cho quét LAM_SACH.
 * Domain SSOT (`domain-overview` §8): tracing enzyme/washer = P1 / optional `washer_machine_id`
 * — **không** hard-block (khác QT.21 BD/CAP_PHAT expiry). QT.18 process detail ≠ require lot cứng.
 */
export function assertLamSachLotSoftGate(input: LamSachLotGateInput): LamSachLotGateResult {
  const enzyme = String(input.enzymeLot || "").trim();
  const washer = String(input.washerMachineId || "").trim();
  if (enzyme || washer) return { ok: true };
  return {
    ok: true,
    warning:
      "QT.18 Làm sạch: chưa ghi lot enzyme / máy rửa — vẫn chuyển bước, đã ghi nhận. Nên bổ sung lot hóa chất enzyme hoặc washer_machine_id khi có.",
  };
}

/** Parse extraPayload từ scan workflow (nhiều alias FE). */
export function pickLamSachLotFromPayload(
  extraPayload?: Record<string, unknown> | null,
): LamSachLotGateInput {
  const p = extraPayload || {};
  const enzymeLot =
    p.enzyme_lot ??
    p.enzymeLot ??
    p.ma_lo_enzyme ??
    p.maLoEnzyme ??
    p.hoa_chat_ma_lo ??
    p.hoaChatMaLo ??
    null;
  const washerMachineId =
    p.washer_machine_id ??
    p.washerMachineId ??
    p.thiet_bi_rua_id ??
    p.thietBiRuaId ??
    null;
  return {
    enzymeLot: enzymeLot == null ? null : String(enzymeLot),
    washerMachineId: washerMachineId == null ? null : String(washerMachineId),
  };
}
