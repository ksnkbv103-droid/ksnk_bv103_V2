"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getKhoCatalogPayloadAction } from "../actions/cssd-catalog.actions";
import type { Catalog } from "../types/catalog.types";
import type { DungCuChiTietTableRow } from "@/modules/quan-tri-he-thong/danh-muc/dung-cu/dung-cu-chi-tiet-form-shared";
import { boIdsForLoai, filterCatalogRows, type CatalogTab } from "../views/cssd-catalog-page-helpers";

export function useCssdCatalogPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<CatalogTab>("BO");
  const [catalog, setCatalog] = useState<Catalog>({ bo: [], chi_tiet: [], loai: [], hoa_chat: [] });
  const [q, setQ] = useState("");
  const [selectedBoId, setSelectedBoId] = useState<string | null>(null);
  const [selectedChiTietId, setSelectedChiTietId] = useState<string | null>(null);
  const [selectedLoaiId, setSelectedLoaiId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DungCuChiTietTableRow | null>(null);

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

  const { boRows, chiTietRows, loaiRows, hoaChatRows } = useMemo(() => filterCatalogRows(catalog, q), [catalog, q]);

  const selectedBo = selectedBoId ? catalog.bo.find((x) => x.id === selectedBoId) || null : null;
  const selectedChiTiet = selectedChiTietId ? catalog.chi_tiet.find((x) => x.id === selectedChiTietId) || null : null;
  const selectedLoai = selectedLoaiId ? catalog.loai.find((x) => x.id === selectedLoaiId) || null : null;

  const chiTietBySelectedBo = selectedBoId ? chiTietRows.filter((x) => x.bo_dung_cu_id === selectedBoId) : [];

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
    modalOpen,
    setModalOpen,
    editing,
    setEditing,
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
  };
}
