import { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";

type PrintParams = {
  reportNo: string;
  issueDate: string;
  tuNgay: string;
  denNgay: string;
  selectedKhoaIds: string[];
  khoaOptions: MultiSelectOption[];
  selectedNgheIds: string[];
  ngheOptions: MultiSelectOption[];
  selectedKhuVucIds: string[];
  khuVucOptions: MultiSelectOption[];
  selectedBangKiemMas: string[];
  vstPayload: any;
  compliancePayloads: any;
  bkLabelMap: Map<string, string>;
  nhanXetDanhGia: string;
  kienNghiDeXuat: string;
};

// Vẽ biểu đồ thanh ngang bằng CSS (Đảm bảo luôn in được)
const renderRateBars = (rows: Array<{ ten: string; ty_le: number }>, color = "#026f17") =>
  (rows || [])
    .slice(0, 10)
    .map(
      (x) => `
      <div style="margin:8px 0">
        <div style="display:flex; justify-content:space-between; margin-bottom:2px; font-size:10px">
          <span style="font-weight:600">${x.ten}</span><span>${x.ty_le}%</span>
        </div>
        <div style="height:6px; background:#f1f5f9; border-radius:3px; overflow:hidden">
          <div style="height:100%; width:${Math.min(100, Math.max(0, x.ty_le))}%; background:${color}"></div>
        </div>
      </div>`,
    )
    .join("");

const pickLabels = (ids: string[], options: MultiSelectOption[]) =>
  ids?.length && ids.length < options?.length ? options.filter((o) => ids.includes(o.id)).map((o) => o.label).join(", ") : "Tất cả";

export function getDashboardPrintHtml(p: PrintParams) {
  // Chuyển đổi payloads thành mảng để in
  const complianceItems = Object.entries(p.compliancePayloads)
    .map(([key, payload]: [string, any]) => ({
      key,
      label: key === "_ALL" ? "Tổng hợp Giám sát chung" : (p.bkLabelMap.get(key) || key),
      data: payload
    }))
    .filter(item => item.data && item.data.summary.tong_phien > 0);

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Báo cáo KSNK - Bệnh viện 103</title>
  <style>
    @page { size: A4; margin: 15mm 15mm 20mm 20mm; }
    body { font-family: "Times New Roman", Times, serif; color: #1e293b; font-size: 13px; line-height: 1.5; margin: 0; padding: 0; }
    .page-break { page-break-before: always; }
    .header { display: flex; justify-content: space-between; border-bottom: 1.5pt solid #026f17; padding-bottom: 10px; margin-bottom: 20px; }
    .header-left { text-align: center; width: 45%; }
    .header-right { text-align: center; width: 45%; }
    .report-title { text-align: center; margin: 30px 0; }
    .report-title h1 { font-size: 20px; margin: 0; color: #026f17; text-transform: uppercase; font-weight: bold; }
    .report-title p { margin: 5px 0; font-style: italic; font-size: 14px; }
    
    h2 { font-size: 16px; color: #026f17; border-left: 4pt solid #026f17; padding-left: 10px; margin: 25px 0 15px; text-transform: uppercase; }
    h3 { font-size: 14px; color: #334155; margin: 15px 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }

    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
    .kpi-card { border: 1px solid #e2e8f0; padding: 10px; text-align: center; border-radius: 8px; background: #f8fafc; }
    .kpi-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
    .kpi-value { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 5px; }

    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: bold; color: #334155; font-size: 12px; }
    
    .chart-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; }
    .chart-box { border: 1px solid #f1f5f9; padding: 12px; border-radius: 10px; }

    .section-box { border: 1pt solid #cbd5e1; padding: 15px; background: #fff; margin-top: 10px; min-height: 80px; }
    .signature { margin-top: 50px; display: flex; justify-content: space-between; }
    .signature-box { text-align: center; width: 40%; }
    
    @media print {
      body { -webkit-print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div style="font-weight: bold;">BỘ QUỐC PHÒNG</div>
      <div style="font-weight: bold; text-decoration: underline;">BỆNH VIỆN QUÂN Y 103</div>
    </div>
    <div class="header-right">
      <div style="font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div style="font-weight: bold; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</div>
      <div style="margin-top: 10px; font-size: 11px;">Số: ${p.reportNo}</div>
    </div>
  </div>

  <div class="report-title">
    <h1>BÁO CÁO GIÁM SÁT KIỂM SOÁT NHIỄM KHUẨN</h1>
    <p>Thời gian báo cáo: Từ ngày ${p.tuNgay} đến ngày ${p.denNgay}</p>
  </div>

  <div style="margin-bottom: 20px;">
    <div style="margin: 3px 0;"><strong>Khoa/Phòng giám sát:</strong> ${pickLabels(p.selectedKhoaIds, p.khoaOptions)}</div>
    <div style="margin: 3px 0;"><strong>Đối tượng:</strong> ${pickLabels(p.selectedNgheIds, p.ngheOptions)}</div>
    <div style="margin: 3px 0;"><strong>Khu vực:</strong> ${pickLabels(p.selectedKhuVucIds, p.khuVucOptions)}</div>
  </div>

  <!-- PHẦN 1: VỆ SINH TAY -->
  ${p.vstPayload ? `
    <h2>I. Giám sát tuân thủ Vệ sinh tay (WHO)</h2>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Tổng phiên</div><div class="kpi-value">${p.vstPayload.kpis.tong_phien}</div></div>
      <div class="kpi-card"><div class="kpi-label">Tổng cơ hội</div><div class="kpi-value">${p.vstPayload.kpis.tong_co_hoi}</div></div>
      <div class="kpi-card"><div class="kpi-label">Số tuân thủ</div><div class="kpi-value">${p.vstPayload.kpis.da_tuan_thu}</div></div>
      <div class="kpi-card" style="background:#f0fdf4; border-color:#bbf7d0"><div class="kpi-label" style="color:#166534">Tỉ lệ tuân thủ</div><div class="kpi-value" style="color:#166534">${p.vstPayload.kpis.ty_le_tuan_thu}%</div></div>
    </div>

    <div class="chart-container">
      <div class="chart-box">
        <h3>Xu hướng tuân thủ theo tháng</h3>
        ${renderRateBars((p.vstPayload.trend || []).map((x: any) => ({ ten: x.label, ty_le: x.ty_le })))}
      </div>
      <div class="chart-box">
        <h3>Tuân thủ theo Khoa/Phòng (Top 10)</h3>
        ${renderRateBars((p.vstPayload.by_khoa || []).map((x: any) => ({ ten: x.ten, ty_le: x.ty_le })))}
      </div>
    </div>

    <div class="chart-container">
      <div class="chart-box">
        <h3>Tuân thủ theo đối tượng</h3>
        ${renderRateBars((p.vstPayload.by_doi_tuong || []).map((x: any) => ({ ten: x.ten, ty_le: x.ty_le })), "#2563eb")}
      </div>
      <div class="chart-box">
        <h3>Thời điểm hay bỏ sót nhất</h3>
        ${renderRateBars((p.vstPayload.moment_missed || []).map((x: any) => ({ ten: x.ten, ty_le: Math.round(x.so_lan * 100 / (p.vstPayload.kpis.bo_sot || 1)) })), "#dc2626")}
      </div>
    </div>
  ` : ""}

  <!-- PHẦN 2: CÁC BẢNG KIỂM GIÁM SÁT CHUNG -->
  ${complianceItems.map((item, idx) => `
    <div class="${idx > 0 ? 'page-break' : ''}">
      <h2>II. ${item.label}</h2>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">Tổng phiên</div><div class="kpi-value">${item.data.summary.tong_phien}</div></div>
        <div class="kpi-card"><div class="kpi-label">Tổng quan sát</div><div class="kpi-value">${item.data.summary.tong_quan_sat}</div></div>
        <div class="kpi-card"><div class="kpi-label">Số vi phạm</div><div class="kpi-value">${item.data.summary.tong_vi_pham}</div></div>
        <div class="kpi-card" style="background:#f0fdf4; border-color:#bbf7d0"><div class="kpi-label" style="color:#166534">Tỉ lệ tuân thủ</div><div class="kpi-value" style="color:#166534">${item.data.summary.ty_le_tuan_thu}%</div></div>
      </div>

      <div class="chart-container">
        <div class="chart-box">
          <h3>Diễn biến tuân thủ</h3>
          ${renderRateBars((item.data.trend || []).map((x: any) => ({ ten: x.label, ty_le: x.ty_le })))}
        </div>
        <div class="chart-box">
          <h3>Top 10 lỗi vi phạm phổ biến</h3>
          ${renderRateBars((item.data.violations || []).slice(0, 10).map((x: any) => ({ ten: x.ten_tieu_chi, ty_le: x.ty_le_vi_pham })), "#dc2626")}
        </div>
      </div>
      
      <div style="margin-top:20px">
        <h3>Xếp hạng tuân thủ theo khoa</h3>
        <table>
          <thead>
            <tr><th>STT</th><th>Tên Khoa/Phòng</th><th>Số quan sát</th><th>Tỉ lệ tuân thủ</th></tr>
          </thead>
          <tbody>
            ${(item.data.by_khoa || []).slice(0, 15).map((k: any, i: number) => `
              <tr><td>${i+1}</td><td>${k.ten}</td><td>${k.tong}</td><td><strong>${k.ty_le}%</strong></td></tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `).join("")}

  <div class="page-break">
    <h2>III. Nhận xét và Kiến nghị</h2>
    
    <div style="font-weight: bold; margin-top: 15px;">1. Nhận xét, đánh giá chung:</div>
    <div class="section-box">${p.nhanXetDanhGia ? p.nhanXetDanhGia.replace(/\\n/g, "<br/>") : "Chưa có nội dung"}</div>

    <div style="font-weight: bold; margin-top: 15px;">2. Kiến nghị, đề xuất giải pháp:</div>
    <div class="section-box">${p.kienNghiDeXuat ? p.kienNghiDeXuat.replace(/\\n/g, "<br/>") : "Chưa có nội dung"}</div>

    <div style="margin-top: 30px; font-style: italic; text-align: right;">Hà Nội, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</div>

    <div class="signature">
      <div class="signature-box">
        <div style="font-weight: bold; text-transform: uppercase;">Người làm báo cáo</div>
        <div style="margin-top: 80px;">(Ký, ghi rõ họ tên)</div>
      </div>
      <div class="signature-box">
        <div style="font-weight: bold; text-transform: uppercase;">Trưởng khoa KSNK</div>
        <div style="margin-top: 80px;">(Ký, ghi rõ họ tên)</div>
      </div>
    </div>
  </div>

  <div class="footer no-print">
    Báo cáo Dashboard KSNK 103 - Trang in A4 chuẩn trình ký
  </div>
</body>
</html>`;
}
