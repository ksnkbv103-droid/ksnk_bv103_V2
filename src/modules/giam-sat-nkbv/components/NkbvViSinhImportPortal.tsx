"use client";

import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import React, { useState } from "react";
import { toast } from "sonner";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  HelpCircle, 
  ArrowRight,
  Database,
  Search,
  Sparkles
} from "lucide-react";
import { importViSinhExcel } from "../actions/giam-sat-nkbv-write.actions";

type NkbvViSinhImportPortalProps = {
  khoas: Array<{ id: string; ten_danh_muc: string }>;
};

type ParsedRecord = {
  ma_benh_nhan: string;
  ho_ten_benh_nhan: string;
  ngay_sinh: string;
  gioi_tinh: string;
  ngay_vao_vien: string;
  ngay_lay_mau: string;
  khoa_yeu_cau_id: string;
  loai_benh_pham: string;
  tac_nhan: string;
  ma_benh_an: string;
  ma_benh_pham: string;
  // UI helper fields
  diffDays: number;
  isHaiSuspect: boolean;
};

export default function NkbvViSinhImportPortal({ khoas }: NkbvViSinhImportPortalProps) {
  const [pasteData, setPasteData] = useState("");
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  // Parse TSV or CSV from paste block
  const handleParse = () => {
    if (!pasteData.trim()) {
      toast.error("Vui lòng dán dữ liệu từ Excel trước!");
      return;
    }

    try {
      const lines = pasteData.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        toast.error("Dữ liệu không đúng định dạng. Cần có ít nhất dòng tiêu đề và 1 dòng dữ liệu!");
        return;
      }

      // Detect separator: Tab (\t) is default for Excel copying, otherwise comma (,) or semicolon (;)
      const firstLine = lines[0];
      let sep = "\t";
      if (firstLine.includes(",")) sep = ",";
      else if (firstLine.includes(";")) sep = ";";

      const headers = firstLine.split(sep).map(h => h.trim().toLowerCase().replace(/["']/g, ""));
      
      // Expected headers map (Vietnamese & English variants)
      const colMap: Record<string, string> = {
        "ma_benh_nhan": "ma_benh_nhan", "mã bệnh nhân": "ma_benh_nhan", "pid": "ma_benh_nhan", "ma_bn": "ma_benh_nhan", "mã bn": "ma_benh_nhan",
        "ho_ten_benh_nhan": "ho_ten_benh_nhan", "họ tên": "ho_ten_benh_nhan", "họ và tên": "ho_ten_benh_nhan", "tên bệnh nhân": "ho_ten_benh_nhan", "patient_name": "ho_ten_benh_nhan",
        "ngay_sinh": "ngay_sinh", "ngày sinh": "ngay_sinh", "dob": "ngay_sinh",
        "gioi_tinh": "gioi_tinh", "giới tính": "gioi_tinh", "gender": "gioi_tinh", "sex": "gioi_tinh",
        "ngay_vao_vien": "ngay_vao_vien", "ngày vào viện": "ngay_vao_vien", "ngay_nhap_vien": "ngay_vao_vien", "admission_date": "ngay_vao_vien",
        "ngay_lay_mau": "ngay_lay_mau", "ngày lấy mẫu": "ngay_lay_mau", "ngay_cay": "ngay_lay_mau", "sample_date": "ngay_lay_mau",
        "loai_benh_pham": "loai_benh_pham", "loại bệnh phẩm": "loai_benh_pham", "bệnh phẩm": "loai_benh_pham", "specimen": "loai_benh_pham",
        "tac_nhan": "tac_nhan", "tác nhân": "tac_nhan", "vi khuẩn": "tac_nhan", "pathogen": "tac_nhan", "ket_qua": "tac_nhan",
        "khoa_yeu_cau": "khoa_yeu_cau", "khoa": "khoa_yeu_cau", "khoa chỉ định": "khoa_yeu_cau", "department": "khoa_yeu_cau",
        "ma_benh_an": "ma_benh_an", "mã bệnh án": "ma_benh_an", "bệnh án": "ma_benh_an", "số bệnh án": "ma_benh_an", "admission_id": "ma_benh_an", "shs": "ma_benh_an", "số hồ sơ": "ma_benh_an", "ma_ba": "ma_benh_an", "mã ba": "ma_benh_an",
        "ma_benh_pham": "ma_benh_pham", "mã bệnh phẩm": "ma_benh_pham", "mã số mẫu": "ma_benh_pham", "barcode": "ma_benh_pham", "specimen_id": "ma_benh_pham", "ma_bp": "ma_benh_pham", "mã bp": "ma_benh_pham"
      };

      const headerIdxs: Record<string, number> = {};
      headers.forEach((h, idx) => {
        const mapped = colMap[h];
        if (mapped) {
          headerIdxs[mapped] = idx;
        }
      });

      // Crucial fields check
      const required = ["ma_benh_nhan", "ho_ten_benh_nhan", "ngay_vao_vien", "ngay_lay_mau", "loai_benh_pham", "tac_nhan"];
      const missing = required.filter(f => headerIdxs[f] === undefined);

      if (missing.length > 0) {
        toast.error(`Thiếu các cột bắt buộc: ${missing.map(m => `"${m}"`).join(", ")}. Hãy kiểm tra lại tiêu đề dòng đầu tiên!`);
        return;
      }

      const parsedList: ParsedRecord[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rowCells = lines[i].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ""));
        if (rowCells.length < required.length) continue;

        const getValue = (field: string) => {
          const idx = headerIdxs[field];
          return idx !== undefined && idx < rowCells.length ? rowCells[idx] : "";
        };

        const ma_benh_nhan = getValue("ma_benh_nhan");
        const ho_ten_benh_nhan = getValue("ho_ten_benh_nhan");
        const ngay_sinh = getValue("ngay_sinh");
        const gioi_tinh = getValue("gioi_tinh");
        const ngay_vao_vien = getValue("ngay_vao_vien");
        const ngay_lay_mau = getValue("ngay_lay_mau");
        const loai_benh_pham = getValue("loai_benh_pham");
        const tac_nhan = getValue("tac_nhan");
        const khoaName = getValue("khoa_yeu_cau");
        const ma_benh_an_raw = getValue("ma_benh_an");
        const ma_benh_pham_raw = getValue("ma_benh_pham");

        if (!ma_benh_nhan || !ho_ten_benh_nhan || !ngay_vao_vien || !ngay_lay_mau || !loai_benh_pham || !tac_nhan) {
          continue; // skip incomplete rows
        }

        const ma_benh_an = ma_benh_an_raw || `BA-${ma_benh_nhan}`;
        const ma_benh_pham = ma_benh_pham_raw || `BP-${Date.now()}-${i}`;

        // Try mapping department
        let khoa_yeu_cau_id = "";
        if (khoaName) {
          const normalizedKhoa = khoaName.toLowerCase().replace(/khoa/g, "").trim();
          const match = khoas.find(k => k.ten_danh_muc.toLowerCase().replace(/khoa/g, "").trim() === normalizedKhoa);
          if (match) {
            khoa_yeu_cau_id = match.id;
          }
        }

        // Compute LIS Day 3 Rule (calendar days >= 2)
        let diffDays = 0;
        let isHaiSuspect = false;
        try {
          const dVao = parseISO(ngay_vao_vien.includes("T") ? ngay_vao_vien : `${ngay_vao_vien}T00:00:00`);
          const dMau = parseISO(ngay_lay_mau.includes("T") ? ngay_lay_mau : `${ngay_lay_mau}T00:00:00`);
          diffDays = differenceInCalendarDays(dMau, dVao);
          isHaiSuspect = diffDays >= 2;
        } catch (e) {
          // ignore parsing error, will default to false
        }

        parsedList.push({
          ma_benh_nhan,
          ho_ten_benh_nhan,
          ngay_sinh,
          gioi_tinh,
          ngay_vao_vien,
          ngay_lay_mau,
          khoa_yeu_cau_id,
          loai_benh_pham,
          tac_nhan,
          ma_benh_an,
          ma_benh_pham,
          diffDays,
          isHaiSuspect
        });
      }

      if (parsedList.length === 0) {
        toast.error("Không trích xuất được dòng dữ liệu hợp lệ nào!");
      } else {
        setRecords(parsedList);
        setPasteData("");
        toast.success(`Đã phân tích thành công ${parsedList.length} dòng vi sinh!`);
      }
    } catch (err: any) {
      toast.error(`Lỗi phân tích dữ liệu: ${err.message}`);
    }
  };

  const handleImportSubmit = async () => {
    if (records.length === 0) return;

    setIsLoading(true);
    try {
      const payload = records.map(r => ({
        ma_benh_nhan: r.ma_benh_nhan,
        ho_ten_benh_nhan: r.ho_ten_benh_nhan,
        ngay_sinh: r.ngay_sinh || undefined,
        gioi_tinh: r.gioi_tinh || undefined,
        ngay_vao_vien: r.ngay_vao_vien,
        ngay_lay_mau: r.ngay_lay_mau,
        khoa_yeu_cau_id: r.khoa_yeu_cau_id || undefined,
        loai_benh_pham: r.loai_benh_pham,
        tac_nhan: r.tac_nhan,
        ma_benh_an: r.ma_benh_an,
        ma_benh_pham: r.ma_benh_pham
      }));

      const res = await importViSinhExcel(payload);
      if (res.success) {
        toast.success(`Đã nạp ${res.count || records.length} bản ghi vi sinh LIS. Hệ thống tự động kích hoạt ${res.createdCasesCount ?? 0} ca nghi ngờ nhiễm khuẩn bệnh viện!`);
        setRecords([]);
      } else {
        toast.error(res.error || "Gặp lỗi khi nạp vi sinh");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu dữ liệu vi sinh");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveRow = (idx: number) => {
    setRecords(records.filter((_, i) => i !== idx));
  };

  const handleUpdateRowKhoa = (idx: number, khoaId: string) => {
    setRecords(records.map((r, i) => i === idx ? { ...r, khoa_yeu_cau_id: khoaId } : r));
  };

  const samplePasteData = 
`ma_benh_nhan	ho_ten_benh_nhan	ngay_sinh	gioi_tinh	ngay_vao_vien	ngay_lay_mau	khoa	loai_benh_pham	tac_nhan	ma_benh_an	ma_benh_pham
1032948	Nguyễn Văn Hải	1975-04-12	Nam	2026-05-18	2026-05-21	Hồi sức nội	Máu	Escherichia coli	BA-00123	M-01
1034859	Trần Thị Bình	1988-11-23	Nữ	2026-05-19	2026-05-20	Chấn thương chỉnh hình	Nước tiểu	Candida albicans	BA-00124	NT-02
1035920	Lê Hoàng Cường	1962-07-05	Nam	2026-05-15	2026-05-19	Bệnh phổi	Dịch phế quản	Acinetobacter baumannii	BA-00125	DM-03`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Intro Header */}
      <div className="premium-card rounded-[var(--radius-shell)] border border-slate-100 bg-white p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className={`${C.panelTitle} flex items-center gap-2`}>
              <FileSpreadsheet className="h-6 w-6 text-[var(--primary)]" />
              Cổng tiếp nhận kết quả Vi sinh LIS (Excel Integration)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Quy trình tự động hóa giám sát: Tiếp nhận kết quả cấy dương tính từ khoa Vi sinh, tự động lọc ca nhiễm khuẩn bệnh viện (LIS Day 3 Rule) để gửi Checklist chẩn đoán cho khoa lâm sàng.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition"
          >
            <HelpCircle className="h-4 w-4" />
            Hướng dẫn & Mẫu dán
          </button>
        </div>

        {showGuide && (
          <div className="rounded-[var(--radius-shell)] bg-slate-50 p-4 border border-slate-200/60 text-xs text-slate-600 space-y-3 animate-in fade-in duration-300">
            <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[var(--primary)]" />
              Cách thức hoạt động & định dạng Excel:
            </h4>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Mở bảng tính Excel kết quả cấy vi sinh dương tính của khoa Vi sinh.</li>
              <li>Chọn và copy dòng tiêu đề và các dòng dữ liệu. Các cột bắt buộc bao gồm: 
                <span className="font-bold text-slate-800"> ma_benh_nhan, ho_ten_benh_nhan, ngay_vao_vien, ngay_lay_mau, loai_benh_pham, tac_nhan</span>.
              </li>
              <li>Dán trực tiếp vào ô văn bản phía dưới và ấn <strong>"Phân tích dữ liệu"</strong>.</li>
              <li>
                <span className="font-bold text-slate-800">Quy tắc LIS Day 3:</span> Các kết quả cấy có ngày lấy mẫu sau ngày nhập viện <span className="font-bold text-[var(--primary)]">&ge; 2 ngày</span> (tức là ngày nằm viện thứ 3 trở lên, tính ngày nhập viện là ngày 1) sẽ được hệ thống đánh dấu là <span className="font-bold text-emerald-600">Nghi ngờ NKBV</span> và tự động tạo ca giám sát chờ bác sĩ xác minh lâm sàng. Các ca cấy sớm hơn sẽ được ghi nhận vào nhật ký nhưng không tạo ca lâm sàng.
              </li>
            </ul>
            <div className="pt-2">
              <p className="font-bold mb-1 text-slate-500">Mẫu dữ liệu có thể thử nghiệm copy:</p>
              <textarea
                readOnly
                value={samplePasteData}
                onClick={(e) => {
                  (e.target as HTMLTextAreaElement).select();
                  navigator.clipboard.writeText(samplePasteData);
                  toast.success("Đã copy dữ liệu mẫu vào Clipboard!");
                }}
                className="w-full h-24 font-mono text-[11px] bg-white border border-slate-200 rounded-xl p-2 cursor-pointer focus:outline-none"
                title="Click để copy mẫu thử"
              />
              <span className="text-[11px] text-slate-400 italic block mt-1">💡 Click vào khung xám trên để copy nhanh mẫu thử và dán vào ô bên dưới!</span>
            </div>
          </div>
        )}
      </div>

      {records.length === 0 ? (
        /* Textarea Paste Area */
        <div className="premium-card rounded-[var(--radius-shell)] border border-slate-100 bg-white p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className={C.statLabel}>Khung dán dữ liệu Excel</span>
            <UploadCloud className="h-5 w-5 text-slate-300" />
          </div>

          <textarea
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            placeholder="Dán (Ctrl+V / Cmd+V) các hàng sao chép từ Excel kết quả vi sinh dương tính tại đây..."
            className="w-full min-h-[220px] rounded-[var(--radius-shell)] border-slate-200 bg-slate-50/50 p-4 font-mono text-xs focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleParse}
              className={`${C.ctaPrimary} hover:bg-[var(--primary-hover)]`}
            >
              Phân tích dữ liệu <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Preview Table & Mapping */
        <div className="premium-card rounded-[var(--radius-shell)] border border-slate-100 bg-white p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Database className="h-5 w-5 text-[var(--primary)]" />
                Xem trước kết quả phân tích ({records.length} hàng)
              </h3>
              <p className="text-xs text-slate-400">
                Hãy kiểm định khoa chỉ định, thông tin chẩn đoán nghi ngờ trước khi ghi nhận chính thức vào hệ thống.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRecords([])}
                className="rounded-full bg-slate-100 hover:bg-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 transition"
              >
                Hủy / Dán lại
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={isLoading}
                className="rounded-full bg-[var(--primary)] px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-[var(--primary)]/20 hover:bg-[#026615] transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isLoading ? "Đang đẩy LIS..." : "Đẩy kết quả LIS vào DB"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-[var(--radius-shell)]">
            <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3 text-center w-12">#</th>
                  <th className="px-4 py-3 w-28">Mã BN (PID)</th>
                  <th className="px-4 py-3 w-28">Mã BA (Số HS)</th>
                  <th className="px-4 py-3 w-40">Họ và tên</th>
                  <th className="px-4 py-3 w-24">Nhập viện</th>
                  <th className="px-4 py-3 w-24">Lấy mẫu</th>
                  <th className="px-4 py-3 w-20 text-center">Nằm viện</th>
                  <th className="px-4 py-3 w-44">Khoa yêu cầu</th>
                  <th className="px-4 py-3 w-36">Bệnh phẩm / Mã BP</th>
                  <th className="px-4 py-3 w-40">Tác nhân cấy dương</th>
                  <th className="px-4 py-3 w-36 text-center">Phân định CDC</th>
                  <th className="px-4 py-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                {records.map((r, idx) => (
                  <tr 
                    key={idx} 
                    className={`hover:bg-slate-50/50 transition-colors ${
                      r.isHaiSuspect ? "bg-emerald-50/20" : "bg-slate-100/10"
                    }`}
                  >
                    <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{r.ma_benh_nhan}</td>
                    <td className="px-4 py-3 font-bold text-teal-800">{r.ma_benh_an}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{r.ho_ten_benh_nhan}</span>
                        {r.ngay_sinh && (
                          <span className="text-[11px] text-slate-400">
                            Sinh: {r.ngay_sinh} {r.gioi_tinh ? `(${r.gioi_tinh})` : ""}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {format(parseISO(r.ngay_vao_vien.slice(0, 10)), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {format(parseISO(r.ngay_lay_mau.slice(0, 10)), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      {r.diffDays} ngày
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={r.khoa_yeu_cau_id}
                        onChange={(e) => handleUpdateRowKhoa(idx, e.target.value)}
                        className={C.controlInput}
                      >
                        <option value="">Chọn khoa chỉ định...</option>
                        {khoas.map(k => (
                          <option key={k.id} value={k.id}>{k.ten_danh_muc}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 w-fit">
                          {r.loai_benh_pham}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          Mẫu: {r.ma_benh_pham}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-700 italic">
                      {r.tac_nhan}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.isHaiSuspect ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800">
                          <CheckCircle className="h-3 w-3" /> Nghi ngờ NKBV (Day {r.diffDays + 1})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
                          <AlertTriangle className="h-3 w-3" /> Nhiễm cộng đồng
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition"
                        title="Xóa dòng"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-400 bg-slate-50 rounded-[var(--radius-shell)] p-4">
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500 block"></span>
                Tổng số ca nghi ngờ NKBV (Day 3+):{" "}
                <strong className="text-emerald-700">{records.filter(r => r.isHaiSuspect).length}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-slate-400 block"></span>
                Ca nhiễm khuẩn cộng đồng:{" "}
                <strong className="text-slate-600">{records.filter(r => !r.isHaiSuspect).length}</strong>
              </span>
            </div>
            <p className="italic text-slate-400">
              ⚡ Gợi ý: Hãy gán các khoa chỉ định thích hợp để phiếu được gửi chính xác về checklist của khoa đó.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
