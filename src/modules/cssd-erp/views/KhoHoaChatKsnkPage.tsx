// src/modules/cssd-erp/views/KhoHoaChatKsnkPage.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { useModulePermission } from "@/hooks/useModulePermission";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../components/layout/cssd-page-shell";
import CssdModuleChrome from "../components/layout/CssdModuleChrome";
import KhoHoaChatMoveSheet, { type MoveMode } from "../components/kho-hoa-chat/kho-hoa-chat-move-sheet";
import KhoHoaChatOverview from "../components/kho-hoa-chat/kho-hoa-chat-overview";
import KhoHoaChatTables from "../components/kho-hoa-chat/kho-hoa-chat-tables";
import KhoHoaChatSuCoPanel from "../components/kho-hoa-chat/kho-hoa-chat-su-co-panel";
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
  listSuCoChemicalChuaGhiKhoAction,
  type SuCoChemicalRow,
} from "../actions/cssd-kho-hoa-chat.actions";
import { CSSD_UI_ACTION_PRIMARY, CSSD_UI_ACTION_SECONDARY, CSSD_UI_TAB_ACTIVE, CSSD_UI_TAB_GROUP, CSSD_UI_TAB_IDLE } from "../shared/ui/cssd-ui-chrome";
import { CssdHorizTabButton } from "../components/layout/CssdHorizTabButton";
import { CSSDCatalogHoaChatTab } from "./CSSDCatalogHoaChatTab";
import { lotRowToKey, pickFefoLotKey } from "@/lib/domain/cssd-kho-hoa-chat-fefo";
import { matchesLoaiFilter, type HoaChatLoaiFilter } from "@/lib/domain/cssd-hoa-chat-loai";
import IncidentReportModal from "@/modules/cssd-su-co/components/IncidentReportModal";

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
  const [dms, setDms] = useState<
    Array<{
      id: string;
      ma_hoa_chat: string;
      ten_hoa_chat: string;
      don_vi_tinh: string | null;
      nguong_ton_toi_thieu: number | null;
      loai_hoa_chat: string | null;
    }>
  >([]);
  const [busy, setBusy] = useState(true);
  const [activeTab, setActiveTab] = useState<"STOCK" | "CATALOG">("STOCK");
  const [loaiFilter, setLoaiFilter] = useState<HoaChatLoaiFilter>("ALL");

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
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
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
    () => tons.filter((t) => matchesLoaiFilter(dmLoaiMap.get(t.dm_hoa_chat_id), loaiFilter)),
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
      const h = new Date(`${t.han_su_dung}T12:00:00`).getTime();
      if (Number.isNaN(h) || h > expiryHorizonMs) continue;
      n++;
    }
    return n;
  }, [filteredTons, expiryHorizonMs]);

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
    return filteredTons.filter((t) => {
      if (!t.han_su_dung || t.ton_so_luong <= 0) return false;
      const h = new Date(`${t.han_su_dung}T12:00:00`).getTime();
      return !Number.isNaN(h) && h <= expiryHorizonMs;
    });
  }, [filteredTons, expiryHorizonMs]);

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
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      </div>
    );
  }

  if (!allowed.view) {
    return (
      <CSSDPageShell title={<span className="text-[var(--primary)]">Kho hóa chất &amp; vật tư</span>} subtitle="Không có quyền truy cập.">
        <CssdModuleChrome />
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600">
          Bạn không có quyền module Kho hóa chất — liên hệ quản trị (KSNK_KHO_HOACHAT).
        </div>
      </CSSDPageShell>
    );
  }

  const mappedDms = dms.map((d) => ({
    id: d.id,
    ma_hoa_chat: d.ma_hoa_chat,
    ten_hoa_chat: d.ten_hoa_chat,
    don_vi_tinh: d.don_vi_tinh,
    loai_hoa_chat: d.loai_hoa_chat ?? "HOA_CHAT",
    is_active: true,
  }));

  return (
    <CSSDPageShell
      title={<span className="text-[var(--primary)]">Kho hóa chất &amp; vật tư KSNK</span>}
      subtitle="Tồn theo lô và hạn SD; nhập / xuất / điều chỉnh có mã phiếu; ngưỡng cảnh báo theo danh mục."
      actions={
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <button type="button" className={CSSD_UI_ACTION_PRIMARY} onClick={() => openSheet("NHAP")}>
                + Nhập
              </button>
              <button type="button" className={CSSD_UI_ACTION_SECONDARY} onClick={() => openSheet("XUAT")}>
                Xuất
              </button>
              <button type="button" className={CSSD_UI_ACTION_SECONDARY} onClick={() => openSheet("DIEU")}>
                Điều chỉnh
              </button>
            </>
          )}
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-red-600 shadow-sm hover:bg-red-100 active:scale-[0.98] transition-all cursor-pointer"
            onClick={() => setIsIncidentOpen(true)}
          >
            ⚠️ Báo sự cố
          </button>
        </div>
      }
    >
      <CssdModuleChrome />
      <div className="space-y-6">
        {/* Banner cảnh báo tồn kho hóa chất dưới ngưỡng an toàn */}
        {duoiNguongItems.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm font-bold">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="flex-1 space-y-1">
                <h4 className="text-xs font-bold text-red-900 uppercase tracking-wide">Cảnh báo: Hóa chất / Vật tư dưới ngưỡng tồn tối thiểu!</h4>
                <p className="text-[11px] text-red-700 font-medium leading-relaxed">
                  Có <span className="font-extrabold">{duoiNguongItems.length}</span> mặt hàng đang ở mức báo động đỏ. Vui lòng lập kế hoạch bổ sung vật tư ngay lập tức để tránh làm gián đoạn quy trình tiệt khuẩn CSSD.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {duoiNguongItems.map((item) => {
                    const currentStock = totalByDm.get(item.id) || 0;
                    return (
                      <span key={item.id} className="inline-flex items-center rounded-lg bg-red-100/80 px-2 py-0.5 text-[11px] font-bold text-red-800 border border-red-200/50">
                        {item.ma_hoa_chat}: {currentStock} / {item.nguong_ton_toi_thieu} (ngưỡng)
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banner cảnh báo lô sắp hết hạn sử dụng */}
        {sapHetHanItems.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm font-bold">
                <CalendarClock className="h-4 w-4" />
              </span>
              <div className="flex-1 space-y-1">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">Cảnh báo: Lô hóa chất / Vật tư sắp hết hạn sử dụng!</h4>
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  Có <span className="font-extrabold">{sapHetHanItems.length}</span> lô hàng đang có hạn sử dụng dưới 30 ngày. Vui lòng ưu tiên xuất dùng trước hoặc liên hệ nhà cung cấp nếu cần đổi lô mới.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {sapHetHanItems.map((item) => (
                    <span key={item.id} className="inline-flex items-center rounded-lg bg-amber-100/80 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200/50">
                      Lô {item.ma_lo || "Không mã"}: {item.ton_so_luong} ({item.han_su_dung})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={CSSD_UI_TAB_GROUP}>
          <CssdHorizTabButton
            active={activeTab === "STOCK"}
            onClick={() => setActiveTab("STOCK")}
            label="Giám sát tồn kho & Giao dịch"
            mobileLabel="Tồn kho"
          />
          <CssdHorizTabButton
            active={activeTab === "CATALOG"}
            onClick={() => setActiveTab("CATALOG")}
            label={`Danh mục hóa chất & vật tư (${dms.length})`}
            mobileLabel={`Danh mục (${dms.length})`}
          />
        </div>

        {activeTab === "STOCK" ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["ALL", "Tất cả"],
                  ["HOA_CHAT", "Hóa chất tiệt trùng"],
                  ["VAT_TU", "Vật tư tiêu hao"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLoaiFilter(key)}
                  className={`rounded-lg px-4 py-1.5 text-[11px] font-semibold ${
                    loaiFilter === key ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <KhoHoaChatSuCoPanel rows={suCoRows} canEdit={canEdit} onXuatTuSuCo={openXuatTuSuCo} />

            <KhoHoaChatOverview
              countSapHetHan={countSapHetHan}
              countDuoiNguong={countDuoiNguong}
              dms={filteredDms}
              canEdit={canEdit}
              thrDm={thrDm}
              thrVal={thrVal}
              onThrDm={setThrDm}
              onThrVal={setThrVal}
              onSaveThr={saveThreshold}
            />

            <KhoHoaChatTables tons={filteredTons} movs={filteredMovs} loading={busy} />
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
        dmList={filteredDms}
        tonLots={tons}
        canSubmit={Boolean(canSubmitSheet)}
        onClose={() => {
          setSheetOpen(false);
          setLinkedSuCoId(null);
          setPrefMaLo(null);
        }}
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
        linkedSuCoId={linkedSuCoId}
      />

      <IncidentReportModal
        isOpen={isIncidentOpen}
        onClose={() => setIsIncidentOpen(false)}
        station="TIEP_NHAN"
        defaultGroup="CHEMICAL"
        onSuccess={() => {
          toast.message("Đã ghi sự cố", {
            description: "Nếu cần trừ tồn, dùng «Ghi xuất» ở khối sự cố hóa chất phía trên.",
          });
          void reload();
        }}
      />
    </CSSDPageShell>
  );
}
