// src/modules/cssd-erp/views/KhoHoaChatKsnkPage.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useModulePermission } from "@/hooks/useModulePermission";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../components/layout/cssd-page-shell";
import CSSDSubNav from "../components/navigation/CSSDSubNav";
import KhoHoaChatMoveSheet, { type MoveMode } from "../components/kho-hoa-chat/kho-hoa-chat-move-sheet";
import KhoHoaChatOverview from "../components/kho-hoa-chat/kho-hoa-chat-overview";
import KhoHoaChatTables from "../components/kho-hoa-chat/kho-hoa-chat-tables";
import {
  capNhatNguongTonKhoAction,
  dieuChinhKhoHoaChatAction,
  listDmHoaChatChoKhoAction,
  listGiaoDichKhoHoaChatAction,
  listTonTheoLoKhoHoaChatAction,
  nhapKhoHoaChatAction,
  type KhoHoaChatGiaoDichRow,
  type KhoHoaChatTonLo,
  xuatKhoHoaChatAction,
} from "../actions/cssd-kho-hoa-chat.actions";
import {
  CSSD_UI_ACTION_PRIMARY,
  CSSD_UI_ACTION_SECONDARY,
  CSSD_UI_TAB_ACTIVE,
  CSSD_UI_TAB_GROUP,
  CSSD_UI_TAB_IDLE,
} from "../shared/ui/cssd-ui-chrome";
import { CSSDCatalogHoaChatTab } from "./CSSDCatalogHoaChatTab";

const MODULE_KEY = "KSNK_KHO_HOACHAT";

function parseLotKey(key: string): { ma_lo: string | null; han_su_dung: string | null } {
  if (!key) return { ma_lo: null, han_su_dung: null };
  const pipe = key.indexOf("|");
  const lo = pipe >= 0 ? key.slice(0, pipe) : "";
  const han = pipe >= 0 ? key.slice(pipe + 1) : "";
  return { ma_lo: lo.length ? lo : null, han_su_dung: han.length ? han : null };
}

