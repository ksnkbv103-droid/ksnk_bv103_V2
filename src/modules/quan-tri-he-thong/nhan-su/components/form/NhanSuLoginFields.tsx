"use client";

import { quanTriFormChrome as F } from "../../../lib/quan-tri-form-chrome";

type Props = {
  hasAuth: boolean;
  email: string;
  password: string;
  onPassword: (v: string) => void;
  createLogin: boolean;
  onCreateLogin: (v: boolean) => void;
  disabled: boolean;
};

/** Tạo đăng nhập ngay trên form hồ sơ — một vai trò đã chọn phía trên. */
export default function NhanSuLoginFields({
  hasAuth,
  email,
  password,
  onPassword,
  createLogin,
  onCreateLogin,
  disabled,
}: Props) {
  if (hasAuth) {
    return (
      <p className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900">
        Đã có tài khoản. Đổi vai trò phía trên sẽ cập nhật quyền đăng nhập.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          className="rounded border-slate-300"
          checked={createLogin}
          onChange={(e) => onCreateLogin(e.target.checked)}
          disabled={disabled}
        />
        Tạo đăng nhập ngay
      </label>
      {createLogin ? (
        <>
          <p className="text-xs text-slate-500">
            Dùng email hồ sơ{email ? ` (${email})` : " — cần nhập email phía trên"} và mật khẩu ban đầu (tối thiểu 8 ký
            tự). Vai trò đã chọn ở trên là vai trò đăng nhập.
          </p>
          <div className="space-y-2">
            <label className={F.formLabelInset}>Mật khẩu ban đầu</label>
            <input
              type="password"
              className="input w-full"
              value={password}
              onChange={(e) => onPassword(e.target.value)}
              disabled={disabled}
              autoComplete="new-password"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
