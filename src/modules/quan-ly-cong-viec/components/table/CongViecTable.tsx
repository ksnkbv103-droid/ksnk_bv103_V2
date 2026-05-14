import React, { useState } from "react";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { MoreHorizontal, Clock, AlertCircle, Eye, EyeOff, Printer, CheckCircle2 } from "lucide-react";
import { updateCongViec, deleteCongViec, xacNhanHoanThanh } from "../../actions/cong-viec.actions";
import { pheDuyetDeXuat } from "../../actions/dexuat.actions";
import { isChoNghiemThuHoanThanh } from "../../lib/qlcv-workflow-display";
import { toast } from "sonner";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import CongViecPrintView from "../CongViecPrintView";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  MOI: { label: "Mới", color: "bg-blue-50 text-blue-600 border-blue-100" },
  DANG_THUC_HIEN: { label: "Đang thực hiện", color: "bg-amber-50 text-amber-600 border-amber-100" },
  HOAN_THANH: { label: "Hoàn thành", color: "bg-green-50 text-green-600 border-green-100" },
  HUY: { label: "Hủy", color: "bg-rose-50 text-rose-600 border-rose-100" },
  QUA_HAN: { label: "Quá hạn", color: "bg-red-50 text-red-600 border-red-100" },
  GAN_HET_HAN: { label: "Gần hết hạn", color: "bg-orange-50 text-orange-600 border-orange-100" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  KHAN_CAP: { label: "Khẩn cấp", color: "bg-red-50 text-red-600 border-red-200", icon: "🔥" },
  CAO: { label: "Cao", color: "bg-orange-50 text-orange-600 border-orange-200", icon: "⚡" },
  TRUNG_BINH: { label: "Trung bình", color: "bg-blue-50 text-blue-600 border-blue-200", icon: "🟢" },
  THAP: { label: "Thấp", color: "bg-slate-50 text-slate-500 border-slate-200", icon: "⚪" },
};

function getDisplayStatus(task: { ma_trang_thai?: string | null }) {
  return String(task.ma_trang_thai || "MOI").trim() || "MOI";
}

function getDeadlineState(task: { ngay_han_chot?: string | null }) {
  if (!task.ngay_han_chot) return { overdue: false, near: false };
  const now = new Date();
  const deadline = new Date(task.ngay_han_chot);
  const days = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return { overdue: days < 0, near: days >= 0 && days <= 2 };
}

