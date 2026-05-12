"use client";

import { AlertTriangle } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { Bv103ResponsiveChart } from "@/components/charts/Bv103ResponsiveChart";

type ErrorBreakdown = {
  ty_le_dung_ky_thuat?: number | null;
  ty_le_du_thoi_gian?: number | null;
  loi_ky_thuat?: number | null;
  loi_thoi_gian?: number | null;
  lam_dung_gang?: number | null;
};

export function VstDashboardQualitySection({
  error,
  nCaDat,
  nBoSotTong,
  nDungKyThuat,
  nDuThoiGian,
  nLamDungGang,
  tyLeLamDungGangTheoBoSot,
}: {
  error: ErrorBreakdown | undefined;
  nCaDat: number;
  nBoSotTong: number;
  nDungKyThuat: number;
  nDuThoiGian: number;
  nLamDungGang: number;
  tyLeLamDungGangTheoBoSot: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm col-span-1 lg:col-span-3">
      <h3 className="mb-6 text-sm font-bold uppercase text-slate-800">Chất lượng Tuân thủ (Tính trên số ca Đạt)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex flex-col items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
          <p className="text-[11px] font-bold uppercase text-emerald-800 mb-2">Đúng kỹ thuật</p>
          <div className="relative h-24 w-24 min-w-0">
            <Bv103ResponsiveChart className="h-full w-full">
              <PieChart>
                <Pie
                  data={[
                    { value: error?.ty_le_dung_ky_thuat || 0 },
                    { value: 100 - (error?.ty_le_dung_ky_thuat || 0) },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={40}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#d1fae5" />
                </Pie>
              </PieChart>
            </Bv103ResponsiveChart>
            <div className="absolute inset-0 flex items-center justify-center font-black text-emerald-700">
              {error?.ty_le_dung_ky_thuat || 0}%
            </div>
          </div>
          <p className="text-xs text-emerald-600 font-semibold mt-2">
            {nDungKyThuat} / {nCaDat} ca đạt đúng kỹ thuật
          </p>
        </div>

        <div className="flex flex-col items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
          <p className="text-[11px] font-bold uppercase text-emerald-800 mb-2">Đủ thời gian</p>
          <div className="relative h-24 w-24 min-w-0">
            <Bv103ResponsiveChart className="h-full w-full">
              <PieChart>
                <Pie
                  data={[
                    { value: error?.ty_le_du_thoi_gian || 0 },
                    { value: 100 - (error?.ty_le_du_thoi_gian || 0) },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={40}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#d1fae5" />
                </Pie>
              </PieChart>
            </Bv103ResponsiveChart>
            <div className="absolute inset-0 flex items-center justify-center font-black text-emerald-700">
              {error?.ty_le_du_thoi_gian || 0}%
            </div>
          </div>
          <p className="text-xs text-emerald-600 font-semibold mt-2">
            {nDuThoiGian} / {nCaDat} ca đạt đủ thời gian
          </p>
        </div>

        <div className="flex flex-col items-center p-4 bg-fuchsia-50 rounded-2xl border border-fuchsia-100 col-span-1 md:col-span-2">
          <AlertTriangle className="h-6 w-6 text-fuchsia-600 mb-2" />
          <p className="text-xs font-bold uppercase text-fuchsia-800">Cảnh báo: Lạm dụng găng tay</p>
          <p className="mt-2 text-3xl font-black text-fuchsia-700">{tyLeLamDungGangTheoBoSot}%</p>
          <p className="text-sm text-fuchsia-600 font-semibold mt-1">
            {nLamDungGang} / {nBoSotTong} cơ hội bỏ sót có lạm dụng găng
          </p>
          <p className="text-[11px] text-fuchsia-500 mt-2 text-center">
            % = số cơ hội bỏ sót có đeo găng không đúng chỉ định ÷ tổng cơ hội bỏ sót (cùng mẫu số với thẻ &quot;Bỏ sót&quot;).
          </p>
        </div>
      </div>
    </div>
  );
}
