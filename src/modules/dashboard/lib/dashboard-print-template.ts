import { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import type { VstStrategicPayload, GscStrategicPayload } from "../strategic-dashboard.types";

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
  vstPayload: VstStrategicPayload | null;
  gscPayload: GscStrategicPayload | null;
  bkLabelMap?: Map<string, string>;
  nhanXetDanhGia: string;
  kienNghiDeXuat: string;
};

const pickLabels = (ids: string[], options: MultiSelectOption[]) =>
  ids?.length && ids.length < options?.length ? options.filter((o) => ids.includes(o.id)).map((o) => o.label).join(", ") : "Tất cả";

export function getDashboardPrintHtml(p: PrintParams) {
  
  // Tính toán tổng quan chung (Cơ cấu giám sát)
  const tongPhienKsnk = (p.vstPayload?.workload?.ksnk_so_phien ?? 0) + (p.gscPayload?.workload?.ksnk_so_phien ?? 0);
  const khoaTuGiamSat = Math.max(p.vstPayload?.workload?.khoa_tu_giam_sat ?? 0, p.gscPayload?.workload?.khoa_tu_giam_sat ?? 0);
  const ksnkPhuKhoa = Math.max(p.vstPayload?.workload?.khoa_duoc_ksnk_giam_sat ?? 0, p.gscPayload?.workload?.khoa_duoc_ksnk_giam_sat ?? 0);

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
    .report-title h1 { font-size: 18px; margin: 0; color: #026f17; text-transform: uppercase; font-weight: bold; }
    .report-title p { margin: 5px 0; font-style: italic; font-size: 13px; }
    
    h2 { font-size: 14px; color: #026f17; border-left: 4pt solid #026f17; padding-left: 10px; margin: 25px 0 15px; text-transform: uppercase; font-weight: bold; }
    h3 { font-size: 13px; color: #334155; margin: 15px 0 10px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 5px; font-weight: bold; }

    .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .summary-box p { margin: 5px 0; font-size: 13px; }

    table { width: 100%; border-collapse: collapse; margin: 10px 0 20px; font-size: 12px; }
    th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: center; }
    th { background: #f1f5f9; font-weight: bold; color: #0f172a; }
    td.text-left { text-align: left; }
    
    .text-danger { color: #dc2626; font-weight: bold; }
    .text-success { color: #166534; font-weight: bold; }
    .bg-highlight { background-color: #fef2f2; }

    .section-box { border: 1pt solid #cbd5e1; padding: 15px; background: #fff; margin-top: 10px; min-height: 80px; text-align: justify; }
    .signature { margin-top: 40px; display: flex; justify-content: space-between; }
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
      <div style="font-weight: bold; font-size: 12px;">BỘ QUỐC PHÒNG</div>
      <div style="font-weight: bold; font-size: 13px; text-decoration: underline;">BỆNH VIỆN QUÂN Y 103</div>
    </div>
    <div class="header-right">
      <div style="font-weight: bold; font-size: 12px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div style="font-weight: bold; font-size: 13px; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</div>
      <div style="margin-top: 8px; font-size: 11px;">Số: ${p.reportNo}</div>
    </div>
  </div>

  <div class="report-title">
    <h1>BÁO CÁO CÔNG TÁC GIÁM SÁT KIỂM SOÁT NHIỄM KHUẨN</h1>
    <p>(Kỳ báo cáo: Từ ngày ${p.tuNgay} đến ngày ${p.denNgay})</p>
  </div>

  <div class="summary-box">
    <p><strong>- Phạm vi báo cáo:</strong> ${pickLabels(p.selectedKhoaIds, p.khoaOptions)}.</p>
    <p><strong>- Đối tượng giám sát:</strong> ${pickLabels(p.selectedNgheIds, p.ngheOptions)}.</p>
    <p><strong>- Cường độ giám sát:</strong> Toàn viện có <strong>${khoaTuGiamSat}</strong> khoa tự giám sát. Khoa KSNK đã đi giám sát độc lập được <strong>${ksnkPhuKhoa}</strong> khoa, thực hiện tổng cộng <strong>${tongPhienKsnk.toLocaleString()}</strong> phiên.</p>
  </div>

  <!-- PHẦN 1: VỆ SINH TAY -->
  ${p.vstPayload ? `
    <h2>I. KẾT QUẢ GIÁM SÁT TUÂN THỦ VỆ SINH TAY (WHO)</h2>
    
    <h3>1. Chỉ số cốt lõi</h3>
    <table>
      <thead>
        <tr>
          <th>Tổng cơ hội</th>
          <th>Đã tuân thủ</th>
          <th>Tỷ lệ tuân thủ chung</th>
          <th>Tỷ lệ đúng kỹ thuật</th>
          <th>Tỷ lệ đủ thời gian</th>
          <th>Lạm dụng găng tay</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${p.vstPayload.kpis.tong_co_hoi.toLocaleString()}</td>
          <td>${p.vstPayload.kpis.da_tuan_thu.toLocaleString()}</td>
          <td class="text-success">${p.vstPayload.kpis.ty_le_tuan_thu}%</td>
          <td>${p.vstPayload.kpis.ty_le_dung_ky_thuat}%</td>
          <td>${p.vstPayload.kpis.ty_le_du_thoi_gian}%</td>
          <td class="${p.vstPayload.kpis.ty_le_lam_dung_gang > 5 ? 'text-danger bg-highlight' : ''}">${p.vstPayload.kpis.ty_le_lam_dung_gang}% (${p.vstPayload.kpis.lam_dung_gang} ca)</td>
        </tr>
      </tbody>
    </table>

    <h3>2. Phân bổ tuân thủ theo 5 Thời điểm</h3>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Thời điểm (Moment)</th>
          <th>Số cơ hội</th>
          <th>Tuân thủ</th>
          <th>Tỷ lệ tuân thủ</th>
          <th>Tỷ lệ bỏ sót (Không TT)</th>
        </tr>
      </thead>
      <tbody>
        ${(p.vstPayload.moments || []).map((m: any, i: number) => {
          const khongTT = m.tong_co_hoi - m.da_tuan_thu;
          const tyLeKhongTT = 100 - m.ty_le_tuan_thu;
          return `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${m.ten}</td>
            <td>${m.tong_co_hoi.toLocaleString()}</td>
            <td>${m.da_tuan_thu.toLocaleString()}</td>
            <td><strong>${m.ty_le_tuan_thu}%</strong></td>
            <td class="${tyLeKhongTT > 50 ? 'text-danger' : ''}">${tyLeKhongTT}%</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>

    <h3>3. Đối soát Tự giám sát và KSNK (Khoa tiêu biểu)</h3>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Tên Khoa/Phòng</th>
          <th>Tỷ lệ Tự giám sát</th>
          <th>Tỷ lệ do KSNK đánh giá</th>
          <th>Độ lệch (Gap)</th>
        </tr>
      </thead>
      <tbody>
        ${(p.vstPayload.gap_analysis || []).slice(0, 10).map((g: any, i: number) => `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${g.ten}</td>
            <td>${g.ty_le_tgs != null ? g.ty_le_tgs + '%' : '-'}</td>
            <td>${g.ty_le_ksnk != null ? g.ty_le_ksnk + '%' : '-'}</td>
            <td class="${(g.do_lech ?? 0) > 20 ? 'text-danger' : ''}">${g.do_lech != null ? Math.abs(g.do_lech) + '%' : '-'}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : ""}

  <!-- PHẦN 2: GIÁM SÁT CHUNG -->
  ${p.gscPayload && p.gscPayload.kpis.tong_phien > 0 ? `
    <div class="page-break"></div>
    <h2>II. KẾT QUẢ GIÁM SÁT CHUNG (CÁC CHUYÊN ĐỀ)</h2>

    <h3>1. Kết quả theo chuyên đề</h3>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Chuyên đề giám sát</th>
          <th>Tổng phiên</th>
          <th>Khảo sát</th>
          <th>Đạt</th>
          <th>Tỷ lệ tuân thủ</th>
        </tr>
      </thead>
      <tbody>
        ${(p.gscPayload.dynamic_checklists || []).map((bk: any, i: number) => `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${bk.ten_bang_kiem}</td>
            <td>${bk.tong_phien.toLocaleString()}</td>
            <td>${bk.tong_quan_sat.toLocaleString()}</td>
            <td>${bk.tong_dat.toLocaleString()}</td>
            <td><strong>${bk.ty_le_tuan_thu}%</strong></td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <h3>2. Top 10 Tiêu chí vi phạm nhiều nhất</h3>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Nội dung tiêu chí vi phạm</th>
          <th class="text-left">Thuộc chuyên đề</th>
          <th>Số lần vi phạm</th>
          <th>Tỷ lệ vi phạm (Rủi ro)</th>
        </tr>
      </thead>
      <tbody>
        ${(p.gscPayload.top_violations || []).slice(0, 10).map((v: any, i: number) => `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${v.ten_tieu_chi}</td>
            <td class="text-left" style="font-size: 11px;">${v.ten_bang_kiem}</td>
            <td class="text-danger">${v.so_vi_pham.toLocaleString()}</td>
            <td class="text-danger bg-highlight"><strong>${v.ty_le_vi_pham}%</strong></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : ""}

  <div class="page-break"></div>
  <h2>III. ĐÁNH GIÁ VÀ KIẾN NGHỊ CỦA KHOA KIỂM SOÁT NHIỄM KHUẨN</h2>
  
  <div style="font-weight: bold; margin-top: 15px; font-size: 13px;">1. Nhận xét, đánh giá chung:</div>
  <div class="section-box">${p.nhanXetDanhGia ? p.nhanXetDanhGia.replace(/\\n/g, "<br/>") : "Chưa có nội dung"}</div>

  <div style="font-weight: bold; margin-top: 15px; font-size: 13px;">2. Kiến nghị, đề xuất giải pháp đối với Ban Giám đốc:</div>
  <div class="section-box">${p.kienNghiDeXuat ? p.kienNghiDeXuat.replace(/\\n/g, "<br/>") : "Chưa có nội dung"}</div>

  <div style="margin-top: 25px; font-style: italic; text-align: right; padding-right: 5%;">Hà Nội, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</div>

  <div class="signature">
    <div class="signature-box">
      <div style="font-weight: bold; text-transform: uppercase;">Người tổng hợp</div>
      <div style="margin-top: 70px;">(Ký, ghi rõ họ tên)</div>
    </div>
    <div class="signature-box">
      <div style="font-weight: bold; text-transform: uppercase;">Chủ nhiệm khoa KSNK</div>
      <div style="margin-top: 70px;">(Ký, ghi rõ họ tên)</div>
    </div>
  </div>

  <div class="footer no-print">
    Hệ thống Thông tin KSNK - Bệnh viện 103 (Trang in nội bộ)
  </div>
</body>
</html>`;
}
