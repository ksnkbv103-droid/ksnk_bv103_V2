// src/lib/domain/cssd-packaging-rules.spec.ts
import { describe, it, expect } from 'vitest';
import {
  evaluateHeatCompatibility,
  assertPlasmaPackMaterialAllowed,
  type BomItem,
} from './cssd-packaging-rules';

describe('CSSD Packaging Rules', () => {
  // Scenario 1: Tất cả chịu nhiệt -> STEAM_134, requireSplit=false
  it('should recommend STEAM_134 and no split when all items are heat-resistant', () => {
    const items: BomItem[] = [
      {
        loai_id: '1',
        ten: 'Panh Kosey',
        so_luong_ke_hoach: 5,
        so_luong_thuc_te: 5,
        is_chiu_nhiet: true,
        phan_loai_spaulding: 'CRITICAL',
        phuong_phap_tiet_khuan_chi_dinh: 'STEAM_134',
      },
      {
        loai_id: '2',
        ten: 'Kéo Mayo',
        so_luong_ke_hoach: 2,
        so_luong_thuc_te: 2,
        is_chiu_nhiet: true,
        phan_loai_spaulding: 'CRITICAL',
        phuong_phap_tiet_khuan_chi_dinh: 'STEAM_134',
      },
    ];

    const result = evaluateHeatCompatibility(items);
    expect(result.requireSplit).toBe(false);
    expect(result.recommendedMethod).toBe('STEAM_134');
    expect(result.reason).toContain('Đồng nhất nhiệt lý tính');
  });

  // Scenario 2: Tất cả chịu nhiệt + có SEMI_CRITICAL -> STEAM_134 pass
  it('should recommend STEAM_134 when all items are heat-resistant, even if some are SEMI_CRITICAL', () => {
    const items: BomItem[] = [
      {
        loai_id: '1',
        ten: 'Ống soi cứng',
        so_luong_ke_hoach: 1,
        so_luong_thuc_te: 1,
        is_chiu_nhiet: true,
        phan_loai_spaulding: 'SEMI_CRITICAL',
        phuong_phap_tiet_khuan_chi_dinh: 'STEAM_121', // Chịu được nhiệt độ thấp hơn của hấp ướt
      },
      {
        loai_id: '2',
        ten: 'Kẹp phẫu thuật',
        so_luong_ke_hoach: 3,
        so_luong_thuc_te: 3,
        is_chiu_nhiet: true,
        phan_loai_spaulding: 'CRITICAL',
        phuong_phap_tiet_khuan_chi_dinh: 'STEAM_134',
      },
    ];

    const result = evaluateHeatCompatibility(items);
    expect(result.requireSplit).toBe(false);
    expect(result.recommendedMethod).toBe('STEAM_134');
  });

  // Scenario 3: 1 dụng cụ không chịu nhiệt -> requireSplit=true, recommend PLASMA
  it('should require split and recommend PLASMA if there is at least one non-heat-resistant item', () => {
    const items: BomItem[] = [
      {
        loai_id: '1',
        ten: 'Kẹp phẫu thuật',
        so_luong_ke_hoach: 3,
        so_luong_thuc_te: 3,
        is_chiu_nhiet: true,
        phan_loai_spaulding: 'CRITICAL',
        phuong_phap_tiet_khuan_chi_dinh: 'STEAM_134',
      },
      {
        loai_id: '2',
        ten: 'Camera nội soi nhạy cảm nhiệt',
        so_luong_ke_hoach: 1,
        so_luong_thuc_te: 1,
        is_chiu_nhiet: false,
        phan_loai_spaulding: 'SEMI_CRITICAL',
        phuong_phap_tiet_khuan_chi_dinh: 'PLASMA',
      },
    ];

    const result = evaluateHeatCompatibility(items);
    expect(result.requireSplit).toBe(true);
    expect(result.recommendedMethod).toBe('PLASMA');
    expect(result.reason).toContain('Bộ dụng cụ hỗn hợp chứa cấu phần nhạy cảm nhiệt');
  });

  // Scenario 4: Lẫn nhiệt + tất cả NON_CRITICAL -> vẫn requireSplit=true
  it('should still require split even if all heat-sensitive items are NON_CRITICAL', () => {
    const items: BomItem[] = [
      {
        loai_id: '1',
        ten: 'Dây đai silicon nhạy cảm nhiệt',
        so_luong_ke_hoach: 2,
        so_luong_thuc_te: 2,
        is_chiu_nhiet: false,
        phan_loai_spaulding: 'NON_CRITICAL',
        phuong_phap_tiet_khuan_chi_dinh: 'PLASMA',
      },
    ];

    const result = evaluateHeatCompatibility(items);
    expect(result.requireSplit).toBe(true);
  });

});


describe('assertPlasmaPackMaterialAllowed', () => {
  it('blocks cellulose on PLASMA with clear message', () => {
    const r = assertPlasmaPackMaterialAllowed({ method: 'PLASMA', packMaterial: 'CELLULOSE' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/cellulose/i);
    expect(r.message).toMatch(/Plasma cấm|không cellulose|đổi PP/i);
  });

  it('allows non-cellulose on PLASMA', () => {
    expect(assertPlasmaPackMaterialAllowed({ method: 'PLASMA', packMaterial: 'NON_CELLULOSE' }).ok).toBe(true);
  });

  it('skips non-plasma', () => {
    expect(assertPlasmaPackMaterialAllowed({ method: 'STEAM_134', packMaterial: 'CELLULOSE' }).ok).toBe(true);
  });
});