interface CongViecTableProps {
  tasks: any[];
  onEdit: (task: any) => void;
  loading?: boolean;
  onRefresh?: () => void;
  serverPagination?: {
    page: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
}

export default function CongViecTable({ tasks, onEdit, loading, onRefresh, serverPagination }: CongViecTableProps) {
  const [printingTask, setPrintingTask] = useState<any>(null);

  const handleQuickDone = async (task: any) => {
    const pseudo = {
      trang_thai: String(task.trang_thai || task.ma_trang_thai || ""),
      phan_tram_hoan_thanh: task.phan_tram_hoan_thanh ?? task.tien_do,
    };
    if (!isChoNghiemThuHoanThanh(pseudo)) {
      toast.error("Chỉ nghiệm thu nhanh khi việc đang chờ xác nhận hoàn thành.");
      return;
    }
    if (!confirm("Nghiệm thu và đóng công việc này?")) return;
    try {
      await xacNhanHoanThanh(task.id);
      toast.success("Đã nghiệm thu và đóng công việc!");
      onRefresh?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Cập nhật thất bại");
    }
  };

  const handleApprove = async (task: any) => {
    if (!confirm("Phê duyệt đề xuất này (kích hoạt theo phân công hiện có)?")) return;
    try {
      await pheDuyetDeXuat(task.id, true);
      toast.success("Đã phê duyệt đề xuất!");
      onRefresh?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Cập nhật thất bại");
    }
  };

  const handleDelete = async (task: any) => {
    if (!confirm("Bạn có chắc chắn muốn xóa công việc này?")) return;
    try {
      await deleteCongViec(task.id);
      toast.success("Đã xóa công việc!");
      onRefresh?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không xóa được");
    }
  };

  const onPrint = (task: any) => {
    setPrintingTask(task);
    setTimeout(() => {
      window.print();
      setPrintingTask(null);
    }, 500);
  };

  const columns = [
    {
      header: "Công việc",
      accessorKey: "ten_cong_viec",
      cell: (item: any) => !item ? null : (
        <div className="flex flex-col py-1 gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100">
              Nội bộ Khoa
            </span>
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
              {item.ma_cong_viec || `#${item.id?.substring(0, 8)}`}
            </span>
          </div>
          <span className="font-bold text-slate-800 line-clamp-2 leading-snug">{item.ten_cong_viec}</span>
        </div>
      )
    },
    {
      header: "Ưu tiên",
      accessorKey: "ma_uu_tien",
      cell: (item: any) => {
        if (!item) return null;
        const config = PRIORITY_CONFIG[item.ma_uu_tien] || PRIORITY_CONFIG.TRUNG_BINH;
        return (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[9px] font-black uppercase tracking-widest ${config.color}`}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </div>
        );
      }
    },
    {
      header: "Trạng thái",
      accessorKey: "ma_trang_thai",
      cell: (item: any) => {
        if (!item) return null;
        const displayStatus = getDisplayStatus(item);
        const config = STATUS_CONFIG[displayStatus] || { label: displayStatus, color: "bg-slate-100 text-slate-600" };
        return <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${config.color}`}>{config.label}</span>;
      }
    },
    {
      header: "Tiến độ",
      accessorKey: "tien_do",
      cell: (item: any) => !item ? null : (
        <div className="flex items-center gap-3 w-[120px]">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#026f17] transition-all duration-500" style={{ width: `${item.tien_do || 0}%` }} />
          </div>
          <span className="text-[10px] font-black text-slate-600">{item.tien_do || 0}%</span>
        </div>
      )
    },
    {
      header: "Người thực hiện",
      accessorKey: "ten_nguoi_thuc_hien",
      cell: (item: any) => !item ? null : (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-700">{item.ten_nguoi_thuc_hien || "Chưa giao"}</span>
          {item.nguoi_nhan_da_xem ? (
            <span className="flex items-center gap-1 text-[8px] font-black text-green-500 uppercase tracking-widest">
              <Eye className="w-2.5 h-2.5" /> Đã xem {item.da_xem_at ? format(new Date(item.da_xem_at), "HH:mm") : ""}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[8px] font-black text-red-400 uppercase tracking-widest">
              <EyeOff className="w-2.5 h-2.5" /> Chưa xem
            </span>
          )}
        </div>
      )
    },
    {
      header: "Hạn chót",
      accessorKey: "ngay_han_chot",
      cell: (item: any) => {
        if (!item || !item.ngay_han_chot) return <span className="text-xs text-slate-300">---</span>;
        const hanChot = new Date(item.ngay_han_chot);
        const { overdue, near } = getDeadlineState(item);
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span className="font-medium">{format(hanChot, "dd/MM/yyyy", { locale: vi })}</span>
            </div>
            {overdue && (
              <span className="flex items-center gap-1 text-[9px] font-black text-red-500 uppercase tracking-widest">
                <AlertCircle className="w-3 h-3" /> Quá hạn
              </span>
            )}
            {near && (
              <span className="flex items-center gap-1 text-[9px] font-black text-orange-500 uppercase tracking-widest">
                <AlertCircle className="w-3 h-3" /> Gần hết hạn
              </span>
            )}
          </div>
        );
      }
    },
    {
      id: "actions",
      header: "",
      accessorKey: "id",
      cell: (item: any) => (
        <div className="flex items-center gap-1">
          {item.ma_trang_thai === "DE_XUAT_CHO_DUYET" && (
             <button
              onClick={() => handleApprove(item)}
              className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-full transition-colors"
              title="Phê duyệt nhanh"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          {(item.ma_trang_thai === "CHO_XAC_NHAN_HOAN_THANH" ||
            isChoNghiemThuHoanThanh({
              trang_thai: item.ma_trang_thai || item.trang_thai,
              phan_tram_hoan_thanh: item.phan_tram_hoan_thanh ?? item.tien_do,
            })) && (
            <button
              onClick={() => handleQuickDone(item)}
              className="p-2 hover:bg-green-50 text-green-500 rounded-full transition-colors"
              title="Nghiệm thu nhanh"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onPrint(item)}
            className="p-2 hover:bg-blue-50 text-blue-500 rounded-full transition-colors"
            title="In phiếu"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onEdit(item)}
            className="p-2 hover:bg-slate-50 rounded-full transition-colors"
            title="Chi tiết/Sửa"
          >
            <MoreHorizontal className="w-4 h-4 text-slate-400" />
          </button>
          <button 
            onClick={() => handleDelete(item)}
            className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"
            title="Xóa"
          >
            <AlertCircle className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className={`${bv103LayoutChrome.panelSurface} overflow-hidden p-0`}>
      {printingTask && <CongViecPrintView task={printingTask} />}
      <div className="print:hidden">
        <AdvancedDataTable
          columns={columns}
          data={tasks}
          loading={loading}
          searchPlaceholder="Tìm kiếm công việc..."
          serverPagination={serverPagination}
          hideSearch={!!serverPagination} // Ẩn search mặc định của AdvancedDataTable nếu dùng Server Pagination
        />
      </div>
    </div>
  );
}
