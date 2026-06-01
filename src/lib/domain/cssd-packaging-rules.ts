// src/lib/domain/cssd-packaging-rules.ts

export type BomItem = {
  loai_id: string;
  ten: string;
  so_luong_ke_hoach: number;
  so_luong_thuc_te: number;
  so_luong_hong?: number;
  is_chiu_nhiet: boolean;
  phan_loai_spaulding: 'CRITICAL' | 'SEMI_CRITICAL' | 'NON_CRITICAL';
  phuong_phap_tiet_khuan_chi_dinh: 'STEAM_134' | 'STEAM_121' | 'PLASMA' | 'EO';
};

export type HeatEvaluation = {
  requireSplit: boolean;
  recommendedMethod: 'STEAM_134' | 'STEAM_121' | 'PLASMA' | 'EO';
  reason: string;
};

export type GapRow = {
  loai_id: string;
  ten: string;
  thieu: number;
  hong: number;
};

/**
 * Đánh giá tính đồng nhất chịu nhiệt lý tính của các dụng cụ trong bộ.
 * Phục vụ Poka-yoke tránh hấp nhầm dụng cụ nhạy cảm nhiệt ở 134°C.
 */
export function evaluateHeatCompatibility(items: BomItem[]): HeatEvaluation {
  if (!items || items.length === 0) {
    return {
      requireSplit: false,
      recommendedMethod: 'STEAM_134',
      reason: 'Không có dụng cụ trong bộ.',
    };
  }

  const lowTempItems = items.filter(item => !item.is_chiu_nhiet);

  if (lowTempItems.length > 0) {
    // Có chứa dụng cụ không chịu nhiệt -> bắt buộc phải tách
    // Xác định phương pháp khuyến nghị dựa trên chỉ định của dụng cụ
    const methods = lowTempItems.map(item => item.phuong_phap_tiet_khuan_chi_dinh);
    let recommendedMethod: 'STEAM_134' | 'STEAM_121' | 'PLASMA' | 'EO' = 'PLASMA';
    
    if (methods.includes('EO')) {
      recommendedMethod = 'EO';
    } else if (methods.includes('PLASMA')) {
      recommendedMethod = 'PLASMA';
    } else if (methods.includes('STEAM_121')) {
      recommendedMethod = 'STEAM_121';
    }

    return {
      requireSplit: true,
      recommendedMethod,
      reason: `Bộ dụng cụ hỗn hợp chứa cấu phần nhạy cảm nhiệt (${lowTempItems.map(i => i.ten).join(', ')}). Đề xuất ${recommendedMethod} để bảo vệ dụng cụ, hoặc tách trạm hấp.`,
    };
  }

  // 100% chịu nhiệt
  return {
    requireSplit: false,
    recommendedMethod: 'STEAM_134',
    reason: 'Đồng nhất nhiệt lý tính (An toàn hấp 134°C).',
  };
}

/**
 * Tổng hợp độ lệch của số lượng thực tế so với thiết kế chuẩn (BOM).
 */
export function summarizeBomGap(items: BomItem[]): GapRow[] {
  if (!items) return [];

  const gaps: GapRow[] = [];

  for (const item of items) {
    const thieu = Math.max(0, item.so_luong_ke_hoach - item.so_luong_thuc_te);
    const hong = item.so_luong_hong ?? 0;

    if (thieu > 0 || hong > 0) {
      gaps.push({
        loai_id: item.loai_id,
        ten: item.ten,
        thieu,
        hong,
      });
    }
  }

  return gaps;
}

/**
 * Kiểm tra xem bộ dụng cụ đã đủ điều kiện để Đóng gói đạt hay chưa.
 * Theo quy tắc an toàn vật lý lý tính, nếu lẫn nhiệt bắt buộc phải tách SUB trước.
 * Thiếu hụt số lượng không chặn đóng gói (chỉ cảnh báo).
 */
export function isReadyForPackaging(
  items: BomItem[],
  split: 'NONE' | 'DONE',
): { ready: boolean; reason?: string } {
  const heatEval = evaluateHeatCompatibility(items);

  if (heatEval.requireSplit && split === 'NONE') {
    return {
      ready: false,
      reason: 'Cần tách cấu phần nhạy cảm nhiệt sang túi hấp nhiệt độ thấp trước khi Đạt.',
    };
  }

  return {
    ready: true,
  };
}
