"use client";

import React, { useEffect, useState, useTransition } from "react";
import SearchableSelect, { SearchableSelectOption } from "./SearchableSelect";
import { getActiveMasterDataAction } from "@/lib/master-data/master-data.actions";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

export type RegistrySelectOption = {
  id: string;
  label: string;
  ma?: string;
  keywords?: string[];
  groupLabel?: string;
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
      const mapped = staticOptions.map((opt) => {
        const hasCode = opt.ma && opt.ma.trim();
        const displayLabel = hasCode && loaiDanhMuc === "KHOA_PHONG"
          ? `[${opt.ma}] ${opt.label}`
          : opt.label;
        return {
          id: opt.id,
          label: displayLabel,
          keywords: opt.keywords || [opt.ma || "", opt.label],
          groupLabel: opt.groupLabel,
        };
      });
      setOptions(mapped);
      setLoading(false);
    }
  }, [staticOptions, loaiDanhMuc]);

  // 2. Fetch động nếu không có staticOptions
  useEffect(() => {
    if (staticOptions) return; // Bỏ qua nếu dùng staticOptions

    let active = true;
    setLoading(true);

    startTransition(async () => {
      try {
        const rows = await getActiveMasterDataAction(loaiDanhMuc);
        if (!active) return;

        const mappedOptions = rows.map((row) => {
          const hasCode = row.ma && row.ma.trim();
          const displayLabel = hasCode && loaiDanhMuc === "KHOA_PHONG"
            ? `[${row.ma}] ${row.ten}`
            : row.ten;
          return {
            id: row.id,
            label: displayLabel,
            keywords: [row.ma, row.ten],
          };
        });

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
        className={bv103LayoutChrome.controlSelectNative}
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
