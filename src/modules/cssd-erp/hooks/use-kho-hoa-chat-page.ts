// src/modules/cssd-erp/hooks/use-kho-hoa-chat-page.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useModulePermission } from "@/hooks/useModulePermission";
import type { MoveMode } from "../components/kho-hoa-chat/kho-hoa-chat-move-sheet";
import {
  listDmHoaChatChoKhoAction,
  listGiaoDichKhoHoaChatAction,
  listTonTheoLoKhoHoaChatAction,
  nhapKhoHoaChatAction,
  type KhoHoaChatGiaoDichRow,
  type KhoHoaChatTonLo,
  xuatKhoHoaChatAction,
  listSuCoChemicalChuaGhiKhoAction,
  type SuCoChemicalRow,
} from "../actions/cssd-kho-hoa-chat.actions";
import { fefoSortLots, isLotExpired, lotRowToKey, pickFefoLotKey } from "@/lib/domain/cssd-kho-hoa-chat-fefo";
import { validateLyDoXuat, type LyDoXuat } from "@/lib/domain/cssd-kho-hoa-chat-ly-do-xuat";
import { normalizeTrangThai, validateLyDoTuChoi } from "@/lib/domain/cssd-kho-hoa-chat-duyet";
import { buildDmStockSummary, type DmLite } from "@/lib/domain/cssd-kho-hoa-chat-summary";
import { duyetPhieuKhoHoaChatAction } from "../actions/cssd-kho-hoa-chat-duyet.actions";
import { todayYmdInVn } from "@/lib/format-datetime-vi";

const MODULE_KEY = "KSNK_KHO_HOACHAT";

function parseLotKey(key: string): { ma_lo: string | null; han_su_dung: string | null } {
  if (!key) return { ma_lo: null, han_su_dung: null };
  const pipe = key.indexOf("|");
  const lo = pipe >= 0 ? key.slice(0, pipe) : "";
  const han = pipe >= 0 ? key.slice(pipe + 1) : "";
  return { ma_lo: lo.length ? lo : null, han_su_dung: han.length ? han : null };
}

