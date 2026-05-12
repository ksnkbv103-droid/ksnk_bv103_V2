"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { DM_HUB_LABELS } from "@/lib/master-data/domain-registry";
import GenericDmEditModal from "./GenericDmEditModal";
import GenericDmHubRedirectBanner from "./GenericDmHubRedirectBanner";
import GenericDmMasterDataTable from "./GenericDmMasterDataTable";
import GenericDmMasterHeader from "./GenericDmMasterHeader";
import { useGenericDmMasterPageModel } from "../hooks/useGenericDmMasterPageModel";
import { useModulePermission } from "@/hooks/useModulePermission";

export default function GenericDmMasterPage({ loaiDanhMuc }: { loaiDanhMuc: string }) {
  const router = useRouter();
  const { loading: permLoading, allowed } = useModulePermission("DANH_MUC");
  const canMutate = allowed.create || allowed.edit;
  const canDelete = allowed.delete;
  const m = useGenericDmMasterPageModel(loaiDanhMuc, canMutate, canDelete);
  const title = DM_HUB_LABELS[m.key] || loaiDanhMuc;

  if (!m.reg) {
    return (
      <div className="p-10 text-center text-red-600 font-bold">
        Loại danh mục không hợp lệ: {loaiDanhMuc}
      </div>
    );
  }

  if (permLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#026f17] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-500">
      <GenericDmHubRedirectBanner registryKey={m.key} />
      <GenericDmMasterHeader
        title={title}
        sourceTable={m.reg.sourceTable}
        registryKey={m.key}
        onBack={() => router.push("/quan-tri-he-thong")}
        onCreate={() => void m.openCreate()}
        canCreate={canMutate}
      />
      <GenericDmMasterDataTable
        columns={m.columns}
        rows={m.rows}
        loading={m.loading}
        canDelete={canDelete}
        registryKey={m.key}
        onReload={() => void m.load()}
        onRowClick={(row) => {
          if (canMutate) m.openEdit(row);
        }}
      />
      <GenericDmEditModal
        open={m.modalOpen}
        editMode={Boolean(m.editRow)}
        ma={m.ma}
        ten={m.ten}
        active={m.active}
        onMa={m.setMa}
        onTen={m.setTen}
        onActive={m.setActive}
        onClose={() => m.setModalOpen(false)}
        onSave={() => void m.save()}
        onSuggestMa={
          !m.editRow && canMutate
            ? async () => {
                const x = await m.fillSuggestedMa();
                if (x) m.setMa(x);
              }
            : undefined
        }
        suggestLoading={m.suggestLoading}
      />
    </div>
  );
}
