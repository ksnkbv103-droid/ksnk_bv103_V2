"use client";

import type { CSSDBo, CSSDChiTiet } from "../types/catalog.types";
import type { CatalogTab } from "./cssd-catalog-page-helpers";

export function CSSDCatalogBoTab(props: {
  boRows: CSSDBo[];
  chiTietBySelectedBo: CSSDChiTiet[];
  selectedBoId: string | null;
  setSelectedBoId: (id: string) => void;
  selectedBo: CSSDBo | null;
  setSelectedChiTietId: (id: string) => void;
  setSelectedLoaiId: (id: string) => void;
  setTab: (t: CatalogTab) => void;
}) {
  const {
    boRows,
    chiTietBySelectedBo,
    selectedBoId,
    setSelectedBoId,
    selectedBo,
    setSelectedChiTietId,
    setSelectedLoaiId,
    setTab,
  } = props;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-black uppercase text-[#026f17]">Bộ dụng cụ ({boRows.length})</h3>
        <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-100 bg-white">
          {boRows.map((x) => (
            <button
              key={x.id}
              onClick={() => setSelectedBoId(x.id)}
              className={`w-full border-l-4 px-3 py-3 text-left transition-colors ${selectedBoId === x.id ? "border-l-emerald-500 bg-emerald-50/70" : "border-l-transparent border-b border-slate-100 hover:bg-slate-50"}`}
            >
              <p className="text-[10px] font-black text-slate-400">{x.ma_bo || "—"}</p>
              <p className="text-sm font-bold text-slate-800">{x.ten_bo || "—"}</p>
            </button>
          ))}
          {boRows.length === 0 && <p className="p-4 text-sm text-slate-500">Không có dữ liệu bộ dụng cụ khớp bộ lọc.</p>}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-black uppercase text-[#026f17]">
          Chi tiết thuộc bộ {selectedBo ? `${selectedBo.ma_bo} (${chiTietBySelectedBo.length})` : "(chưa chọn bộ)"}
        </h3>
        {!selectedBo ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Chọn một bộ dụng cụ ở cột trái để xem toàn bộ dụng cụ chi tiết trong bộ.
          </div>
        ) : (
          <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-100 bg-white">
            {chiTietBySelectedBo.map((x) => (
              <button
                key={x.id}
                onClick={() => {
                  setSelectedChiTietId(x.id);
                  if (x.loai_dung_cu_id) setSelectedLoaiId(x.loai_dung_cu_id);
                  setTab("CHI_TIET");
                }}
                className="w-full border-b border-slate-100 px-3 py-3 text-left transition-colors hover:bg-slate-50"
              >
                <p className="text-[10px] font-black text-indigo-600">{x.ma_chi_tiet || "—"}</p>
                <p className="text-sm font-bold text-slate-800">{x.ten_chi_tiet || "—"}</p>
                <p className="text-[10px] text-slate-500">{x.ten_loai || "Chưa gắn loại"}</p>
              </button>
            ))}
            {chiTietBySelectedBo.length === 0 && (
              <p className="p-4 text-sm text-slate-500">Bộ này chưa có dòng dụng cụ chi tiết nào.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
