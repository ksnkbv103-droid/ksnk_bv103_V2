/**
 * Barrel CSSD — entry tổng.
 * Bản đồ command/query: docs/reference/architecture/cssd-action-map-20260727.md
 *
 * Ưu tiên trong code mới:
 *   - Query  → `./read.actions`  (alias `cssd-read.actions`)
 *   - Write  → `./write.actions` (alias `cssd-write.actions`)
 *   - QR/mẻ  → workflow / batch (giữ tách — safety)
 */
export * from "./read.actions";
export * from "./write.actions";
export * from "./cssd-workflow.commands.actions";
export * from "./cssd-batch.actions";
export * from "./cssd-print.actions";
