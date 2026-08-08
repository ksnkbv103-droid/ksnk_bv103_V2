"use client";

import React from "react";
import PrintLayout from "@/components/shared/PrintLayout";
import { parseMoTaToQlcvChecklist } from "@/lib/domain/qlcv-checklist";
import { buildPrintFileTitle } from "@/lib/print/print-file-title";
import type { DinhKyMauForPeriod } from "../../lib/qlcv-dinh-ky-period-match";
import { spawnDatesInPeriod } from "../../lib/qlcv-dinh-ky-period-match";
import type { QlcvPeriodRange } from "../../lib/qlcv-period-range";

type Props = {
  period: QlcvPeriodRange;
  /** Mẫu active (ưu tiên cả mẫu đến hạn trong kỳ; nếu rỗng vẫn in toàn bộ mẫu active). */
  maus: DinhKyMauForPeriod[];
};

function labelChuKy(ma: string): string {
  if (ma === "DAILY") return "Hàng ngày";
  if (ma === "WEEKLY") return "Hàng tuần";
  if (ma === "MONTHLY") return "Hàng tháng";
  if (ma === "QUARTERLY") return "Hàng quý";
  if (ma === "YEARLY") return "Hàng năm";
  return ma;
}

export function QlcvPeriodPlanPrintView({ period, maus }: Props) {
  const chuKySet = [...new Set(maus.map((m) => String(m.ma_chu_ky || "").trim()).filter(Boolean))];
  const chuKyPart = chuKySet.length === 1 ? chuKySet[0]! : period.kind;
  const printMa = `${chuKyPart}_${period.startIso.slice(0, 7)}`;

  return (
    <PrintLayout
      title="BẢNG NỘI DUNG CÔNG VIỆC ĐỊNH KỲ (KẾ HOẠCH)"
      subtitle={period.label}
      leftSignatureTitle="NGƯỜI LẬP"
      rightSignatureTitle="THỦ TRƯỞNG ĐƠN VỊ"
      density="compact"
      fileTitle={() => buildPrintFileTitle({ loai: "KHCV", ma: printMa })}
    >
      <p style={{ fontSize: 12, marginBottom: 12 }}>
        Kế hoạch mẫu định kỳ — phổ biến / quán triệt / lưu trữ. Cột «Ngày trong kỳ» = ngày hệ thống sẽ (hoặc đã) sinh
        phiếu.
      </p>
      {maus.length === 0 ? (
        <p style={{ fontSize: 13, fontStyle: "italic" }}>
          Chưa có mẫu định kỳ đang bật. Vào tab Việc định kỳ để thêm mẫu rồi in lại.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: "6%" }}>STT</th>
              <th style={{ ...th, width: "20%" }}>Tiêu đề mẫu</th>
              <th style={{ ...th, width: "12%" }}>Chu kỳ</th>
              <th style={{ ...th, width: "14%" }}>Vị trí</th>
              <th style={{ ...th, width: "16%" }}>Ngày trong kỳ</th>
              <th style={{ ...th, width: "32%" }}>Nội dung checklist</th>
            </tr>
          </thead>
          <tbody>
            {maus.map((m, i) => {
              const dates = spawnDatesInPeriod(m, period);
              const items = parseMoTaToQlcvChecklist(m.mo_ta);
              return (
                <tr key={m.id}>
                  <td style={td}>{i + 1}</td>
                  <td style={td}>
                    <strong>{m.tieu_de}</strong>
                  </td>
                  <td style={td}>{labelChuKy(m.ma_chu_ky)}</td>
                  <td style={td}>{m.vi_tri_thuc_hien || "—"}</td>
                  <td style={td}>{dates.length ? dates.join(", ") : "— (không sinh trong kỳ)"}</td>
                  <td style={td}>
                    {items.length === 0 ? (
                      <em>Chưa có checklist</em>
                    ) : (
                      <ol style={{ margin: 0, paddingLeft: 18 }}>
                        {items.map((it) => (
                          <li key={it.id}>☐ {it.label}</li>
                        ))}
                      </ol>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </PrintLayout>
  );
}

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "5px 6px",
  textAlign: "left",
  background: "#fff",
  wordBreak: "break-word",
};
const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "5px 6px",
  verticalAlign: "top",
  wordBreak: "break-word",
};