export function useKhoHoaChatPage() {
  const { loading: permLoading, allowed } = useModulePermission(MODULE_KEY);
  const [tons, setTons] = useState<KhoHoaChatTonLo[]>([]);
  const [movs, setMovs] = useState<KhoHoaChatGiaoDichRow[]>([]);
  const [dms, setDms] = useState<DmLite[]>([]);
  const [busy, setBusy] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [moveMode, setMoveMode] = useState<MoveMode>("NHAP");
  const [dmId, setDmId] = useState("");
  const [lotKey, setLotKey] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [maLoNhap, setMaLoNhap] = useState("");
  const [hanNhap, setHanNhap] = useState("");
  const [lyDoXuat, setLyDoXuat] = useState<LyDoXuat | "">("CAP_SU_DUNG");

  /** Một lần khi mount — mốc ngày cho cận-date FEFO (tránh Date.now trong thân render). */
  const [todayYmd] = useState(() => todayYmdInVn());
  const [suCoRows, setSuCoRows] = useState<SuCoChemicalRow[]>([]);
  const [linkedSuCoId, setLinkedSuCoId] = useState<string | null>(null);
  const [prefMaLo, setPrefMaLo] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setBusy(true);
    const [t1, t2, t3, t4] = await Promise.all([
      listTonTheoLoKhoHoaChatAction(),
      listGiaoDichKhoHoaChatAction({ limit: 120 }),
      listDmHoaChatChoKhoAction(),
      listSuCoChemicalChuaGhiKhoAction(),
    ]);
    if (!t1.success) toast.error(t1.error);
    else setTons(t1.data);
    if (!t2.success) toast.error(t2.error);
    else setMovs(t2.data);
    if (!t3.success) toast.error(t3.error);
    else setDms(t3.data);
    if (!t4.success) toast.error(t4.error);
    else setSuCoRows(t4.data);
    setBusy(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setQty("");
    setNote("");
    setMaLoNhap("");
    setHanNhap("");
    setLyDoXuat("CAP_SU_DUNG");
    if (!sheetOpen) {
      setLotKey("");
      return;
    }
    if (moveMode === "NHAP" || !dmId) {
      setLotKey("");
      return;
    }
    if (prefMaLo) {
      const match = tons.find(
        (t) =>
          t.dm_hoa_chat_id === dmId &&
          t.ton_so_luong > 0 &&
          String(t.ma_lo || "").toLowerCase() === prefMaLo.toLowerCase(),
      );
      if (match) {
        setLotKey(lotRowToKey(match));
        return;
      }
    }
    const key = pickFefoLotKey(tons.filter((t) => t.dm_hoa_chat_id === dmId));
    setLotKey(key);
  }, [sheetOpen, moveMode, dmId, tons, prefMaLo]);

  const canEdit = allowed.edit;

  const { loading: apprLoading, allowed: apprAllowed } = useModulePermission("CSSD_HOA_CHAT");
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const decide = async (row: KhoHoaChatGiaoDichRow, quyetDinh: "DUYET" | "TU_CHOI", lyDoIn?: string): Promise<boolean> => {
    const lyDo = quyetDinh === "TU_CHOI" ? (lyDoIn ?? "").trim() : null;
    const loi = validateLyDoTuChoi(quyetDinh, lyDo);
    if (loi) {
      toast.error(loi);
      return false;
    }
    setDecidingId(row.id);
    const r = await duyetPhieuKhoHoaChatAction({ giao_dich_id: row.id, quyet_dinh: quyetDinh, ly_do: lyDo });
    setDecidingId(null);
    if (!r.success) {
      toast.error(r.error);
      return false;
    }
    toast.success(quyetDinh === "DUYET" ? (r.tu_duyet_ngoai_le ? "Đã duyệt (tự duyệt ngoại lệ)." : "Đã duyệt phiếu.") : "Đã từ chối phiếu.");
    void reload();
    return true;
  };
  const approve = { canApprove: !apprLoading && apprAllowed.approve, decidingId, onDecide: decide };

  /** Số phiếu chờ duyệt theo mặt hàng. */
  const choDuyetByDm = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of movs) {
      if (normalizeTrangThai(x.trang_thai) === "CHO_DUYET") m.set(x.dm_hoa_chat_id, (m.get(x.dm_hoa_chat_id) || 0) + 1);
    }
    return m;
  }, [movs]);

  const openSheet = (m: MoveMode, presetDmId = "") => {
    setMoveMode(m);
    setLinkedSuCoId(null);
    setPrefMaLo(null);
    setSheetOpen(true);
    setDmId(presetDmId);
  };

  const openXuatTuSuCo = (row: SuCoChemicalRow) => {
    if (!row.dm_hoa_chat_id) return toast.error("Sự cố chưa gắn hóa chất trong danh mục.");
    setLinkedSuCoId(row.id);
    setPrefMaLo(row.ma_lo);
    setMoveMode("XUAT");
    setDmId(row.dm_hoa_chat_id);
    setQty("");
    setLyDoXuat("");
    setNote(
      row.mo_ta
        ? `Xuất theo sự cố — ${row.incident_type_label || "CHEMICAL"}: ${row.mo_ta}`
        : `Xuất theo sự cố — ${row.incident_type_label || "CHEMICAL"}`,
    );
    setSheetOpen(true);
  };

  const submitMove = async () => {
    const q = Number(qty);
    if (!dmId.trim()) return toast.error("Chọn mặt hàng.");
    if (!canEdit) return toast.error("Không có quyền sửa.");
    if (!Number.isFinite(q) || q === 0) return toast.error("Nhập số lượng hợp lệ.");
    if (q <= 0) return toast.error("Số lượng phải dương.");

    const { ma_lo: loXp, han_su_dung: hxp } = parseLotKey(lotKey);

    if (moveMode === "NHAP") {
      const r = await nhapKhoHoaChatAction({
        dm_hoa_chat_id: dmId,
        so_luong: q,
        ma_lo: maLoNhap || null,
        han_su_dung: hanNhap || null,
        ghi_chu: note || null,
      });
      if (!r.success) return toast.error(r.error);
      toast.success("Đã lập phiếu, chờ duyệt.");
    } else {
      const quaHan = isLotExpired(hxp);
      const loiLyDo = validateLyDoXuat(lyDoXuat, quaHan);
      if (loiLyDo) return toast.error(loiLyDo);
      const r = await xuatKhoHoaChatAction({
        dm_hoa_chat_id: dmId,
        so_luong: q,
        ma_lo: loXp,
        han_su_dung: hxp,
        ghi_chu: note || null,
        su_co_id: linkedSuCoId,
        ly_do_xuat: lyDoXuat,
      });
      if (!r.success) return toast.error(r.error);
      toast.success(linkedSuCoId ? "Đã lập phiếu xuất liên kết sự cố, chờ duyệt." : "Đã lập phiếu, chờ duyệt.");
    }
    setSheetOpen(false);
    setLinkedSuCoId(null);
    setPrefMaLo(null);
    void reload();
  };

  const qn = Number(qty);
  const canSubmitSheet =
    canEdit &&
    dmId.trim() &&
    qty.trim() &&
    Number.isFinite(qn) &&
    qn > 0 &&
    (moveMode === "NHAP" || Boolean(lyDoXuat));

  const dmSummary = useMemo(
    () => buildDmStockSummary(dms, tons, todayYmd),
    [dms, tons, todayYmd],
  );

  /** Đổi lý do xuất: «Hết hạn, hủy» chuyển sang lô quá hạn, lý do khác về lô FEFO còn hạn. */
  const changeLyDoXuat = (v: LyDoXuat | "") => {
    setLyDoXuat(v);
    const lots = tons.filter((t) => t.dm_hoa_chat_id === dmId && t.ton_so_luong > 0);
    if (v === "HET_HAN_HUY") {
      const het = fefoSortLots(lots.filter((t) => isLotExpired(t.han_su_dung)))[0];
      setLotKey(het ? lotRowToKey(het) : "");
    } else {
      setLotKey(pickFefoLotKey(lots));
    }
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setLinkedSuCoId(null);
    setPrefMaLo(null);
  };

  return {
    permLoading, allowed, canEdit, busy,
    tons, movs, dms, suCoRows, dmSummary, todayYmd, choDuyetByDm,
    sheet: {
      open: sheetOpen, mode: moveMode, canSubmit: Boolean(canSubmitSheet), onClose: closeSheet, onSubmit: submitMove,
      dmId, onDmId: setDmId, lotKey, onLotKey: setLotKey, qty, onQty: setQty, note, onNote: setNote,
      maLoNhap, onMaLoNhap: setMaLoNhap, hanNhap, onHanNhap: setHanNhap, linkedSuCoId,
      lyDoXuat, onLyDoXuat: changeLyDoXuat,
    },
    openSheet, openXuatTuSuCo, approve, reload,
  };
}
