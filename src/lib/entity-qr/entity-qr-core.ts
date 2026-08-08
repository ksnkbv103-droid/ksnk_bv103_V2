/**
 * SSOT mã QR toàn viện BV103 — plain string (không JSON).
 * CSSD giữ hub riêng; các loại phiếu dùng prefix + UUID để quét mở lại bản ghi.
 */

import {
  CSSD_BATCH_QR_PREFIX,
  classifyCssdCode,
  normalizeCssdCode,
  type CssdQrTargetType,
} from "@/modules/cssd-erp/shared/domain/cssd-qr-core";
import { cssdSuCoIncidentJournalHref } from "@/lib/cssd-routes";
import { cssdTraceUrlFromMaQr } from "@/lib/cssd-nkbv-trace";

export type EntityQrKind =
  | "GSC_SESSION"
  | "VST_SESSION"
  | "CSSD_INCIDENT"
  | "NKBV_CASE"
  | "QLCV_TASK"
  | "LOC_KHOA"
  | "LOC_KHU"
  | "CSSD"
  | "UNKNOWN";

export type EntityQrResolved = {
  kind: EntityQrKind;
  code: string;
  /** UUID / mã nghiệp vụ để mở bản ghi */
  recordId: string | null;
  /** Deep-link mở lại đúng phiếu / đối tượng */
  href: string | null;
  label: string;
  cssdTarget?: CssdQrTargetType;
};

const UUID_RE =
  /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;

