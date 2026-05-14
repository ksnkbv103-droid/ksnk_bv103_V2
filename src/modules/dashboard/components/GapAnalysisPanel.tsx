import React from "react";

type Props = {
  title: string;
  kq: { ten: string; ty_le: number; tong: number }[];
  cheo: { ten: string; ty_le: number; tong: number }[];
  tgs: { ten: string; ty_le: number; tong: number }[];
};

export function GapAnalysisPanel({ title, kq, cheo, tgs }: Props) {
  const mergedMap = new Map<string, { kq: number | null; cheo: number | null; tgs: number | null; gap: number | null }>();

  // Khởi tạo từ tất cả các nguồn để không sót khoa nào
  const allKhoas = new Set([...kq, ...cheo, ...tgs].map(x => x.ten));
  
  allKhoas.forEach(ten => {
    const fKq = kq.find(x => x.ten === ten);
    const fCheo = cheo.find(x => x.ten === ten);
    const fTgs = tgs.find(x => x.ten === ten);

    // Chỉ coi là có dữ liệu nếu tổng quan sát > 0
    const vKq = fKq && fKq.tong > 0 ? fKq.ty_le : null;
    const vCheo = fCheo && fCheo.tong > 0 ? fCheo.ty_le : null;
    const vTgs = fTgs && fTgs.tong > 0 ? fTgs.ty_le : null;

    // Chỉ tính Gap nếu CẢ HAI bên (Tự GS và Chuyên trách) đều có dữ liệu
    let gap: number | null = null;
    if (vKq !== null && vTgs !== null) {
      gap = vTgs - vKq;
    }

    mergedMap.set(ten, { kq: vKq, cheo: vCheo, tgs: vTgs, gap });
  });

  const rows = Array.from(mergedMap.entries())
    .map(([ten, vals]) => ({ ten, ...vals }))
    .sort((a, b) => {
      if (a.gap === null) return 1;
      if (b.gap === null) return -1;
      return b.gap - a.gap;
    });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[var(--shadow-app-soft)]">
      <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-slate-800">{title} — Đối soát tỉ lệ tuân thủ</h3>
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th className="px-6 py-4">Đơn vị (Khoa)</th>
              <th className="px-6 py-4 text-[#026f17]">Chuyên trách (KSNK)</th>
              <th className="px-6 py-4 text-[#0ea5e9]">Giám sát chéo</th>
              <th className="px-6 py-4 text-[#f59e0b]">Tự giám sát</th>
              <th className="px-6 py-4 text-right">Độ lệch (Gap)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.ten} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-700">{r.ten}</td>
                <td className="px-6 py-4 font-black text-[#026f17]">{r.kq !== null ? `${r.kq}%` : <span className="text-slate-300 font-normal">N/A</span>}</td>
                <td className="px-6 py-4 font-black text-[#0ea5e9]">{r.cheo !== null ? `${r.cheo}%` : <span className="text-slate-300 font-normal">N/A</span>}</td>
                <td className="px-6 py-4 font-black text-[#f59e0b]">{r.tgs !== null ? `${r.tgs}%` : <span className="text-slate-300 font-normal">N/A</span>}</td>
                <td className="px-6 py-4 text-right">
                  {r.gap !== null ? (
                    <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[10px] font-black ${
                      Math.abs(r.gap) > 15 ? "bg-red-100 text-red-700" : 
                      Math.abs(r.gap) > 5 ? "bg-amber-100 text-amber-700" : 
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {r.gap > 0 ? "+" : ""}{r.gap}%
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-300">Không đủ dữ liệu</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                  Chưa có đủ dữ liệu đối soát
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
