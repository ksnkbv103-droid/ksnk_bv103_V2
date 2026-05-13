import React from "react";

type Props = {
  khoaOptions: { id: string; label: string }[];
  participation: { id: string; ten: string; so_phien: number }[];
};

export function ParticipationStats({ khoaOptions, participation }: Props) {
  const partKhoaIds = participation.filter((p) => p.so_phien > 0).map((p) => p.id);
  const missingKhoas = khoaOptions.filter((k) => !partKhoaIds.includes(k.id));

  const total = khoaOptions.length;
  const participated = partKhoaIds.length;
  const rate = total > 0 ? Math.round((participated * 100) / total) : 0;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-center">
        <p className="mb-2 text-sm font-bold uppercase text-emerald-800">Độ phủ Khoa Tự Giám Sát</p>
        <p className="text-5xl font-black text-emerald-600">{rate}%</p>
        <p className="mt-2 font-medium text-emerald-700">
          {participated} / {total} Khoa có thực hiện
        </p>
      </div>
      <div className="rounded-xl border border-red-100 bg-red-50 p-5">
        <p className="mb-3 text-sm font-bold uppercase text-red-800">Danh sách Khoa trắng số liệu (0 phiên tự giám sát)</p>
        <div className="custom-scrollbar max-h-[140px] overflow-y-auto pr-2">
          {missingKhoas.length === 0 ? (
            <p className="text-sm font-bold text-emerald-600">Tuyệt vời! 100% Khoa đều tự giám sát.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {missingKhoas.map((k) => (
                <li key={k.id} className="rounded border border-red-100 bg-white px-2 py-1 text-xs font-semibold text-red-600 shadow-sm">
                  {k.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
