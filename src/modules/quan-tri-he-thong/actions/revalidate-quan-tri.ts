import { revalidatePath } from "next/cache";
import { QUAN_TRI_NHAN_SU_PATH, QUAN_TRI_TAI_KHOAN_PATH } from "@/lib/master-data/quan-tri-paths";

/** Hồ sơ nhân sự và tài khoản đăng nhập luôn đổi cùng nhau — làm mới cả hai trang. */
export function revalidateNhanSuTaiKhoan() {
  revalidatePath(QUAN_TRI_NHAN_SU_PATH);
  revalidatePath(QUAN_TRI_TAI_KHOAN_PATH);
}
