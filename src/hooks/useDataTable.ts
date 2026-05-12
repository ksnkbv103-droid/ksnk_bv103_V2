// src/hooks/useDataTable.ts
"use client";

import { useState, useMemo } from "react";

/**
 * Hook quản lý logic cho Bảng dữ liệu (Tìm kiếm, Sắp xếp, Chọn nhiều)
 * @param initialData Dữ liệu gốc
 * @param searchableKeys Các key trong object dùng để tìm kiếm
 */
export function useDataTable<T extends { id: string | number }>(
  initialData: T[],
  searchableKeys: (keyof T)[] = []
) {
  const normalizeSearchText = (value: unknown) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim();

  // --- State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // --- Handlers ---

  // 1. Tìm kiếm
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  // 2. Sắp xếp
  const handleSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // 3. Chọn dòng
  const toggleSelectRow = (id: string | number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === initialData.length && initialData.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(initialData.map(item => item.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // --- Computed Data ---

  // Dữ liệu sau khi lọc và sắp xếp
  const processedData = useMemo(() => {
    let result = [...initialData];

    // Lọc theo từ khóa tìm kiếm (Nâng cao: hỗ trợ tìm kiếm trên toàn bộ các giá trị thuộc tính)
    if (searchTerm && searchableKeys.length > 0) {
      const keywords = normalizeSearchText(searchTerm).split(/\s+/).filter(Boolean);
      
      result = result.filter(item => {
        const haystack = searchableKeys
          .map((key) => normalizeSearchText(item[key]))
          .join(" ");
        return keywords.every((kw) => haystack.includes(kw));
      });
    }

    // Sắp xếp
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [initialData, searchTerm, sortConfig, searchableKeys]);

  // Các item đang được chọn
  const selectedItems = useMemo(() => 
    initialData.filter(item => selectedIds.has(item.id)),
    [initialData, selectedIds]
  );

  return {
    // Data
    processedData,
    selectedItems,
    selectedIds,
    
    // State
    searchTerm,
    sortConfig,
    
    // Handlers
    handleSearch,
    handleSort,
    toggleSelectRow,
    toggleSelectAll,
    clearSelection,
    
    // Helpers
    isAllSelected: initialData.length > 0 && selectedIds.size === initialData.length,
    hasSelection: selectedIds.size > 0
  };
}
