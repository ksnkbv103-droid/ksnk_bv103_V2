import type { LucideIcon } from "lucide-react";
import {
  Ban,
  CheckCircle2,
  Edit3,
  Eye,
  FileOutput,
  PlusSquare,
  Shield,
  Trash2,
  Upload,
} from "lucide-react";

export const RBAC_ACTION_META: Record<
  string,
  { label: string; icon: LucideIcon; color: string; full: string; order: number }
> = {
  view: { label: "V", icon: Eye, color: "text-blue-500", full: "Xem", order: 1 },
  create: { label: "C", icon: PlusSquare, color: "text-green-500", full: "Thêm", order: 2 },
  edit: { label: "E", icon: Edit3, color: "text-amber-500", full: "Sửa", order: 3 },
  delete: { label: "D", icon: Trash2, color: "text-red-500", full: "Xóa", order: 4 },
  import: { label: "I", icon: Upload, color: "text-purple-500", full: "Import", order: 5 },
  export: { label: "X", icon: FileOutput, color: "text-cyan-500", full: "Xuất dữ liệu", order: 6 },
  qc: { label: "Q", icon: CheckCircle2, color: "text-lime-600", full: "Kiểm định chất lượng", order: 7 },
  lock: { label: "L", icon: Ban, color: "text-fuchsia-600", full: "Khóa an toàn", order: 8 },
};

export const RBAC_ACTION_FALLBACK_META = {
  icon: Shield,
  color: "text-slate-500",
  order: 99,
};