function normalizeEntityQrCode(raw: string | null | undefined): string {
  return normalizeCssdCode(raw);
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Mã QR phiếu — luôn gắn UUID đầy đủ để quét mở lại được. */
export function buildEntityQrCode(
  kind: Exclude<EntityQrKind, "CSSD" | "UNKNOWN" | "LOC_KHOA" | "LOC_KHU">,
  recordId: string,
): string {
  const id = String(recordId || "").trim();
  if (!id) return "";
  switch (kind) {
    case "GSC_SESSION":
      return `GSC-${id}`.toUpperCase();
    case "VST_SESSION":
      return `VST-${id}`.toUpperCase();
    case "CSSD_INCIDENT":
      return `SC-${id}`.toUpperCase();
    case "NKBV_CASE":
      return `NKBV-${id}`.toUpperCase();
    case "QLCV_TASK":
      return `QLCV-${id}`.toUpperCase();
    default:
      return "";
  }
}

/** Mã QR vị trí (khoa / khu vực) — in tem dán giường/phòng theo danh mục. */
export function buildLocationQrCode(
  kind: "LOC_KHOA" | "LOC_KHU",
  ma: string,
): string {
  const code = String(ma || "").trim().toUpperCase();
  if (!code) return "";
  return kind === "LOC_KHOA" ? `LOC-KHOA-${code}` : `LOC-KHU-${code}`;
}

function gscFormEditHref(sessionId: string, basePath = "/giam-sat-chung"): string {
  return `${basePath}?edit=${encodeURIComponent(sessionId)}`;
}

function vstFormEditHref(sessionId: string): string {
  return `/giam-sat-vst?edit=${encodeURIComponent(sessionId)}`;
}

function nkbvCaseHref(caseId: string): string {
  return `/giam-sat-nkbv?case=${encodeURIComponent(caseId)}`;
}

function qlcvTaskHref(taskId: string): string {
  return `/quan-ly-cong-viec?id=${encodeURIComponent(taskId)}`;
}

function locKhoaHref(maKhoa: string): string {
  return `/giam-sat-chung?loc=khoa&ma=${encodeURIComponent(maKhoa)}`;
}

function locKhuHref(maKhu: string): string {
  return `/giam-sat-chung?loc=khu&ma=${encodeURIComponent(maKhu)}`;
}

/**
 * Phân loại + deep-link thuần (không DB).
 * CSSD: trỏ trace; hub resolve chi tiết khi cần.
 */
export function classifyEntityQr(raw: string | null | undefined): EntityQrResolved {
  const code = normalizeEntityQrCode(raw);
  if (!code) {
    return { kind: "UNKNOWN", code: "", recordId: null, href: null, label: "Mã trống" };
  }

  const strip = (prefix: string) => code.slice(prefix.length);

  if (code.startsWith("GSC-")) {
    const id = strip("GSC-");
    if (isUuid(id)) {
      return {
        kind: "GSC_SESSION",
        code,
        recordId: id.toLowerCase(),
        href: gscFormEditHref(id.toLowerCase()),
        label: "Phiếu giám sát chung",
      };
    }
    return { kind: "UNKNOWN", code, recordId: null, href: null, label: "Mã GSC không hợp lệ" };
  }

  if (code.startsWith("VST-")) {
    const id = strip("VST-");
    if (isUuid(id)) {
      return {
        kind: "VST_SESSION",
        code,
        recordId: id.toLowerCase(),
        href: vstFormEditHref(id.toLowerCase()),
        label: "Phiếu vệ sinh tay",
      };
    }
    return { kind: "UNKNOWN", code, recordId: null, href: null, label: "Mã VST không hợp lệ" };
  }

  if (code.startsWith("SC-")) {
    const id = strip("SC-");
    if (isUuid(id)) {
      return {
        kind: "CSSD_INCIDENT",
        code,
        recordId: id.toLowerCase(),
        href: cssdSuCoIncidentJournalHref(id.toLowerCase()),
        label: "Biên bản sự cố CSSD",
      };
    }
    return { kind: "UNKNOWN", code, recordId: null, href: null, label: "Mã sự cố không hợp lệ" };
  }

  if (code.startsWith("NKBV-")) {
    const id = strip("NKBV-");
    if (isUuid(id)) {
      return {
        kind: "NKBV_CASE",
        code,
        recordId: id.toLowerCase(),
        href: nkbvCaseHref(id.toLowerCase()),
        label: "Phiếu giám sát NKBV",
      };
    }
    return { kind: "UNKNOWN", code, recordId: null, href: null, label: "Mã NKBV không hợp lệ" };
  }

  if (code.startsWith("QLCV-")) {
    const id = strip("QLCV-");
    if (isUuid(id)) {
      return {
        kind: "QLCV_TASK",
        code,
        recordId: id.toLowerCase(),
        href: qlcvTaskHref(id.toLowerCase()),
        label: "Công việc",
      };
    }
    return { kind: "UNKNOWN", code, recordId: null, href: null, label: "Mã công việc không hợp lệ" };
  }

  if (code.startsWith("LOC-KHOA-")) {
    const ma = strip("LOC-KHOA-");
    if (ma) {
      return {
        kind: "LOC_KHOA",
        code,
        recordId: ma,
        href: locKhoaHref(ma),
        label: "Vị trí khoa/phòng",
      };
    }
  }

  if (code.startsWith("LOC-KHU-")) {
    const ma = strip("LOC-KHU-");
    if (ma) {
      return {
        kind: "LOC_KHU",
        code,
        recordId: ma,
        href: locKhuHref(ma),
        label: "Vị trí khu vực giám sát",
      };
    }
  }

  const cssdTarget = classifyCssdCode(code);
  if (cssdTarget !== "UNKNOWN") {
    return {
      kind: "CSSD",
      code,
      recordId: code,
      href: cssdTraceUrlFromMaQr(code),
      label:
        cssdTarget === "STERILIZATION_BATCH" || code.startsWith(CSSD_BATCH_QR_PREFIX)
          ? "Mẻ tiệt khuẩn"
          : cssdTarget === "MACHINE"
            ? "Thiết bị CSSD"
            : "Bộ dụng cụ / chu trình",
      cssdTarget,
    };
  }

  return { kind: "UNKNOWN", code, recordId: null, href: null, label: "Không nhận diện mã QR" };
}
