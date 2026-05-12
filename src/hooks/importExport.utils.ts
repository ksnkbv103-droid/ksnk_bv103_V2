"use client";

import ExcelJS from "exceljs";
import { buildLockedTemplateMapping, hasImportTemplatePreset } from "@/lib/import-export-template";

export function excelCellToPlain(val: unknown): unknown {
  if (val !== null && typeof val === "object") {
    const o = val as Record<string, unknown>;
    if ("text" in o && o.text !== undefined) return o.text;
    if ("result" in o && o.result !== undefined) return o.result;
    if ("richText" in o && Array.isArray(o.richText)) {
      return (o.richText as { text?: string }[]).map((t) => t.text ?? "").join("");
    }
  }
  return val;
}

export function normalizeImportedIsActive(v: unknown): boolean {
  if (v === undefined) return true;
  if (v === false || v === 0) return false;
  const s = String(v).trim().toLowerCase();
  return !(s === "false" || s === "0" || s === "no" || s === "off" || s === "tắt");
}

export function buildFullReverseMapping(params: {
  tableName: string;
  uniqueKey: string;
  normalizedMapping: Record<string, string>;
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (hasImportTemplatePreset(params.tableName)) {
    const locked = buildLockedTemplateMapping({
      tableName: params.tableName,
      uniqueKey: params.uniqueKey,
      baseMapping: params.normalizedMapping,
      data: undefined,
    });
    Object.entries(locked).forEach(([header, field]) => {
      out[String(header).trim().toUpperCase()] = field;
    });
  }
  Object.entries(params.normalizedMapping).forEach(([header, key]) => {
    out[String(header).trim().toUpperCase()] = key;
  });
  return out;
}

export function detectHeaderRowNum(worksheet: ExcelJS.Worksheet, reverseMapping: Record<string, string>): number {
  const keys = new Set(Object.keys(reverseMapping));
  for (let r = 1; r <= 12; r++) {
    const row = worksheet.getRow(r);
    const lim = Math.min(Math.max(row.actualCellCount || 0, 1), 80);
    for (let c = 1; c <= lim; c++) {
      const h = String(excelCellToPlain(row.getCell(c).value) ?? "").trim().toUpperCase();
      if (h && keys.has(h)) return r;
    }
  }
  return 0;
}

export function computeScanMaxCol(worksheet: ExcelJS.Worksheet, headerRowNum: number): number {
  const headerRow = worksheet.getRow(headerRowNum);
  let maxCol = Math.max(headerRow.actualCellCount || 0, 1);
  const last = Math.min(worksheet.rowCount || 0, headerRowNum + 2000);
  for (let r = headerRowNum + 1; r <= last; r++) {
    maxCol = Math.max(maxCol, worksheet.getRow(r).actualCellCount || 0);
  }
  return Math.min(Math.max(maxCol, 1), 80);
}
