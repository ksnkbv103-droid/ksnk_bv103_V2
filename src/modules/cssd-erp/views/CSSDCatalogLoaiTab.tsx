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
      <section className="rounded-2xl border border-slate-100 bg-white p-4">
        <h3 className="mb-3 text-xs font-black uppercase text-[#026f17]">Loại dụng cụ ({loaiRows.length})</h3>
        <div className="max-h-[520px] overflow-auto space-y-2">
          {loaiRows.map((x) => (
            <button
              key={x.id}
              onClick={() => setSelectedLoaiId(x.id)}
              className={`w-full rounded-xl border p-3 text-left ${selectedLoaiId === x.id ? "border-violet-300 bg-violet-50" : "border-slate-100"}`}
            >
              <p className="text-[10px] font-black text-violet-600">{x.ma_loai_dung_cu || "—"}</p>
              <p className="text-sm font-bold text-slate-800">{x.ten_loai_dung_cu || "—"}</p>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-100 bg-white p-4">
        <h3 className="mb-3 text-xs font-black uppercase text-[#026f17]">
          Bộ chứa loại đã chọn {selectedLoai ? `(${selectedLoai.ma_loai_dung_cu})` : ""}
        </h3>
        {!selectedLoaiId ? (
          <p className="text-sm text-slate-500">Chọn một loại dụng cụ để xem các bộ chứa loại đó.</p>
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
