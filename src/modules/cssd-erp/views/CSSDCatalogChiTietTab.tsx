"use client";

import type { Catalog, CSSDBo, CSSDChiTiet } from "../types/catalog.types";

export function CSSDCatalogChiTietTab(props: {
  catalog: Catalog;
  chiTietRows: CSSDChiTiet[];
  selectedChiTietId: string | null;
  setSelectedChiTietId: (id: string) => void;
  setSelectedLoaiId: (id: string) => void;
  selectedChiTiet: CSSDChiTiet | null;
  boBySelectedChiTietLoai: CSSDBo[];
}) {
  const {
    catalog,
    chiTietRows,
    selectedChiTietId,
    setSelectedChiTietId,
    setSelectedLoaiId,
    selectedChiTiet,
    boBySelectedChiTietLoai,
  } = props;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-black uppercase text-[#026f17]">Dụng cụ chi tiết ({chiTietRows.length})</h3>
        <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-100 bg-white">
          {chiTietRows.map((x) => (
            <button
              key={x.id}
              onClick={() => {
                setSelectedChiTietId(x.id);
                if (x.loai_dung_cu_id) setSelectedLoaiId(x.loai_dung_cu_id);
              }}
              className={`w-full border-l-4 px-3 py-3 text-left transition-colors ${selectedChiTietId === x.id ? "border-l-sky-500 bg-sky-50/70" : "border-l-transparent border-b border-slate-100 hover:bg-slate-50"}`}
            >
              <p className="text-[10px] font-black text-indigo-600">{x.ma_chi_tiet || "—"}</p>
              <p className="text-sm font-bold text-slate-800">{x.ten_chi_tiet || "—"}</p>
            </button>
          ))}
          {chiTietRows.length === 0 && <p className="p-4 text-sm text-slate-500">Không có dữ liệu dụng cụ chi tiết.</p>}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-black uppercase text-[#026f17]">Thông tin dụng cụ chi tiết đã chọn</h3>
        {!selectedChiTiet ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Chọn một dụng cụ chi tiết ở cột trái để xem loại, mã, số lượng và bộ chứa.
          </div>
        ) : (
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <strong>Mã chi tiết:</strong> {selectedChiTiet.ma_chi_tiet || "—"}
            </p>
            <p>
              <strong>Tên chi tiết:</strong> {selectedChiTiet.ten_chi_tiet || "—"}
            </p>
            <p>
              <strong>Loại:</strong> {selectedChiTiet.ten_loai || "Chưa gắn loại"}
            </p>
            <p>
              <strong>Mã loại:</strong>{" "}
              {catalog.loai.find((l) => l.id === selectedChiTiet.loai_dung_cu_id)?.ma_loai_dung_cu || "—"}
            </p>
            <p>
              <strong>Số lượng:</strong> {selectedChiTiet.so_luong ?? "—"}
            </p>
            <p>
              <strong>Nằm trong bộ:</strong> {selectedChiTiet.ten_bo || "Dụng cụ lẻ / chưa gắn bộ"}
            </p>
            <p>
              <strong>Các bộ cùng loại:</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              {boBySelectedChiTietLoai.length ? (
                boBySelectedChiTietLoai.map((b) => (
                  <span
                    key={b.id}
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700"
                  >
                    {b.ma_bo} {b.ten_bo ? `· ${b.ten_bo}` : ""}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-500">Chưa có bộ nào cùng loại.</span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
