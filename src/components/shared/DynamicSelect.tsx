"use client";

import React, { useEffect, useState, useTransition } from "react";
import SearchableSelect, { SearchableSelectOption } from "./SearchableSelect";
import { getActiveMasterDataAction } from "@/lib/master-data/master-data.actions";

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
};

export default function DynamicSelect({
  loaiDanhMuc,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Tìm nhanh...",
  disabled = false,
  className = "",
  name,
  required,
}: Props) {
  const [options, setOptions] = useState<SearchableSelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
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
  }, [loaiDanhMuc]);

  const selectPlaceholder = loading || isPending ? "Đang tải danh mục..." : placeholder;

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
