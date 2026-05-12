/**
 * Entrypoint ghi chuẩn cho Quản trị — tập trung re-export các action ghi hay dùng.
 * Module con (danh-mục chuyên biệt) vẫn có file riêng khi cần phạm vi hẹp.
 */
export * from "../nhan-su/actions/nhan-su-write.actions";
export * from "../bang-kiem/actions/bang-kiem-write.actions";
export * from "../phan-quyen/actions/rbac.actions";
