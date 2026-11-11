"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import SearchableSelect, { SearchableSelectOption } from "./SearchableSelect";
import { getActiveMasterDataAction } from "@/lib/master-data/master-data.actions";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { formatKhoaPickerLabel } from "@/lib/domain/khoa-display";
import { ChevronDown } from "./FloatingLabelContent";

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
  /** Nhãn nổi trong ô (thay nhãn rời phía trên). */
  label?: string;
};

function mapRegistryOptions(
  items: RegistrySelectOption[],
  loaiDanhMuc: string,
): SearchableSelectOption[] {
  return items.map((opt) => {
    const displayLabel =
      loaiDanhMuc === "KHOA_PHONG"
        ? formatKhoaPickerLabel({ ma: opt.ma, ten_khoa: opt.label })
        : opt.label;
    return {
      id: opt.id,
      label: displayLabel,
      keywords: opt.keywords || [opt.ma || "", opt.label],
      groupLabel: opt.groupLabel,
    };
  });
}

/** Khóa ổn định — tránh effect/memo chạy lại khi parent truyền mảng mới cùng nội dung. */
function staticOptionsFingerprint(items: RegistrySelectOption[]): string {
  return items
    .map((o) => `${o.id}|${o.label}|${o.ma ?? ""}|${o.groupLabel ?? ""}|${(o.keywords ?? []).join(",")}`)
    .join("\u0001");
}

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
  label,
}: Props) {
  const [fetchedOptions, setFetchedOptions] = useState<SearchableSelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const staticFingerprint = staticOptions ? staticOptionsFingerprint(staticOptions) : null;
  const staticMappedOptions = useMemo(() => {
    if (!staticOptions) return null;
    return mapRegistryOptions(staticOptions, loaiDanhMuc);
    // staticFingerprint ổn định khi parent truyền mảng mới cùng nội dung
     
  }, [staticFingerprint, loaiDanhMuc]);

  const options = staticMappedOptions ?? fetchedOptions;

  // Fetch động chỉ khi không có staticOptions
  useEffect(() => {
    if (staticOptions) return;

    let active = true;
    setLoading(true);

    startTransition(async () => {
      try {
        const rows = await getActiveMasterDataAction(loaiDanhMuc);
        if (!active) return;

        const mappedOptions = rows.map((row) => {
          const displayLabel =
            loaiDanhMuc === "KHOA_PHONG"
              ? formatKhoaPickerLabel({ ma: row.ma, ten_khoa: row.ten })
              : row.ten;
          return {
            id: row.id,
            label: displayLabel,
            keywords: [row.ma, row.ten],
          };
        });

        setFetchedOptions(mappedOptions);
      } catch (err) {
        console.error(`Failed to load dynamic master-data for ${loaiDanhMuc}:`, err);
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [loaiDanhMuc, staticFingerprint]);

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
        label={label}
      />
    );
  }

  if (label) {
    return (
      <div className={`relative ${className}`}>
        {value ? (
          <span className="pointer-events-none absolute left-3.5 top-1.5 text-xs font-medium leading-none text-slate-500">
            {label}
          </span>
        ) : null}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading || isPending}
          required={required}
          name={name}
          aria-label={label}
          className={`${bv103LayoutChrome.controlFloatingNative} ${value ? "pt-4 font-semibold text-slate-900" : "text-slate-500"}`}
        >
          <option value="">{loading || isPending ? selectPlaceholder : label}</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
          <ChevronDown />
        </span>
      </div>
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
