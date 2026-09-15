/**
 * Server-safe surface for CSSD analytics (dashboard / báo cáo tổng hợp).
 * Giữ tách khỏi entrypoint trang client để tránh kéo "use client" vào Server Actions.
 */
export { fetchCssdAnalyticsBundle } from "../../actions/cssd-report-read.actions";
