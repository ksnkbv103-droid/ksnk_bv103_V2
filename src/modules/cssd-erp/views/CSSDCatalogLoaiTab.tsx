"use client";

import type { CSSDBo, CSSDLoai } from "../types/catalog.types";

export function CSSDCatalogLoaiTab(props: {
  loaiRows: CSSDLoai[];
  selectedLoaiId: string | null;
  setSelectedLoaiId: (id: string) => void;
  selectedLoai: CSSDLoai | null;
  boBySelectedLoai: CSSDBo[];
}) {
  const { loaiRows, selectedLoaiId, setSelectedLoaiId, selectedLoai, boBySelectedLoai } = props;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-black uppercase text-[#026f17]">Loại dụng cụ ({loaiRows.length})</h3>
        <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-100 bg-white">
          {loaiRows.map((x) => (
            <button
              key={x.id}
              onClick={() => setSelectedLoaiId(x.id)}
              className={`w-full border-l-4 px-3 py-3 text-left transition-colors ${selectedLoaiId === x.id ? "border-l-violet-500 bg-violet-50/70" : "border-l-transparent border-b border-slate-100 hover:bg-slate-50"}`}
            >
              <p className="text-[10px] font-black text-violet-600">{x.ma_loai_dung_cu || "—"}</p>
              <p className="text-sm font-bold text-slate-800">{x.ten_loai_dung_cu || "—"}</p>
            </button>
          ))}
          {loaiRows.length === 0 && <p className="p-4 text-sm text-slate-500">Không có dữ liệu loại dụng cụ.</p>}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-black uppercase text-[#026f17]">
          Bộ chứa loại đã chọn {selectedLoai ? `(${selectedLoai.ma_loai_dung_cu})` : ""}
        </h3>
        {!selectedLoaiId ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Chọn một loại dụng cụ ở cột trái để xem các bộ chứa loại đó.
          </div>
        ) : boBySelectedLoai.length ? (
          <div className="flex flex-wrap gap-2">
            {boBySelectedLoai.map((b) => (
              <span
                key={b.id}
                className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700"
              >
                {b.ma_bo} {b.ten_bo ? `· ${b.ten_bo}` : ""}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Chưa có bộ nào chứa loại này.</p>
        )}
      </section>
    </div>
  );
}
