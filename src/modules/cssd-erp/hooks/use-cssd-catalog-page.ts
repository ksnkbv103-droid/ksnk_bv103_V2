"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getKhoCatalogPayloadAction, lookupBoDungCuIdByQrAction } from "../actions/cssd-catalog.actions";
import {
  getBosContainingLoaiAction,
  searchKhoCatalogChiTietAction,
  searchKhoCatalogLoaiAction,
} from "../actions/cssd-catalog-search.actions";
import type { Catalog, CSSDBo, CSSDChiTiet, CSSDLoai } from "../types/catalog.types";
import { normalizeCssdCode } from "../shared/domain/cssd-qr-core";
import { filterCatalogRows, type CatalogTab } from "../views/cssd-catalog-page-helpers";

export function useCssdCatalogPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTabState] = useState<CatalogTab>("BO");
  const setTab = useCallback((next: CatalogTab) => {
    setTabState(next === "CHI_TIET" ? "BO" : next);
  }, []);
  const [catalog, setCatalog] = useState<Catalog>({ bo: [], chi_tiet: [], loai: [], hoa_chat: [] });
  const [q, setQ] = useState("");
  const [selectedBoId, setSelectedBoId] = useState<string | null>(null);
  const [selectedChiTietId, setSelectedChiTietId] = useState<string | null>(null);
  const [selectedLoaiId, setSelectedLoaiId] = useState<string | null>(null);
  const [boBySelectedLoai, setBoBySelectedLoai] = useState<CSSDBo[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await getKhoCatalogPayloadAction();
    if (!res.success) {
      toast.error(res.error || "Không tải được danh mục CSSD.");
      setLoading(false);
      return;
    }
    setCatalog(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (tab !== "LOAI") return;
    const t = window.setTimeout(async () => {
      const res = await searchKhoCatalogLoaiAction(q);
      if (res.success) setCatalog((c) => ({ ...c, loai: res.data }));
    }, 300);
    return () => window.clearTimeout(t);
  }, [tab, q]);

  useEffect(() => {
    if (!selectedLoaiId) {
      setBoBySelectedLoai([]);
      return;
    }
    let active = true;
    void getBosContainingLoaiAction(selectedLoaiId).then((res) => {
      if (active && res.success) setBoBySelectedLoai(res.data);
    });
    return () => {
      active = false;
    };
  }, [selectedLoaiId]);

  const handleScan = useCallback(async (val: string) => {
    const code = normalizeCssdCode(val);
    if (!code) return;

    const matchedBo = catalog.bo.find((x) => normalizeCssdCode(x.ma_bo) === code);
    if (matchedBo) {
      setTab("BO");
      setSelectedBoId(matchedBo.id);
      setQ(code);
      toast.success(`Đã tìm thấy bộ dụng cụ: ${matchedBo.ten_bo}`);
      return;
    }

    const ctRes = await searchKhoCatalogChiTietAction(code);
    const matchedChiTiet = ctRes.success
      ? ctRes.data.find((x: CSSDChiTiet) => normalizeCssdCode(x.ma_chi_tiet) === code)
      : undefined;
    if (matchedChiTiet) {
      const boId = matchedChiTiet.bo_dung_cu_id;
      const foundBo = boId ? catalog.bo.find((x) => x.id === boId) : undefined;
      if (foundBo) {
        setTab("BO");
        setSelectedBoId(foundBo.id);
        setQ(foundBo.ma_bo || code);
        toast.success(`Đã tìm thấy trong bộ: ${foundBo.ten_bo}`);
        return;
      }
      toast.message("Mã này không gắn bộ đang hoạt động — mở tab Loại để xem tồn.");
      return;
    }

    const loaiRes = await searchKhoCatalogLoaiAction(code);
    const matchedLoai = loaiRes.success
      ? loaiRes.data.find((x: CSSDLoai) => normalizeCssdCode(x.ma_loai_dung_cu) === code)
      : undefined;
    if (matchedLoai) {
      setCatalog((c) => ({ ...c, loai: loaiRes.success ? loaiRes.data : c.loai }));
      setTab("LOAI");
      setSelectedLoaiId(matchedLoai.id);
      setQ(code);
      toast.success(`Đã tìm thấy loại dụng cụ: ${matchedLoai.ten_loai_dung_cu}`);
      return;
    }

    const toastId = toast.loading("Đang tìm kiếm mã QR quy trình...");
    try {
      const res = await lookupBoDungCuIdByQrAction(code);
      if (res.success && res.boDungCuId) {
        const foundBo = catalog.bo.find((x) => x.id === res.boDungCuId);
        if (foundBo) {
          setTab("BO");
          setSelectedBoId(foundBo.id);
          setQ(code);
          toast.success(`Đã tìm thấy bộ dụng cụ từ mã QR: ${foundBo.ten_bo}`, { id: toastId });
          return;
        }
      }
      toast.error("Không tìm thấy bộ hoặc dụng cụ tương ứng với mã đã quét.", { id: toastId });
    } catch {
      toast.error("Đã xảy ra lỗi khi tìm kiếm mã QR.", { id: toastId });
    }
  }, [catalog.bo]);

  const { boRows, hoaChatRows } = useMemo(() => filterCatalogRows(catalog, q), [catalog, q]);

  const selectedBo = selectedBoId ? catalog.bo.find((x) => x.id === selectedBoId) || null : null;
  const selectedChiTiet = selectedChiTietId ? catalog.chi_tiet.find((x) => x.id === selectedChiTietId) || null : null;
  const selectedLoai = selectedLoaiId ? catalog.loai.find((x) => x.id === selectedLoaiId) || null : null;

  return {
    loading,
    tab,
    setTab,
    catalog,
    q,
    setQ,
    selectedBoId,
    setSelectedBoId,
    selectedChiTietId,
    setSelectedChiTietId,
    selectedLoaiId,
    setSelectedLoaiId,
    reload,
    boRows,
    chiTietRows: catalog.chi_tiet,
    loaiRows: catalog.loai,
    hoaChatRows,
    selectedBo,
    selectedChiTiet,
    selectedLoai,
    chiTietBySelectedBo: [] as CSSDChiTiet[],
    boBySelectedLoai,
    boBySelectedChiTietLoai: boBySelectedLoai,
    handleScan,
  };
}
