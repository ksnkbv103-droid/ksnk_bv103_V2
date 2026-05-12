"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getRegistryEntryOrNull } from "@/lib/master-data/domain-registry";
import {
  mdmListGenericDm,
  mdmSoftDeleteGenericDm,
  mdmToggleGenericDm,
  mdmUpsertGenericDm,
} from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";
import { useGenericDmMaSuggest } from "./useGenericDmMaSuggest";
import { buildGenericDmColumns, type GenericDmRow } from "../views/generic-dm-master-columns";

export function useGenericDmMasterPageModel(loaiDanhMuc: string, canMutate: boolean, canDelete: boolean) {
  const key = loaiDanhMuc.trim();
  const reg = useMemo(() => getRegistryEntryOrNull(key), [key]);
  const [rows, setRows] = useState<GenericDmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<GenericDmRow | null>(null);
  const [ma, setMa] = useState("");
  const [ten, setTen] = useState("");
  const [active, setActive] = useState(true);
  const { suggestLoading, fillSuggestedMa } = useGenericDmMaSuggest(key);

  const load = useCallback(async () => {
    if (!reg) return;
    setLoading(true);
    const res = await mdmListGenericDm(key);
    if (!res.success) toast.error((res as { error?: string }).error || "Không tải được dữ liệu.");
    setRows(res.success ? ((res as { data?: GenericDmRow[] }).data || []) : []);
    setLoading(false);
  }, [key, reg]);

  useEffect(() => {
    void load();
  }, [load]);

  const maCol = reg?.maColumn ?? "ma";
  const tenCol = reg?.tenColumn ?? "ten";

  const openCreate = useCallback(async () => {
    setEditRow(null);
    setTen("");
    setActive(true);
    setModalOpen(true);
    setMa("");
    if (canMutate) {
      const next = await fillSuggestedMa();
      if (next) setMa(next);
    }
  }, [canMutate, fillSuggestedMa]);

  const openEdit = useCallback(
    (r: GenericDmRow) => {
      setEditRow(r);
      setMa(String(r[maCol] ?? ""));
      setTen(String(r[tenCol] ?? ""));
      setActive(Boolean(r.is_active ?? true));
      setModalOpen(true);
    },
    [maCol, tenCol]
  );

  const save = useCallback(async () => {
    if (!reg || !ma.trim() || !ten.trim()) {
      toast.error("Nhập đủ mã và tên.");
      return;
    }
    const id = editRow?.id ? String(editRow.id) : null;
    const res = await mdmUpsertGenericDm(key, id, ma, ten, active);
    if (!res.success) {
      toast.error((res as { error?: string }).error || "Không lưu được.");
      return;
    }
    toast.success("Đã lưu.");
    setModalOpen(false);
    void load();
  }, [reg, ma, ten, active, editRow, key, load]);

  const onToggle = useCallback(
    async (r: GenericDmRow) => {
      const res = await mdmToggleGenericDm(key, String(r.id), Boolean(r.is_active));
      if (!res.success) toast.error((res as { error?: string }).error || "Lỗi cập nhật.");
      else {
        toast.success("Đã cập nhật trạng thái.");
        void load();
      }
    },
    [key, load]
  );

  const onSoftDelete = useCallback(
    async (r: GenericDmRow) => {
      const label = String(r[tenCol] ?? r.id);
      if (!window.confirm(`Xóa mềm "${label}"?`)) return;
      const res = await mdmSoftDeleteGenericDm(key, String(r.id));
      if (!res.success) toast.error((res as { error?: string }).error || "Không xóa được.");
      else {
        toast.success("Đã xóa mềm.");
        void load();
      }
    },
    [key, load, tenCol]
  );

  const columns = useMemo(
    () =>
      buildGenericDmColumns(
        maCol,
        tenCol,
        canMutate,
        canDelete,
        onToggle,
        openEdit,
        canDelete ? onSoftDelete : undefined,
      ),
    [maCol, tenCol, canMutate, canDelete, onToggle, openEdit, onSoftDelete]
  );

  return {
    reg,
    key,
    rows,
    loading,
    modalOpen,
    setModalOpen,
    editRow,
    ma,
    setMa,
    ten,
    setTen,
    active,
    setActive,
    suggestLoading,
    fillSuggestedMa,
    load,
    openCreate,
    openEdit,
    save,
    columns,
  };
}
