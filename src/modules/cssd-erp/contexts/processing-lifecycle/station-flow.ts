/**
 * Server-safe surface for station flow map (Command Center signals).
 * Giữ tách khỏi entrypoint trang client để tránh kéo "use client" vào Server Actions.
 */
export { getCssdStationFlowMap } from "../../actions/cssd-read.actions";
