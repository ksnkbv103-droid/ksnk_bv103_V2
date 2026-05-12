"use client";

import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { MdmActiveToggle } from "@/components/shared/MdmActiveToggle";

interface ActionUiConfig<T> {
  onToggleStatus: (item: T) => void | Promise<void>;
  onEdit: (item: T) => void | Promise<void>;
  onDelete: (item: T) => void | Promise<void>;
  getIsActive?: (item: T) => boolean;
  /** Mặc định true; false = ẩn nút hoặc hiển thị trạng thái chỉ đọc */
  capabilities?: { edit?: boolean; delete?: boolean; toggleActive?: boolean };
}

export function useTableActionUi<T>(config: ActionUiConfig<T>) {
  const ce = config.capabilities?.edit !== false;
  const cd = config.capabilities?.delete !== false;
  const ct = config.capabilities?.toggleActive !== false;

  const getActive = (item: T) =>
    config.getIsActive
      ? config.getIsActive(item)
      : Boolean((item as Record<string, unknown>).is_active);

  const renderStatusCell = (item: T) => {
    const isActive = getActive(item);
    if (!ct) {
      return (
        <span className="text-[10px] font-bold uppercase text-slate-500">
          {isActive ? "Hoạt động" : "Ngưng"}
        </span>
      );
    }
    return (
      <div onClick={(e) => e.stopPropagation()} className="inline-flex" role="presentation">
        <MdmActiveToggle
          active={isActive}
          onToggle={() => void config.onToggleStatus(item)}
          size="sm"
        />
      </div>
    );
  };

  const renderManagementCell = (item: T) => {
    if (!ce && !cd) {
      return <span className="text-[10px] text-slate-400 font-bold uppercase">—</span>;
    }
    return (
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()} role="presentation">
        {ce ? (
          <button
            type="button"
            onClick={() => config.onEdit(item)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="Sửa"
          >
            <Edit2 size={14} />
          </button>
        ) : null}
        {cd ? (
          <button
            type="button"
            onClick={() => config.onDelete(item)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
            title="Xóa mềm"
          >
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>
    );
  };

  return { renderStatusCell, renderManagementCell };
}
