"use client";

import React, { useEffect, useState, useTransition } from "react";
import SearchableSelect, { SearchableSelectOption } from "./SearchableSelect";
import { getActiveMasterDataAction } from "@/lib/master-data/master-data.actions";

export type RegistrySelectOption = {
  id: string;
  label: string;
  ma?: string;
  keywords?: string[];
};

type Props = {
  loaiDanhMuc: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  required?: boolean;
  /** Dữ liệu tĩnh được nạp sẵn từ master bundle để tránh fetch API (Zero-Latency) */
  staticOptions?: RegistrySelectOption[];
  /** Bật/tắt chế độ tìm kiếm nhanh. Mặc định là true (SearchableSelect), false sẽ dùng thẻ <select> vanilla */
  searchable?: boolean;
};

export default function RegistrySelect({
  loaiDanhMuc,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Tìm nhanh...",
  disabled = false,
  className = "",
  name,
  required,
  staticOptions,
  searchable = true,
}: Props) {
  const [options, setOptions] = useState<SearchableSelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 1. Đồng bộ staticOptions nếu được truyền từ bên ngoài (Zero-Latency)
  useEffect(() => {
    if (staticOptions) {
      const mapped = staticOptions.map((opt) => ({
        id: opt.id,
        label: opt.label,
        keywords: opt.keywords || [opt.ma || "", opt.label],
      }));
      setOptions(mapped);
      setLoading(false);
    }
  }, [staticOptions]);

  // 2. Fetch động nếu không có staticOptions
  useEffect(() => {
    if (staticOptions) return; // Bỏ qua nếu dùng staticOptions

    let active = true;
    setLoading(true);

    startTransition(async () => {
      try {
        const rows = await getActiveMasterDataAction(loaiDanhMuc);
        if (!active) return;

        const mappedOptions = rows.map((row) => ({
          id: row.id,
          label: row.ten,
          keywords: [row.ma, row.ten],
        }));

        setOptions(mappedOptions);
      } catch (err) {
        console.error(`Failed to load dynamic master-data for ${loaiDanhMuc}:`, err);
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [loaiDanhMuc, staticOptions]);

  const selectPlaceholder = loading || isPending ? "Đang tải danh mục..." : placeholder;

  // 3. Render chế độ SearchableSelect (Mặc định)
  if (searchable) {
    return (
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder={selectPlaceholder}
        searchPlaceholder={searchPlaceholder}
        disabled={disabled || loading || isPending}
        className={className}
        name={name}
        required={required}
      />
    );
  }

  // 4. Render chế độ <select> vanilla gọn nhẹ cho Mobile-First
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading || isPending}
        required={required}
        name={name}
        className="select h-11 min-h-[2.75rem] w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none shadow-sm transition-colors hover:bg-slate-50/50 focus:border-[#026f17]/50 focus:ring-1 focus:ring-[#026f17]/15 disabled:cursor-not-allowed disabled:opacity-60 md:h-12 md:rounded-2xl md:px-4"
      >
        <option value="">{selectPlaceholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
