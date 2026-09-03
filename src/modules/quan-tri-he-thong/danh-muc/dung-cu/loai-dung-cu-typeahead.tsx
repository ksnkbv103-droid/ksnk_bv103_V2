"use client";

import React, { useEffect, useState } from "react";
import { searchLoaiDungCuOptionsAction } from "../actions/loai-dung-cu.actions";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";

type Opt = { id: string; ma_danh_muc: string; ten_danh_muc: string };

export function LoaiDungCuTypeahead(props: {
  valueId: string;
  label?: string;
  disabled?: boolean;
  onChange: (id: string, opt: Opt | null) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Opt[]>([]);
  const [picked, setPicked] = useState<Opt | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(async () => {
      const res = await searchLoaiDungCuOptionsAction(q, 20);
      setRows(res.success ? res.data : []);
    }, 300);
    return () => window.clearTimeout(t);
  }, [q, open]);

  const display = picked
    ? `${picked.ma_danh_muc} — ${picked.ten_danh_muc}`
    : props.valueId
      ? "Đã chọn loại"
      : "";

  return (
    <div className="space-y-1 relative">
      {props.label ? <label className="text-[11px] font-medium text-slate-400 ml-1">{props.label}</label> : null}
      <input
        className={C.controlInput}
        disabled={props.disabled}
        placeholder="Gõ mã hoặc tên loại (không tải hết 2000+ món)"
        value={open ? q : display}
        onFocus={() => {
          setOpen(true);
          setQ("");
        }}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => window.setTimeout(() => setOpen(false), 200)}
      />
      {open ? (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white text-sm shadow-lg">
          <li>
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-slate-500 hover:bg-slate-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setPicked(null);
                props.onChange("", null);
                setOpen(false);
              }}
            >
              — Không chọn —
            </button>
          </li>
          {rows.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-emerald-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setPicked(o);
                  props.onChange(o.id, o);
                  setOpen(false);
                }}
              >
                <span className="font-mono text-[11px] text-slate-500">{o.ma_danh_muc}</span>{" "}
                {o.ten_danh_muc}
              </button>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="px-3 py-2 text-slate-400">Gõ để tìm loại dụng cụ…</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
