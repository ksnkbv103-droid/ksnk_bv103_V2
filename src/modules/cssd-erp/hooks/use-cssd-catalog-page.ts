"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getKhoCatalogPayloadAction, lookupBoDungCuIdByQrAction } from "../actions/cssd-catalog.actions";
import type { Catalog } from "../types/catalog.types";
import { boIdsForLoai, filterCatalogRows, type CatalogTab } from "../views/cssd-catalog-page-helpers";

export function useCssdCatalogPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<CatalogTab>("BO");
  const [catalog, setCatalog] = useState<Catalog>({ bo: [], chi_tiet: [], loai: [], hoa_chat: [] });
  const [q, setQ] = useState("");
  const [selectedBoId, setSelectedBoId] = useState<string | null>(null);
  const [selectedChiTietId, setSelectedChiTietId] = useState<string | null>(null);
  const [selectedLoaiId, setSelectedLoaiId] = useState<string | null>(null);
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

  const handleScan = useCallback(async (val: string) => {
    const code = val.trim();
    if (!code) return;

    // 1. Tìm chính xác mã bộ (ma_bo) trong danh mục
    const matchedBo = catalog.bo.find(
      (x) => x.ma_bo?.toLowerCase() === code.toLowerCase()
    );
    if (matchedBo) {
      setTab("BO");
      setSelectedBoId(matchedBo.id);
      setQ("");
      toast.success(`Đã tìm thấy bộ dụng cụ: ${matchedBo.ten_bo}`);
      return;
    }

    // 2. Tìm chính xác mã chi tiết (ma_chi_tiet) trong danh mục
    const matchedChiTiet = catalog.chi_tiet.find(
      (x) => x.ma_chi_tiet?.toLowerCase() === code.toLowerCase()
    );
    if (matchedChiTiet) {
      setTab("CHI_TIET");
      setSelectedChiTietId(matchedChiTiet.id);
      setQ("");
      toast.success(`Đã tìm thấy dụng cụ chi tiết: ${matchedChiTiet.ten_chi_tiet}`);
      return;
    }

    // 3. Tìm chính xác mã loại (ma_loai_dung_cu) trong danh mục
    const matchedLoai = catalog.loai.find(
      (x) => x.ma_loai_dung_cu?.toLowerCase() === code.toLowerCase()
    );
    if (matchedLoai) {
      setTab("LOAI");
      setSelectedLoaiId(matchedLoai.id);
      setQ("");
      toast.success(`Đã tìm thấy loại dụng cụ: ${matchedLoai.ten_loai_dung_cu}`);
      return;
    }

    // 4. Nếu không khớp trực tiếp mã danh mục, kiểm tra xem có phải là mã QR quy trình (mã QR dán trên bộ) không
    const toastId = toast.loading("Đang tìm kiếm mã QR quy trình...");
    try {
      const res = await lookupBoDungCuIdByQrAction(code);
      if (res.success && res.boDungCuId) {
        const foundBo = catalog.bo.find((x) => x.id === res.boDungCuId);
        if (foundBo) {
          setTab("BO");
          setSelectedBoId(foundBo.id);
          setQ("");
          toast.success(`Đã tìm thấy bộ dụng cụ từ mã QR: ${foundBo.ten_bo}`, { id: toastId });
          return;
        }
      }
      toast.error("Không tìm thấy bộ hoặc dụng cụ tương ứng với mã đã quét.", { id: toastId });
    } catch {
      toast.error("Đã xảy ra lỗi khi tìm kiếm mã QR.", { id: toastId });
    }
  }, [catalog]);

  const { boRows, chiTietRows, loaiRows, hoaChatRows } = useMemo(() => filterCatalogRows(catalog, q), [catalog, q]);

  const selectedBo = selectedBoId ? catalog.bo.find((x) => x.id === selectedBoId) || null : null;
  const selectedChiTiet = selectedChiTietId ? catalog.chi_tiet.find((x) => x.id === selectedChiTietId) || null : null;
  const selectedLoai = selectedLoaiId ? catalog.loai.find((x) => x.id === selectedLoaiId) || null : null;

  const chiTietBySelectedBo = selectedBoId ? catalog.chi_tiet.filter((x) => x.bo_dung_cu_id === selectedBoId) : [];

  const boBySelectedLoai = useMemo(() => {
    const boIds = boIdsForLoai(catalog, selectedLoaiId);
    return catalog.bo.filter((x) => boIds.includes(x.id));
  }, [catalog, selectedLoaiId]);

  const boBySelectedChiTietLoai = useMemo(() => {
    const lid = selectedChiTiet?.loai_dung_cu_id;
    if (!lid) return [];
    const boIds = boIdsForLoai(catalog, lid);
    return catalog.bo.filter((x) => boIds.includes(x.id));
  }, [catalog, selectedChiTiet?.loai_dung_cu_id]);

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
    chiTietRows,
    loaiRows,
    hoaChatRows,
    selectedBo,
    selectedChiTiet,
    selectedLoai,
    chiTietBySelectedBo,
    boBySelectedLoai,
    boBySelectedChiTietLoai,
    handleScan,
  };
}
