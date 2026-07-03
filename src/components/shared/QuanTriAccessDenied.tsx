import Link from "next/link";

type Props = {
  title?: string;
  detail?: string;
};

export default function QuanTriAccessDenied({
  title = "Truy cập bị từ chối",
  detail = "Tài khoản không có quyền mở khu Quản trị này. Liên hệ quản trị nếu cần được cấp quyền.",
}: Props) {
  return (
    <div className="mx-auto mt-16 max-w-xl rounded-[var(--radius-shell)] border border-red-200 bg-red-50/40 px-8 py-12 text-center shadow-sm">
      <div className="text-4xl" aria-hidden>
        🔒
      </div>
      <h1 className="mt-4 text-lg font-bold text-red-800">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{detail}</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
