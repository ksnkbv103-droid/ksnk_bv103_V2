// src/modules/cssd-erp/hooks/use-kho-hoa-chat-page.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useModulePermission } from "@/hooks/useModulePermission";
import type { MoveMode } from "../components/kho-hoa-chat/kho-hoa-chat-move-sheet";
import {
  dieuChinhKhoHoaChatAction,
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
import { fefoSortLots, isLotNearExpiry, lotRowToKey, pickFefoLotKey } from "@/lib/domain/cssd-kho-hoa-chat-fefo";
import { matchesLoaiFilter, type HoaChatLoaiFilter } from "@/lib/domain/cssd-hoa-chat-loai";
import { buildDmStockSummary, type DmLite } from "@/lib/domain/cssd-kho-hoa-chat-summary";
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
  const [loaiFilter, setLoaiFilter] = useState<HoaChatLoaiFilter>("ALL");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [moveMode, setMoveMode] = useState<MoveMode>("NHAP");
  const [dmId, setDmId] = useState("");
  const [lotKey, setLotKey] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [maLoNhap, setMaLoNhap] = useState("");
  const [hanNhap, setHanNhap] = useState("");

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

  const dmLoaiMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of dms) m.set(d.id, d.loai_hoa_chat ?? "HOA_CHAT");
    return m;
  }, [dms]);

  const filteredDms = useMemo(
    () => dms.filter((d) => matchesLoaiFilter(d.loai_hoa_chat, loaiFilter)),
    [dms, loaiFilter],
  );

  const filteredTons = useMemo(
    () =>
      fefoSortLots(
        tons.filter((t) => matchesLoaiFilter(dmLoaiMap.get(t.dm_hoa_chat_id), loaiFilter)),
      ),
    [tons, dmLoaiMap, loaiFilter],
  );

  const filteredMovs = useMemo(
    () => movs.filter((m) => matchesLoaiFilter(dmLoaiMap.get(m.dm_hoa_chat_id), loaiFilter)),
    [movs, dmLoaiMap, loaiFilter],
  );

  const totalByDm = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of filteredTons) m.set(t.dm_hoa_chat_id, (m.get(t.dm_hoa_chat_id) || 0) + t.ton_so_luong);
    return m;
  }, [filteredTons]);

  const countSapHetHan = useMemo(() => {
    let n = 0;
    for (const t of filteredTons) {
      if (!t.han_su_dung || t.ton_so_luong <= 0) continue;
      if (!isLotNearExpiry(t.han_su_dung, todayYmd)) continue;
      n++;
    }
    return n;
  }, [filteredTons, todayYmd]);

  const countDuoiNguong = useMemo(() => {
    let n = 0;
    for (const dm of filteredDms) {
      if (dm.nguong_ton_toi_thieu == null) continue;
      const tot = totalByDm.get(dm.id) || 0;
      if (tot <= dm.nguong_ton_toi_thieu) n++;
    }
    return n;
  }, [filteredDms, totalByDm]);

  const sapHetHanItems = useMemo(() => {
    return filteredTons.filter(
      (t) => t.ton_so_luong > 0 && isLotNearExpiry(t.han_su_dung, todayYmd),
    );
  }, [filteredTons, todayYmd]);

  const duoiNguongItems = useMemo(() => {
    return filteredDms.filter((dm) => {
      if (dm.nguong_ton_toi_thieu == null) return false;
      const tot = totalByDm.get(dm.id) || 0;
      return tot <= dm.nguong_ton_toi_thieu;
    });
  }, [filteredDms, totalByDm]);

  const openSheet = (m: MoveMode) => {
    setMoveMode(m);
    setLinkedSuCoId(null);
    setPrefMaLo(null);
    setSheetOpen(true);
    setDmId("");
  };

  const openXuatTuSuCo = (row: SuCoChemicalRow) => {
    if (!row.dm_hoa_chat_id) return toast.error("Sự cố chưa gắn hóa chất trong danh mục.");
    setLinkedSuCoId(row.id);
    setPrefMaLo(row.ma_lo);
    setMoveMode("XUAT");
    setDmId(row.dm_hoa_chat_id);
    setQty("");
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
    if (moveMode === "NHAP" || moveMode === "XUAT") {
      if (q <= 0) return toast.error("Số lượng phải dương.");
    }

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
      toast.success("Đã ghi nhận nhập.");
    } else if (moveMode === "XUAT") {
      const r = await xuatKhoHoaChatAction({
        dm_hoa_chat_id: dmId,
        so_luong: q,
        ma_lo: loXp,
        han_su_dung: hxp,
        ghi_chu: note || null,
        su_co_id: linkedSuCoId,
      });
      if (!r.success) return toast.error(r.error);
      toast.success(linkedSuCoId ? "Đã ghi xuất và liên kết sự cố." : "Đã ghi nhận xuất.");
    } else {
      const r = await dieuChinhKhoHoaChatAction({
        dm_hoa_chat_id: dmId,
        so_luong_thay_doi: q,
        ma_lo: loXp,
        han_su_dung: hxp,
        ghi_chu: note || null,
        su_co_id: linkedSuCoId,
      });
      if (!r.success) return toast.error(r.error);
      toast.success("Đã điều chỉnh tồn.");
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
    qn !== 0 &&
    (moveMode === "DIEU" ? true : qn > 0);

  const dmSummary = useMemo(
    () => buildDmStockSummary(filteredDms, filteredTons, todayYmd),
    [filteredDms, filteredTons, todayYmd],
  );

  const closeSheet = () => {
    setSheetOpen(false);
    setLinkedSuCoId(null);
    setPrefMaLo(null);
  };

  return {
    permLoading, allowed, canEdit, busy, loaiFilter, setLoaiFilter,
    tons, filteredTons, filteredMovs, filteredDms, suCoRows, dmSummary, todayYmd,
    countSapHetHan, countDuoiNguong, sapHetHanItems, duoiNguongItems, totalByDm,
    sheet: {
      open: sheetOpen, mode: moveMode, canSubmit: Boolean(canSubmitSheet), onClose: closeSheet, onSubmit: submitMove,
      dmId, onDmId: setDmId, lotKey, onLotKey: setLotKey, qty, onQty: setQty, note, onNote: setNote,
      maLoNhap, onMaLoNhap: setMaLoNhap, hanNhap, onHanNhap: setHanNhap, linkedSuCoId,
    },
    openSheet, openXuatTuSuCo,
  };
}