export default function KhoHoaChatKsnkPage() {
  const { loading: permLoading, allowed } = useModulePermission(MODULE_KEY);
  const [tons, setTons] = useState<KhoHoaChatTonLo[]>([]);
  const [movs, setMovs] = useState<KhoHoaChatGiaoDichRow[]>([]);
  const [dms, setDms] = useState<Array<{ id: string; ma_hoa_chat: string; ten_hoa_chat: string; don_vi_tinh: string | null; nguong_ton_toi_thieu: number | null }>>([]);
  const [busy, setBusy] = useState(true);
  const [activeTab, setActiveTab] = useState<"STOCK" | "CATALOG">("STOCK");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [moveMode, setMoveMode] = useState<MoveMode>("NHAP");
  const [dmId, setDmId] = useState("");
  const [lotKey, setLotKey] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [maLoNhap, setMaLoNhap] = useState("");
  const [hanNhap, setHanNhap] = useState("");

  const [thrDm, setThrDm] = useState("");
  const [thrVal, setThrVal] = useState("");
  /** Một lần khi mount — ngưỡng “sắp hết hạn” 30 ngày; tránh Date.now trong thân render (react-hooks/purity). */
  const [expiryHorizonMs] = useState(() => Date.now() + 30 * 864e5);

  const reload = useCallback(async () => {
    setBusy(true);
    const [t1, t2, t3] = await Promise.all([
      listTonTheoLoKhoHoaChatAction(),
      listGiaoDichKhoHoaChatAction({ limit: 120 }),
      listDmHoaChatChoKhoAction(),
    ]);
    if (!t1.success) toast.error(t1.error);
    else setTons(t1.data);
    if (!t2.success) toast.error(t2.error);
    else setMovs(t2.data);
    if (!t3.success) toast.error(t3.error);
    else setDms(t3.data);
    setBusy(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setLotKey("");
    setQty("");
    setNote("");
    setMaLoNhap("");
    setHanNhap("");
  }, [sheetOpen, moveMode, dmId]);

  const canEdit = allowed.edit;

  const totalByDm = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tons) m.set(t.dm_hoa_chat_id, (m.get(t.dm_hoa_chat_id) || 0) + t.ton_so_luong);
    return m;
  }, [tons]);

  const countSapHetHan = useMemo(() => {
    let n = 0;
    for (const t of tons) {
      if (!t.han_su_dung || t.ton_so_luong <= 0) continue;
      const h = new Date(`${t.han_su_dung}T12:00:00`).getTime();
      if (Number.isNaN(h) || h > expiryHorizonMs) continue;
      n++;
    }
    return n;
  }, [tons, expiryHorizonMs]);

  const countDuoiNguong = useMemo(() => {
    let n = 0;
    for (const dm of dms) {
      if (dm.nguong_ton_toi_thieu == null) continue;
      const tot = totalByDm.get(dm.id) || 0;
      if (tot <= dm.nguong_ton_toi_thieu) n++;
    }
    return n;
  }, [dms, totalByDm]);

  const openSheet = (m: MoveMode) => {
    setMoveMode(m);
    setSheetOpen(true);
    setDmId("");
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
      const r = await xuatKhoHoaChatAction({ dm_hoa_chat_id: dmId, so_luong: q, ma_lo: loXp, han_su_dung: hxp, ghi_chu: note || null });
      if (!r.success) return toast.error(r.error);
      toast.success("Đã ghi nhận xuất.");
    } else {
      const r = await dieuChinhKhoHoaChatAction({
        dm_hoa_chat_id: dmId,
        so_luong_thay_doi: q,
        ma_lo: loXp,
        han_su_dung: hxp,
        ghi_chu: note || null,
      });
      if (!r.success) return toast.error(r.error);
      toast.success("Đã điều chỉnh tồn.");
    }
    setSheetOpen(false);
    void reload();
  };

  const saveThreshold = async () => {
    if (!canEdit || !thrDm) return toast.error("Chọn mặt hàng.");
    const r = await capNhatNguongTonKhoAction({ dm_hoa_chat_id: thrDm, nguong_ton_toi_thieu: thrVal === "" ? null : thrVal });
    if (!r.success) return toast.error(r.error);
    toast.success("Đã cập nhật ngưỡng.");
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

  if (permLoading) {
    return (
      <div className={CSSD_PAGE_OUTER}>
        <div className="flex h-[40vh] items-center justify-center" aria-busy="true">
          <Loader2 className="h-8 w-8 animate-spin text-[#026f17]" />
        </div>
      </div>
    );
  }

  if (!allowed.view) {
    return (
      <div className={CSSD_PAGE_OUTER}>
        <CSSDSubNav />
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600">
          Bạn không có quyền module Kho hóa chất — liên hệ quản trị (KSNK_KHO_HOACHAT).
        </div>
      </div>
    );
  }

  const mappedDms = dms.map((d) => ({
    id: d.id,
    ma_hoa_chat: d.ma_hoa_chat,
    ten_hoa_chat: d.ten_hoa_chat,
    don_vi_tinh: d.don_vi_tinh,
    loai_hoa_chat: "Hóa chất vật tư",
    is_active: true,
  }));

  return (
    <CSSDPageShell
      title={<span className="text-[#026f17]">Kho hóa chất &amp; vật tư KSNK</span>}
      subtitle="Tồn theo lô và hạn SD; nhập / xuất / điều chỉnh có mã phiếu; ngưỡng cảnh báo theo danh mục."
      actions={
        canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={CSSD_UI_ACTION_PRIMARY} onClick={() => openSheet("NHAP")}>
              + Nhập
            </button>
            <button type="button" className={CSSD_UI_ACTION_SECONDARY} onClick={() => openSheet("XUAT")}>
              Xuất
            </button>
            <button type="button" className={CSSD_UI_ACTION_SECONDARY} onClick={() => openSheet("DIEU")}>
              Điều chỉnh
            </button>
          </div>
        ) : null
      }
    >
      <div className="space-y-6">
        <div className={CSSD_UI_TAB_GROUP}>
          <button
            type="button"
            onClick={() => setActiveTab("STOCK")}
            className={`rounded-lg px-5 py-2 text-xs font-semibold ${activeTab === 'STOCK' ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE}`}
          >
            Giám sát tồn kho &amp; Giao dịch
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CATALOG")}
            className={`rounded-lg px-5 py-2 text-xs font-semibold ${activeTab === 'CATALOG' ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE}`}
          >
            Danh mục hóa chất &amp; vật tư ({dms.length})
          </button>
        </div>

        {activeTab === "STOCK" ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <KhoHoaChatOverview
              countSapHetHan={countSapHetHan}
              countDuoiNguong={countDuoiNguong}
              dms={dms}
              canEdit={canEdit}
              thrDm={thrDm}
              thrVal={thrVal}
              onThrDm={setThrDm}
              onThrVal={setThrVal}
              onSaveThr={saveThreshold}
            />

            <KhoHoaChatTables tons={tons} movs={movs} loading={busy} />
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <CSSDCatalogHoaChatTab hoaChatRows={mappedDms} />
          </div>
        )}
      </div>

      <KhoHoaChatMoveSheet
        open={sheetOpen}
        mode={moveMode}
        dmList={dms}
        tonLots={tons}
        canSubmit={Boolean(canSubmitSheet)}
        onClose={() => setSheetOpen(false)}
        onSubmit={submitMove}
        dmId={dmId}
        onDmId={setDmId}
        lotKey={lotKey}
        onLotKey={setLotKey}
        qty={qty}
        onQty={setQty}
        note={note}
        onNote={setNote}
        maLoNhap={maLoNhap}
        onMaLoNhap={setMaLoNhap}
        hanNhap={hanNhap}
        onHanNhap={setHanNhap}
      />
    </CSSDPageShell>
  );
}
