
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "cssd_bak_s2_bo_tong": {
                  Row: {
                    "ban_ghi_id": string,"bang_nguon": string,"cot": string,"gia_tri_cu": string | null,"thoi_diem": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ban_ghi_id": string,"bang_nguon": string,"cot": string,"gia_tri_cu"?: string | null,"thoi_diem"?: string
                  }
                  Update: {
                    "ban_ghi_id"?: string,"bang_nguon"?: string,"cot"?: string,"gia_tri_cu"?: string | null,"thoi_diem"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cssd_catalog_de_nghi": {
                  Row: {
                    "approved_at": string | null,"approved_by_id": string | null,"created_at": string,"id": string,"nguoi_de_nghi_id": string | null,"note": string | null,"payload_after": NonNullable<Json>,"payload_before": NonNullable<Json>,"reject_reason": string | null,"status": string,"target_id": string | null,"target_kind": string,"target_ma": string | null,"target_ten": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_by_id"?: string | null,"created_at"?: string,"id"?: string,"nguoi_de_nghi_id"?: string | null,"note"?: string | null,"payload_after"?: NonNullable<Json>,"payload_before"?: NonNullable<Json>,"reject_reason"?: string | null,"status"?: string,"target_id"?: string | null,"target_kind": string,"target_ma"?: string | null,"target_ten"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by_id"?: string | null,"created_at"?: string,"id"?: string,"nguoi_de_nghi_id"?: string | null,"note"?: string | null,"payload_after"?: NonNullable<Json>,"payload_before"?: NonNullable<Json>,"reject_reason"?: string | null,"status"?: string,"target_id"?: string | null,"target_kind"?: string,"target_ma"?: string | null,"target_ten"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cssd_catalog_de_nghi_approved_by_id_fkey"
      columns: ["approved_by_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_catalog_de_nghi_approved_by_id_fkey"
      columns: ["approved_by_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "cssd_catalog_de_nghi_approved_by_id_fkey"
      columns: ["approved_by_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_catalog_de_nghi_approved_by_id_fkey"
      columns: ["approved_by_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_catalog_de_nghi_approved_by_id_fkey"
      columns: ["approved_by_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_catalog_de_nghi_approved_by_id_fkey"
      columns: ["approved_by_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "cssd_catalog_de_nghi_nguoi_de_nghi_id_fkey"
      columns: ["nguoi_de_nghi_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_catalog_de_nghi_nguoi_de_nghi_id_fkey"
      columns: ["nguoi_de_nghi_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "cssd_catalog_de_nghi_nguoi_de_nghi_id_fkey"
      columns: ["nguoi_de_nghi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_catalog_de_nghi_nguoi_de_nghi_id_fkey"
      columns: ["nguoi_de_nghi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_catalog_de_nghi_nguoi_de_nghi_id_fkey"
      columns: ["nguoi_de_nghi_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_catalog_de_nghi_nguoi_de_nghi_id_fkey"
      columns: ["nguoi_de_nghi_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"cssd_dm_bo_dung_cu": {
                  Row: {
                    "co_ma_dinh_danh_rieng": boolean,"created_at": string | null,"ghi_chu": string | null,"id": string,"is_active": boolean | null,"is_implant": boolean,"khoa_su_dung_id": string | null,"loai_bao_goi_id": string | null,"loai_dung_cu_id": string | null,"ma_bo": string,"ngay_kiem_ke_gan_nhat": string | null,"parent_bo_id": string | null,"phan_loai_bo": string,"quy_cach": string | null,"ten_bo": string,"trang_thai": string | null,"updated_at": string | null,"vai_tro_tach": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "co_ma_dinh_danh_rieng"?: boolean,"created_at"?: string | null,"ghi_chu"?: string | null,"id"?: string,"is_active"?: boolean | null,"is_implant"?: boolean,"khoa_su_dung_id"?: string | null,"loai_bao_goi_id"?: string | null,"loai_dung_cu_id"?: string | null,"ma_bo": string,"ngay_kiem_ke_gan_nhat"?: string | null,"parent_bo_id"?: string | null,"phan_loai_bo"?: string,"quy_cach"?: string | null,"ten_bo": string,"trang_thai"?: string | null,"updated_at"?: string | null,"vai_tro_tach"?: string | null
                  }
                  Update: {
                    "co_ma_dinh_danh_rieng"?: boolean,"created_at"?: string | null,"ghi_chu"?: string | null,"id"?: string,"is_active"?: boolean | null,"is_implant"?: boolean,"khoa_su_dung_id"?: string | null,"loai_bao_goi_id"?: string | null,"loai_dung_cu_id"?: string | null,"ma_bo"?: string,"ngay_kiem_ke_gan_nhat"?: string | null,"parent_bo_id"?: string | null,"phan_loai_bo"?: string,"quy_cach"?: string | null,"ten_bo"?: string,"trang_thai"?: string | null,"updated_at"?: string | null,"vai_tro_tach"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cssd_dm_bo_dung_cu_loai_bao_goi_id_fkey"
      columns: ["loai_bao_goi_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_bao_goi"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_dm_bo_dung_cu_parent_bo_id_fkey"
      columns: ["parent_bo_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_bo_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_dm_bo_dung_cu_parent_bo_id_fkey"
      columns: ["parent_bo_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_dung_cu_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_dm_bo_dung_cu_parent_bo_id_fkey"
      columns: ["parent_bo_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_heat_split_hint"
      referencedColumns: ["bo_id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_khoa_su_dung_id_fkey"
      columns: ["khoa_su_dung_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_loai_dung_cu_summary"
      referencedColumns: ["id"]
    }
                  ]
                },"cssd_dm_bo_dung_cu_chi_tiet": {
                  Row: {
                    "bo_dung_cu_id": string | null,"created_at": string | null,"ghi_chu": string | null,"id": string,"is_active": boolean | null,"loai_dung_cu_id": string | null,"so_luong": number | null,"specs": Json | null,"ten_chi_tiet": string | null,"ten_dung_cu_le": string,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bo_dung_cu_id"?: string | null,"created_at"?: string | null,"ghi_chu"?: string | null,"id"?: string,"is_active"?: boolean | null,"loai_dung_cu_id"?: string | null,"so_luong"?: number | null,"specs"?: Json | null,"ten_chi_tiet"?: string | null,"ten_dung_cu_le": string,"updated_at"?: string | null
                  }
                  Update: {
                    "bo_dung_cu_id"?: string | null,"created_at"?: string | null,"ghi_chu"?: string | null,"id"?: string,"is_active"?: boolean | null,"loai_dung_cu_id"?: string | null,"so_luong"?: number | null,"specs"?: Json | null,"ten_chi_tiet"?: string | null,"ten_dung_cu_le"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_bo_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_dung_cu_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_heat_split_hint"
      referencedColumns: ["bo_id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_loai_dung_cu_summary"
      referencedColumns: ["id"]
    }
                  ]
                },"cssd_dm_bo_phan_bo": {
                  Row: {
                    "bo_dung_cu_id": string,"created_at": string,"id": string,"is_active": boolean,"khoa_phong_id": string,"so_luong_co_so": number,"so_luong_hien_tai": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bo_dung_cu_id": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"khoa_phong_id": string,"so_luong_co_so"?: number,"so_luong_hien_tai"?: number,"updated_at"?: string
                  }
                  Update: {
                    "bo_dung_cu_id"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"khoa_phong_id"?: string,"so_luong_co_so"?: number,"so_luong_hien_tai"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cssd_dm_bo_phan_bo_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_bo_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_dm_bo_phan_bo_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_dung_cu_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_dm_bo_phan_bo_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_heat_split_hint"
      referencedColumns: ["bo_id"]
    },{
      foreignKeyName: "cssd_dm_bo_phan_bo_khoa_phong_id_fkey"
      columns: ["khoa_phong_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    }
                  ]
                },"cssd_dm_chuong_trinh_may": {
                  Row: {
                    "ap_suat_chuan": string | null,"created_at": string,"id": string,"is_active": boolean,"ma_chuong_trinh": string,"nguon": string | null,"nhiet_do_chuan": string | null,"sort_order": number,"ten_chuong_trinh": string,"thiet_bi_id": string,"thoi_gian_chuan": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ap_suat_chuan"?: string | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"ma_chuong_trinh": string,"nguon"?: string | null,"nhiet_do_chuan"?: string | null,"sort_order"?: number,"ten_chuong_trinh": string,"thiet_bi_id": string,"thoi_gian_chuan"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "ap_suat_chuan"?: string | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"ma_chuong_trinh"?: string,"nguon"?: string | null,"nhiet_do_chuan"?: string | null,"sort_order"?: number,"ten_chuong_trinh"?: string,"thiet_bi_id"?: string,"thoi_gian_chuan"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cssd_dm_chuong_trinh_may_thiet_bi_id_fkey"
      columns: ["thiet_bi_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_thiet_bi"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_dm_chuong_trinh_may_thiet_bi_id_fkey"
      columns: ["thiet_bi_id"]
isOneToOne: false
      referencedRelation: "v_cssd_thiet_bi_full"
      referencedColumns: ["id"]
    }
                  ]
                },"cssd_dm_hoa_chat": {
                  Row: {
                    "created_at": string | null,"don_vi_tinh": string | null,"han_su_dung": string | null,"id": string,"is_active": boolean | null,"loai_hoa_chat": string | null,"ma_hoa_chat": string,"nguong_ton_toi_thieu": number | null,"nhom": string | null,"nhom_id": string | null,"so_ngay_cho_hang": number,"specs": NonNullable<Json>,"ten_hoa_chat": string,"ty_le_canh_bao_pct": number,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"don_vi_tinh"?: string | null,"han_su_dung"?: string | null,"id"?: string,"is_active"?: boolean | null,"loai_hoa_chat"?: string | null,"ma_hoa_chat": string,"nguong_ton_toi_thieu"?: number | null,"nhom"?: string | null,"nhom_id"?: string | null,"so_ngay_cho_hang"?: number,"specs"?: NonNullable<Json>,"ten_hoa_chat": string,"ty_le_canh_bao_pct"?: number,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"don_vi_tinh"?: string | null,"han_su_dung"?: string | null,"id"?: string,"is_active"?: boolean | null,"loai_hoa_chat"?: string | null,"ma_hoa_chat"?: string,"nguong_ton_toi_thieu"?: number | null,"nhom"?: string | null,"nhom_id"?: string | null,"so_ngay_cho_hang"?: number,"specs"?: NonNullable<Json>,"ten_hoa_chat"?: string,"ty_le_canh_bao_pct"?: number,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cssd_dm_hoa_chat_nhom_id_loai_fkey"
      columns: ["nhom_id","loai_hoa_chat"]
isOneToOne: false
      referencedRelation: "cssd_dm_hoa_chat_nhom"
      referencedColumns: ["id","loai_hoa_chat"]
    }
                  ]
                },"cssd_dm_hoa_chat_nhom": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"loai_hoa_chat": string,"ma": string,"ten": string,"thu_tu": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"loai_hoa_chat": string,"ma": string,"ten": string,"thu_tu"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"loai_hoa_chat"?: string,"ma"?: string,"ten"?: string,"thu_tu"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cssd_dm_loai_bao_goi": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma": string,"so_ngay_han_dung": number | null,"ten": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"ma": string,"so_ngay_han_dung"?: number | null,"ten": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"ma"?: string,"so_ngay_han_dung"?: number | null,"ten"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cssd_dm_loai_dung_cu": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"is_chiu_nhiet": boolean,"loai_bao_goi_mac_dinh_id": string | null,"ma_loai": string,"mo_ta": string | null,"phan_loai": string,"phan_loai_spaulding": string,"phuong_phap_cho_phep": (string)[],"phuong_phap_tiet_khuan_chi_dinh": string | null,"so_luong_kho_du_phong": number,"so_ngay_han_dung": number | null,"specs": Json | null,"ten_loai": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"is_chiu_nhiet"?: boolean,"loai_bao_goi_mac_dinh_id"?: string | null,"ma_loai": string,"mo_ta"?: string | null,"phan_loai"?: string,"phan_loai_spaulding"?: string,"phuong_phap_cho_phep"?: (string)[],"phuong_phap_tiet_khuan_chi_dinh"?: string | null,"so_luong_kho_du_phong"?: number,"so_ngay_han_dung"?: number | null,"specs"?: Json | null,"ten_loai": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"is_chiu_nhiet"?: boolean,"loai_bao_goi_mac_dinh_id"?: string | null,"ma_loai"?: string,"mo_ta"?: string | null,"phan_loai"?: string,"phan_loai_spaulding"?: string,"phuong_phap_cho_phep"?: (string)[],"phuong_phap_tiet_khuan_chi_dinh"?: string | null,"so_luong_kho_du_phong"?: number,"so_ngay_han_dung"?: number | null,"specs"?: Json | null,"ten_loai"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cssd_dm_loai_dung_cu_loai_bao_goi_mac_dinh_id_fkey"
      columns: ["loai_bao_goi_mac_dinh_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_bao_goi"
      referencedColumns: ["id"]
    }
                  ]
                },"cssd_dm_me_chuyen_tiep": {
                  Row: {
                    "dac_ta_ma": string | null,"den_trang_thai": string,"ghi_chu": string | null,"tu_trang_thai": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dac_ta_ma"?: string | null,"den_trang_thai": string,"ghi_chu"?: string | null,"tu_trang_thai": string
                  }
                  Update: {
                    "dac_ta_ma"?: string | null,"den_trang_thai"?: string,"ghi_chu"?: string | null,"tu_trang_thai"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cssd_dm_thiet_bi": {
                  Row: {
                    "chu_ky_bao_tri_ngay": number | null,"created_at": string | null,"id": string,"is_active": boolean | null,"loai_may_id": string | null,"ma_thiet_bi": string,"ngay_bao_tri_gan_nhat": string | null,"ngay_bao_tri_tiep_theo": string | null,"ngay_dua_vao_su_dung": string | null,"specs": NonNullable<Json>,"ten_thiet_bi": string,"trang_thai": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "chu_ky_bao_tri_ngay"?: number | null,"created_at"?: string | null,"id"?: string,"is_active"?: boolean | null,"loai_may_id"?: string | null,"ma_thiet_bi": string,"ngay_bao_tri_gan_nhat"?: string | null,"ngay_bao_tri_tiep_theo"?: string | null,"ngay_dua_vao_su_dung"?: string | null,"specs"?: NonNullable<Json>,"ten_thiet_bi": string,"trang_thai"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "chu_ky_bao_tri_ngay"?: number | null,"created_at"?: string | null,"id"?: string,"is_active"?: boolean | null,"loai_may_id"?: string | null,"ma_thiet_bi"?: string,"ngay_bao_tri_gan_nhat"?: string | null,"ngay_bao_tri_tiep_theo"?: string | null,"ngay_dua_vao_su_dung"?: string | null,"specs"?: NonNullable<Json>,"ten_thiet_bi"?: string,"trang_thai"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    }
                  ]
                },"cssd_fact_bao_tri": {
                  Row: {
                    "bat_dau_boi": string | null,"checklist_jsonb": NonNullable<Json>,"created_at": string,"huy_boi": string | null,"id": string,"is_active": boolean,"ket_qua_ghi_nhan": string | null,"ket_thuc_boi": string | null,"loai_phieu": string,"ly_do": string | null,"ma_phieu": string,"nguoi_thuc_hien_id": string | null,"su_co_id": string | null,"thiet_bi_id": string,"thoi_gian_bat_dau": string,"thoi_gian_ket_thuc": string | null,"trang_thai": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bat_dau_boi"?: string | null,"checklist_jsonb"?: NonNullable<Json>,"created_at"?: string,"huy_boi"?: string | null,"id"?: string,"is_active"?: boolean,"ket_qua_ghi_nhan"?: string | null,"ket_thuc_boi"?: string | null,"loai_phieu"?: string,"ly_do"?: string | null,"ma_phieu": string,"nguoi_thuc_hien_id"?: string | null,"su_co_id"?: string | null,"thiet_bi_id": string,"thoi_gian_bat_dau"?: string,"thoi_gian_ket_thuc"?: string | null,"trang_thai": string,"updated_at"?: string
                  }
                  Update: {
                    "bat_dau_boi"?: string | null,"checklist_jsonb"?: NonNullable<Json>,"created_at"?: string,"huy_boi"?: string | null,"id"?: string,"is_active"?: boolean,"ket_qua_ghi_nhan"?: string | null,"ket_thuc_boi"?: string | null,"loai_phieu"?: string,"ly_do"?: string | null,"ma_phieu"?: string,"nguoi_thuc_hien_id"?: string | null,"su_co_id"?: string | null,"thiet_bi_id"?: string,"thoi_gian_bat_dau"?: string,"thoi_gian_ket_thuc"?: string | null,"trang_thai"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cssd_fact_bao_tri_nguoi_thuc_hien_id_fkey"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_bao_tri_nguoi_thuc_hien_id_fkey"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "cssd_fact_bao_tri_nguoi_thuc_hien_id_fkey"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_bao_tri_nguoi_thuc_hien_id_fkey"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_bao_tri_nguoi_thuc_hien_id_fkey"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_bao_tri_nguoi_thuc_hien_id_fkey"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "cssd_fact_bao_tri_su_co_id_fkey"
      columns: ["su_co_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_bao_tri_su_co_id_fkey"
      columns: ["su_co_id"]
isOneToOne: false
      referencedRelation: "v_cssd_su_co_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_bao_tri_thiet_bi_thiet_bi_id_fkey"
      columns: ["thiet_bi_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_thiet_bi"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_bao_tri_thiet_bi_thiet_bi_id_fkey"
      columns: ["thiet_bi_id"]
isOneToOne: false
      referencedRelation: "v_cssd_thiet_bi_full"
      referencedColumns: ["id"]
    }
                  ]
                },"cssd_fact_bowie_dick": {
                  Row: {
                    "bao_tri_id": string | null,"created_at": string,"ghi_chu": string | null,"id": string,"ket_qua": string,"ngay_ymd": string,"nguoi_id": string | null,"recorded_at": string,"thiet_bi_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bao_tri_id"?: string | null,"created_at"?: string,"ghi_chu"?: string | null,"id"?: string,"ket_qua": string,"ngay_ymd": string,"nguoi_id"?: string | null,"recorded_at"?: string,"thiet_bi_id": string
                  }
                  Update: {
                    "bao_tri_id"?: string | null,"created_at"?: string,"ghi_chu"?: string | null,"id"?: string,"ket_qua"?: string,"ngay_ymd"?: string,"nguoi_id"?: string | null,"recorded_at"?: string,"thiet_bi_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cssd_fact_bowie_dick_thiet_bi_id_fkey"
      columns: ["thiet_bi_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_thiet_bi"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_bowie_dick_thiet_bi_id_fkey"
      columns: ["thiet_bi_id"]
isOneToOne: false
      referencedRelation: "v_cssd_thiet_bi_full"
      referencedColumns: ["id"]
    }
                  ]
                },"cssd_fact_kho_giao_dich": {
                  Row: {
                    "bo_dung_cu_id": string | null,"created_at": string,"ghi_chu": string | null,"id": string,"is_active": boolean,"loai_dung_cu_id": string,"loai_giao_dich": string,"nguoi_thuc_hien_id": string | null,"quy_trinh_id": string | null,"so_luong_thay_doi": number,"su_co_id": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bo_dung_cu_id"?: string | null,"created_at"?: string,"ghi_chu"?: string | null,"id"?: string,"is_active"?: boolean,"loai_dung_cu_id": string,"loai_giao_dich": string,"nguoi_thuc_hien_id"?: string | null,"quy_trinh_id"?: string | null,"so_luong_thay_doi": number,"su_co_id"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "bo_dung_cu_id"?: string | null,"created_at"?: string,"ghi_chu"?: string | null,"id"?: string,"is_active"?: boolean,"loai_dung_cu_id"?: string,"loai_giao_dich"?: string,"nguoi_thuc_hien_id"?: string | null,"quy_trinh_id"?: string | null,"so_luong_thay_doi"?: number,"su_co_id"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cssd_fact_kho_dc_su_co_id_fkey"
      columns: ["su_co_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_kho_dc_su_co_id_fkey"
      columns: ["su_co_id"]
isOneToOne: false
      referencedRelation: "v_cssd_su_co_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_kho_dung_cu_giao_dich_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_bo_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_kho_dung_cu_giao_dich_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_dung_cu_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_kho_dung_cu_giao_dich_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_heat_split_hint"
      referencedColumns: ["bo_id"]
    },{
      foreignKeyName: "fact_kho_dung_cu_giao_dich_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_kho_dung_cu_giao_dich_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_loai_dung_cu_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_kho_dung_cu_giao_dich_quy_trinh_id_fkey"
      columns: ["quy_trinh_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_quy_trinh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_kho_dung_cu_giao_dich_quy_trinh_id_fkey"
      columns: ["quy_trinh_id"]
isOneToOne: false
      referencedRelation: "v_cssd_quy_trinh_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_cssd_kho_giao_dich_nguoi_thuc_hien"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_cssd_kho_giao_dich_nguoi_thuc_hien"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_cssd_kho_giao_dich_nguoi_thuc_hien"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_cssd_kho_giao_dich_nguoi_thuc_hien"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_cssd_kho_giao_dich_nguoi_thuc_hien"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_cssd_kho_giao_dich_nguoi_thuc_hien"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"cssd_fact_kho_hoa_chat_giao_dich": {
                  Row: {
                    "created_at": string,"created_by": string | null,"dm_hoa_chat_id": string,"duyet_at": string | null,"ghi_chu": string | null,"han_su_dung": string | null,"id": string,"is_active": boolean,"loai_giao_dich": string,"ly_do_dao": string | null,"ly_do_tu_choi": string | null,"ly_do_xuat": string | null,"ma_lo": string | null,"ma_phieu": string,"nguoi_duyet_id": string | null,"nguoi_thuc_hien_id": string | null,"phieu_goc_id": string | null,"so_luong_co_dau": number,"su_co_id": string | null,"trang_thai": string,"tu_duyet_ngoai_le": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"dm_hoa_chat_id": string,"duyet_at"?: string | null,"ghi_chu"?: string | null,"han_su_dung"?: string | null,"id"?: string,"is_active"?: boolean,"loai_giao_dich": string,"ly_do_dao"?: string | null,"ly_do_tu_choi"?: string | null,"ly_do_xuat"?: string | null,"ma_lo"?: string | null,"ma_phieu": string,"nguoi_duyet_id"?: string | null,"nguoi_thuc_hien_id"?: string | null,"phieu_goc_id"?: string | null,"so_luong_co_dau": number,"su_co_id"?: string | null,"trang_thai"?: string,"tu_duyet_ngoai_le"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"dm_hoa_chat_id"?: string,"duyet_at"?: string | null,"ghi_chu"?: string | null,"han_su_dung"?: string | null,"id"?: string,"is_active"?: boolean,"loai_giao_dich"?: string,"ly_do_dao"?: string | null,"ly_do_tu_choi"?: string | null,"ly_do_xuat"?: string | null,"ma_lo"?: string | null,"ma_phieu"?: string,"nguoi_duyet_id"?: string | null,"nguoi_thuc_hien_id"?: string | null,"phieu_goc_id"?: string | null,"so_luong_co_dau"?: number,"su_co_id"?: string | null,"trang_thai"?: string,"tu_duyet_ngoai_le"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cssd_fact_kho_hc_su_co_id_fkey"
      columns: ["su_co_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_kho_hc_su_co_id_fkey"
      columns: ["su_co_id"]
isOneToOne: false
      referencedRelation: "v_cssd_su_co_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_kho_hoa_chat_giao_dich_phieu_goc_id_fkey"
      columns: ["phieu_goc_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_kho_hoa_chat_giao_dich"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_kho_hoa_chat_giao_dich_dm_hoa_chat_id_fkey"
      columns: ["dm_hoa_chat_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_hoa_chat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_kho_hoa_chat_giao_dich_dm_hoa_chat_id_fkey"
      columns: ["dm_hoa_chat_id"]
isOneToOne: false
      referencedRelation: "v_cssd_hoa_chat_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_cssd_kho_hoa_chat_gd_nguoi_thuc_hien"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_cssd_kho_hoa_chat_gd_nguoi_thuc_hien"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_cssd_kho_hoa_chat_gd_nguoi_thuc_hien"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_cssd_kho_hoa_chat_gd_nguoi_thuc_hien"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_cssd_kho_hoa_chat_gd_nguoi_thuc_hien"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_cssd_kho_hoa_chat_gd_nguoi_thuc_hien"
      columns: ["nguoi_thuc_hien_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"cssd_fact_lo_tiet_khuan": {
                  Row: {
                    "ap_suat": number | null,"chuong_trinh": string | null,"chuong_trinh_id": string | null,"co_implant": boolean,"created_at": string | null,"ghi_chu": string | null,"ghi_chu_qc": string | null,"id": string,"is_active": boolean | null,"ket_qua_bi": boolean | null,"ket_qua_ci": boolean | null,"ket_qua_test": boolean | null,"loai_may_id": string | null,"ma_lo_tiet_khuan": string,"nguoi_bat_dau_id": string | null,"nguoi_ket_thuc_id": string | null,"nguoi_nap_id": string | null,"nguoi_nha_id": string | null,"nguoi_van_hanh_id": string | null,"nhiet_do": number | null,"phuong_phap": string | null,"thiet_bi_id": string | null,"thoi_gian_bat_dau": string | null,"thoi_gian_chu_ky": number | null,"thoi_gian_ket_thuc": string | null,"thoi_gian_nha": string | null,"tk_chot_nap_at": string | null,"tk_mo_form_qc_at": string | null,"tk_qc_json": NonNullable<Json>,"trang_thai_bi": string | null,"trang_thai_me": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ap_suat"?: number | null,"chuong_trinh"?: string | null,"chuong_trinh_id"?: string | null,"co_implant"?: boolean,"created_at"?: string | null,"ghi_chu"?: string | null,"ghi_chu_qc"?: string | null,"id"?: string,"is_active"?: boolean | null,"ket_qua_bi"?: boolean | null,"ket_qua_ci"?: boolean | null,"ket_qua_test"?: boolean | null,"loai_may_id"?: string | null,"ma_lo_tiet_khuan": string,"nguoi_bat_dau_id"?: string | null,"nguoi_ket_thuc_id"?: string | null,"nguoi_nap_id"?: string | null,"nguoi_nha_id"?: string | null,"nguoi_van_hanh_id"?: string | null,"nhiet_do"?: number | null,"phuong_phap"?: string | null,"thiet_bi_id"?: string | null,"thoi_gian_bat_dau"?: string | null,"thoi_gian_chu_ky"?: number | null,"thoi_gian_ket_thuc"?: string | null,"thoi_gian_nha"?: string | null,"tk_chot_nap_at"?: string | null,"tk_mo_form_qc_at"?: string | null,"tk_qc_json"?: NonNullable<Json>,"trang_thai_bi"?: string | null,"trang_thai_me"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "ap_suat"?: number | null,"chuong_trinh"?: string | null,"chuong_trinh_id"?: string | null,"co_implant"?: boolean,"created_at"?: string | null,"ghi_chu"?: string | null,"ghi_chu_qc"?: string | null,"id"?: string,"is_active"?: boolean | null,"ket_qua_bi"?: boolean | null,"ket_qua_ci"?: boolean | null,"ket_qua_test"?: boolean | null,"loai_may_id"?: string | null,"ma_lo_tiet_khuan"?: string,"nguoi_bat_dau_id"?: string | null,"nguoi_ket_thuc_id"?: string | null,"nguoi_nap_id"?: string | null,"nguoi_nha_id"?: string | null,"nguoi_van_hanh_id"?: string | null,"nhiet_do"?: number | null,"phuong_phap"?: string | null,"thiet_bi_id"?: string | null,"thoi_gian_bat_dau"?: string | null,"thoi_gian_chu_ky"?: number | null,"thoi_gian_ket_thuc"?: string | null,"thoi_gian_nha"?: string | null,"tk_chot_nap_at"?: string | null,"tk_mo_form_qc_at"?: string | null,"tk_qc_json"?: NonNullable<Json>,"trang_thai_bi"?: string | null,"trang_thai_me"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cssd_fact_lo_tiet_khuan_chuong_trinh_id_fkey"
      columns: ["chuong_trinh_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_chuong_trinh_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_lo_tiet_khuan_nguoi_nap_id_fkey"
      columns: ["nguoi_nap_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_lo_tiet_khuan_nguoi_nap_id_fkey"
      columns: ["nguoi_nap_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "cssd_fact_lo_tiet_khuan_nguoi_nap_id_fkey"
      columns: ["nguoi_nap_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_lo_tiet_khuan_nguoi_nap_id_fkey"
      columns: ["nguoi_nap_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_lo_tiet_khuan_nguoi_nap_id_fkey"
      columns: ["nguoi_nap_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_lo_tiet_khuan_nguoi_nap_id_fkey"
      columns: ["nguoi_nap_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_nguoi_van_hanh"
      columns: ["nguoi_van_hanh_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_nguoi_van_hanh"
      columns: ["nguoi_van_hanh_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_nguoi_van_hanh"
      columns: ["nguoi_van_hanh_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_nguoi_van_hanh"
      columns: ["nguoi_van_hanh_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_nguoi_van_hanh"
      columns: ["nguoi_van_hanh_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_lo_tiet_khuan_nguoi_van_hanh"
      columns: ["nguoi_van_hanh_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "lo_tiet_khuan_thiet_bi_id_fkey"
      columns: ["thiet_bi_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_thiet_bi"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lo_tiet_khuan_thiet_bi_id_fkey"
      columns: ["thiet_bi_id"]
isOneToOne: false
      referencedRelation: "v_cssd_thiet_bi_full"
      referencedColumns: ["id"]
    }
                  ]
                },"cssd_fact_quy_trinh": {
                  Row: {
                    "bo_dung_cu_id": string | null,"bom_kiem_dem_at": string | null,"bom_kiem_dem_boi_id": string | null,"created_at": string | null,"han_su_dung": string | null,"id": string,"is_active": boolean | null,"is_dong_bang": boolean,"is_red_alert": boolean,"khoa_nhan_id": string | null,"lo_tiet_khuan_id": string | null,"loai_bao_goi_id": string | null,"ma_cycle_qr": string | null,"ma_qr_bo_vinh_vien": string | null,"ma_qr_quy_trinh": string,"ma_vai_tro_bo": string,"metadata": Json | null,"ngay_het_han": string | null,"ngay_tiet_khuan": string | null,"nguoi_cap_phat_id": string | null,"nguoi_dang_giu_id": string | null,"nguoi_dong_goi_id": string | null,"nguoi_kiem_tra_id": string | null,"nguoi_lam_sach_id": string | null,"nguoi_tiep_nhan_id": string | null,"nguoi_tiet_khuan_id": string | null,"quy_trinh_cha_id": string | null,"suds_count": number | null,"thoi_gian_cap_phat": string | null,"thoi_gian_dong_goi": string | null,"thoi_gian_lam_sach": string | null,"thoi_gian_qc": string | null,"thoi_gian_tiep_nhan": string | null,"thoi_gian_tiet_khuan": string | null,"tinh_trang": string | null,"tram_hien_tai_id": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bo_dung_cu_id"?: string | null,"bom_kiem_dem_at"?: string | null,"bom_kiem_dem_boi_id"?: string | null,"created_at"?: string | null,"han_su_dung"?: string | null,"id"?: string,"is_active"?: boolean | null,"is_dong_bang"?: boolean,"is_red_alert"?: boolean,"khoa_nhan_id"?: string | null,"lo_tiet_khuan_id"?: string | null,"loai_bao_goi_id"?: string | null,"ma_cycle_qr"?: string | null,"ma_qr_bo_vinh_vien"?: string | null,"ma_qr_quy_trinh": string,"ma_vai_tro_bo"?: string,"metadata"?: Json | null,"ngay_het_han"?: string | null,"ngay_tiet_khuan"?: string | null,"nguoi_cap_phat_id"?: string | null,"nguoi_dang_giu_id"?: string | null,"nguoi_dong_goi_id"?: string | null,"nguoi_kiem_tra_id"?: string | null,"nguoi_lam_sach_id"?: string | null,"nguoi_tiep_nhan_id"?: string | null,"nguoi_tiet_khuan_id"?: string | null,"quy_trinh_cha_id"?: string | null,"suds_count"?: number | null,"thoi_gian_cap_phat"?: string | null,"thoi_gian_dong_goi"?: string | null,"thoi_gian_lam_sach"?: string | null,"thoi_gian_qc"?: string | null,"thoi_gian_tiep_nhan"?: string | null,"thoi_gian_tiet_khuan"?: string | null,"tinh_trang"?: string | null,"tram_hien_tai_id"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "bo_dung_cu_id"?: string | null,"bom_kiem_dem_at"?: string | null,"bom_kiem_dem_boi_id"?: string | null,"created_at"?: string | null,"han_su_dung"?: string | null,"id"?: string,"is_active"?: boolean | null,"is_dong_bang"?: boolean,"is_red_alert"?: boolean,"khoa_nhan_id"?: string | null,"lo_tiet_khuan_id"?: string | null,"loai_bao_goi_id"?: string | null,"ma_cycle_qr"?: string | null,"ma_qr_bo_vinh_vien"?: string | null,"ma_qr_quy_trinh"?: string,"ma_vai_tro_bo"?: string,"metadata"?: Json | null,"ngay_het_han"?: string | null,"ngay_tiet_khuan"?: string | null,"nguoi_cap_phat_id"?: string | null,"nguoi_dang_giu_id"?: string | null,"nguoi_dong_goi_id"?: string | null,"nguoi_kiem_tra_id"?: string | null,"nguoi_lam_sach_id"?: string | null,"nguoi_tiep_nhan_id"?: string | null,"nguoi_tiet_khuan_id"?: string | null,"quy_trinh_cha_id"?: string | null,"suds_count"?: number | null,"thoi_gian_cap_phat"?: string | null,"thoi_gian_dong_goi"?: string | null,"thoi_gian_lam_sach"?: string | null,"thoi_gian_qc"?: string | null,"thoi_gian_tiep_nhan"?: string | null,"thoi_gian_tiet_khuan"?: string | null,"tinh_trang"?: string | null,"tram_hien_tai_id"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cssd_fact_quy_trinh_bom_kiem_dem_boi_id_fkey"
      columns: ["bom_kiem_dem_boi_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_quy_trinh_bom_kiem_dem_boi_id_fkey"
      columns: ["bom_kiem_dem_boi_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "cssd_fact_quy_trinh_bom_kiem_dem_boi_id_fkey"
      columns: ["bom_kiem_dem_boi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_quy_trinh_bom_kiem_dem_boi_id_fkey"
      columns: ["bom_kiem_dem_boi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_quy_trinh_bom_kiem_dem_boi_id_fkey"
      columns: ["bom_kiem_dem_boi_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_quy_trinh_bom_kiem_dem_boi_id_fkey"
      columns: ["bom_kiem_dem_boi_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "cssd_fact_quy_trinh_khoa_nhan_id_fkey"
      columns: ["khoa_nhan_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_quy_trinh_loai_bao_goi_id_fkey"
      columns: ["loai_bao_goi_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_bao_goi"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_quy_trinh_quy_trinh_cha_id_fkey"
      columns: ["quy_trinh_cha_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_quy_trinh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_quy_trinh_quy_trinh_cha_id_fkey"
      columns: ["quy_trinh_cha_id"]
isOneToOne: false
      referencedRelation: "v_cssd_quy_trinh_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_cap_phat"
      columns: ["nguoi_cap_phat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_cap_phat"
      columns: ["nguoi_cap_phat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_cap_phat"
      columns: ["nguoi_cap_phat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_cap_phat"
      columns: ["nguoi_cap_phat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_cap_phat"
      columns: ["nguoi_cap_phat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_cap_phat"
      columns: ["nguoi_cap_phat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dang_giu"
      columns: ["nguoi_dang_giu_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dang_giu"
      columns: ["nguoi_dang_giu_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dang_giu"
      columns: ["nguoi_dang_giu_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dang_giu"
      columns: ["nguoi_dang_giu_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dang_giu"
      columns: ["nguoi_dang_giu_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dang_giu"
      columns: ["nguoi_dang_giu_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dong_goi"
      columns: ["nguoi_dong_goi_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dong_goi"
      columns: ["nguoi_dong_goi_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dong_goi"
      columns: ["nguoi_dong_goi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dong_goi"
      columns: ["nguoi_dong_goi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dong_goi"
      columns: ["nguoi_dong_goi_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dong_goi"
      columns: ["nguoi_dong_goi_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_kiem_tra"
      columns: ["nguoi_kiem_tra_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_kiem_tra"
      columns: ["nguoi_kiem_tra_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_kiem_tra"
      columns: ["nguoi_kiem_tra_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_kiem_tra"
      columns: ["nguoi_kiem_tra_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_kiem_tra"
      columns: ["nguoi_kiem_tra_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_kiem_tra"
      columns: ["nguoi_kiem_tra_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_lam_sach"
      columns: ["nguoi_lam_sach_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_lam_sach"
      columns: ["nguoi_lam_sach_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_lam_sach"
      columns: ["nguoi_lam_sach_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_lam_sach"
      columns: ["nguoi_lam_sach_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_lam_sach"
      columns: ["nguoi_lam_sach_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_lam_sach"
      columns: ["nguoi_lam_sach_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiep_nhan"
      columns: ["nguoi_tiep_nhan_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiep_nhan"
      columns: ["nguoi_tiep_nhan_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiep_nhan"
      columns: ["nguoi_tiep_nhan_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiep_nhan"
      columns: ["nguoi_tiep_nhan_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiep_nhan"
      columns: ["nguoi_tiep_nhan_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiep_nhan"
      columns: ["nguoi_tiep_nhan_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiet_khuan"
      columns: ["nguoi_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiet_khuan"
      columns: ["nguoi_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiet_khuan"
      columns: ["nguoi_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiet_khuan"
      columns: ["nguoi_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiet_khuan"
      columns: ["nguoi_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiet_khuan"
      columns: ["nguoi_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quy_trinh_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_bo_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quy_trinh_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_dung_cu_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quy_trinh_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_heat_split_hint"
      referencedColumns: ["bo_id"]
    },{
      foreignKeyName: "quy_trinh_lo_tiet_khuan_id_fkey"
      columns: ["lo_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_lo_tiet_khuan"
      referencedColumns: ["id"]
    }
                  ]
                },"cssd_fact_su_co": {
                  Row: {
                    "attributes": NonNullable<Json>,"created_at": string | null,"id": string,"incident_group": string | null,"incident_type_label": string | null,"is_active": boolean,"is_red_alert": boolean | null,"loai_su_co_id": string | null,"ma_qr_quy_trinh": string | null,"ma_tram_gay_loi": string | null,"ma_tram_phat_hien": string,"mo_ta": string | null,"nguoi_bao_id": string | null,"nguoi_xac_nhan_id": string | null,"quy_trinh_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attributes"?: NonNullable<Json>,"created_at"?: string | null,"id"?: string,"incident_group"?: never,"incident_type_label"?: never,"is_active"?: boolean,"is_red_alert"?: boolean | null,"loai_su_co_id"?: string | null,"ma_qr_quy_trinh"?: string | null,"ma_tram_gay_loi"?: string | null,"ma_tram_phat_hien": string,"mo_ta"?: string | null,"nguoi_bao_id"?: string | null,"nguoi_xac_nhan_id"?: string | null,"quy_trinh_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "attributes"?: NonNullable<Json>,"created_at"?: string | null,"id"?: string,"incident_group"?: never,"incident_type_label"?: never,"is_active"?: boolean,"is_red_alert"?: boolean | null,"loai_su_co_id"?: string | null,"ma_qr_quy_trinh"?: string | null,"ma_tram_gay_loi"?: string | null,"ma_tram_phat_hien"?: string,"mo_ta"?: string | null,"nguoi_bao_id"?: string | null,"nguoi_xac_nhan_id"?: string | null,"quy_trinh_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "su_co_nguoi_bao_id_fkey"
      columns: ["nguoi_bao_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "su_co_nguoi_bao_id_fkey"
      columns: ["nguoi_bao_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "su_co_nguoi_bao_id_fkey"
      columns: ["nguoi_bao_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "su_co_nguoi_bao_id_fkey"
      columns: ["nguoi_bao_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "su_co_nguoi_bao_id_fkey"
      columns: ["nguoi_bao_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "su_co_nguoi_bao_id_fkey"
      columns: ["nguoi_bao_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "su_co_nguoi_xac_nhan_id_fkey"
      columns: ["nguoi_xac_nhan_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "su_co_nguoi_xac_nhan_id_fkey"
      columns: ["nguoi_xac_nhan_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "su_co_nguoi_xac_nhan_id_fkey"
      columns: ["nguoi_xac_nhan_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "su_co_nguoi_xac_nhan_id_fkey"
      columns: ["nguoi_xac_nhan_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "su_co_nguoi_xac_nhan_id_fkey"
      columns: ["nguoi_xac_nhan_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "su_co_nguoi_xac_nhan_id_fkey"
      columns: ["nguoi_xac_nhan_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "su_co_quy_trinh_id_fkey"
      columns: ["quy_trinh_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_quy_trinh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "su_co_quy_trinh_id_fkey"
      columns: ["quy_trinh_id"]
isOneToOne: false
      referencedRelation: "v_cssd_quy_trinh_full"
      referencedColumns: ["id"]
    }
                  ]
                },"ctyt_dovai_dm_ngay_giuong": {
                  Row: {
                    "created_at": string,"ghi_chu": string | null,"id": string,"nam": number,"nguoi_cap_nhat_id": string | null,"so_ngay_giuong": number,"thang": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ghi_chu"?: string | null,"id"?: string,"nam": number,"nguoi_cap_nhat_id"?: string | null,"so_ngay_giuong": number,"thang": number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ghi_chu"?: string | null,"id"?: string,"nam"?: number,"nguoi_cap_nhat_id"?: string | null,"so_ngay_giuong"?: number,"thang"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ctyt_dovai_dm_ngay_giuong_nguoi_cap_nhat_id_fkey"
      columns: ["nguoi_cap_nhat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ctyt_dovai_dm_ngay_giuong_nguoi_cap_nhat_id_fkey"
      columns: ["nguoi_cap_nhat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "ctyt_dovai_dm_ngay_giuong_nguoi_cap_nhat_id_fkey"
      columns: ["nguoi_cap_nhat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ctyt_dovai_dm_ngay_giuong_nguoi_cap_nhat_id_fkey"
      columns: ["nguoi_cap_nhat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ctyt_dovai_dm_ngay_giuong_nguoi_cap_nhat_id_fkey"
      columns: ["nguoi_cap_nhat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ctyt_dovai_dm_ngay_giuong_nguoi_cap_nhat_id_fkey"
      columns: ["nguoi_cap_nhat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"ctyt_dovai_fact_so_can": {
                  Row: {
                    "created_at": string,"ghi_chu": string | null,"id": string,"is_active": boolean,"khoi_luong_kg": number,"loai_muc": string,"ngay_can": string,"nguoi_ghi_id": string | null,"so_tui": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ghi_chu"?: string | null,"id"?: string,"is_active"?: boolean,"khoi_luong_kg": number,"loai_muc": string,"ngay_can"?: string,"nguoi_ghi_id"?: string | null,"so_tui"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ghi_chu"?: string | null,"id"?: string,"is_active"?: boolean,"khoi_luong_kg"?: number,"loai_muc"?: string,"ngay_can"?: string,"nguoi_ghi_id"?: string | null,"so_tui"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ctyt_dovai_fact_so_can_nguoi_ghi_id_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ctyt_dovai_fact_so_can_nguoi_ghi_id_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "ctyt_dovai_fact_so_can_nguoi_ghi_id_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ctyt_dovai_fact_so_can_nguoi_ghi_id_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ctyt_dovai_fact_so_can_nguoi_ghi_id_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ctyt_dovai_fact_so_can_nguoi_ghi_id_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"ctyt_dovai_fact_su_co": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"khoa_lien_quan_id": string | null,"loai_su_co": string,"mo_ta": string | null,"ngay_ghi_nhan": string,"nguoi_ghi_id": string | null,"phan_he": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"khoa_lien_quan_id"?: string | null,"loai_su_co": string,"mo_ta"?: string | null,"ngay_ghi_nhan"?: string,"nguoi_ghi_id"?: string | null,"phan_he": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"khoa_lien_quan_id"?: string | null,"loai_su_co"?: string,"mo_ta"?: string | null,"ngay_ghi_nhan"?: string,"nguoi_ghi_id"?: string | null,"phan_he"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ctyt_dovai_fact_su_co_khoa_lien_quan_id_fkey"
      columns: ["khoa_lien_quan_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ctyt_dovai_fact_su_co_nguoi_ghi_id_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ctyt_dovai_fact_su_co_nguoi_ghi_id_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "ctyt_dovai_fact_su_co_nguoi_ghi_id_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ctyt_dovai_fact_su_co_nguoi_ghi_id_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ctyt_dovai_fact_su_co_nguoi_ghi_id_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ctyt_dovai_fact_su_co_nguoi_ghi_id_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"dao_tao_cau_hinh": {
                  Row: {
                    "bloom_quota": NonNullable<Json>,"chu_de_mas": (string)[],"created_at": string,"created_by": string | null,"diem_dat_pct": number | null,"gan": NonNullable<Json>,"id": string,"is_active": boolean,"loai_cau_hinh": string,"loai_quota": NonNullable<Json>,"ma": string | null,"mo_ta": string | null,"shuffle_cau": boolean,"shuffle_dap_an": boolean,"so_cau": number,"so_lan_cho_phep": number,"ten": string,"thoi_gian_phut": number,"thu_tu": number,"trang_thai": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bloom_quota"?: NonNullable<Json>,"chu_de_mas"?: (string)[],"created_at"?: string,"created_by"?: string | null,"diem_dat_pct"?: number | null,"gan"?: NonNullable<Json>,"id"?: string,"is_active"?: boolean,"loai_cau_hinh": string,"loai_quota"?: NonNullable<Json>,"ma"?: string | null,"mo_ta"?: string | null,"shuffle_cau"?: boolean,"shuffle_dap_an"?: boolean,"so_cau": number,"so_lan_cho_phep"?: number,"ten": string,"thoi_gian_phut": number,"thu_tu"?: number,"trang_thai"?: string,"updated_at"?: string
                  }
                  Update: {
                    "bloom_quota"?: NonNullable<Json>,"chu_de_mas"?: (string)[],"created_at"?: string,"created_by"?: string | null,"diem_dat_pct"?: number | null,"gan"?: NonNullable<Json>,"id"?: string,"is_active"?: boolean,"loai_cau_hinh"?: string,"loai_quota"?: NonNullable<Json>,"ma"?: string | null,"mo_ta"?: string | null,"shuffle_cau"?: boolean,"shuffle_dap_an"?: boolean,"so_cau"?: number,"so_lan_cho_phep"?: number,"ten"?: string,"thoi_gian_phut"?: number,"thu_tu"?: number,"trang_thai"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"dao_tao_cau_hoi": {
                  Row: {
                    "bloom_level": number,"chu_de_ma": string,"chu_de_ten": string,"created_at": string,"dap_an_dung": NonNullable<Json>,"giai_thich": string | null,"id": string,"import_stt": number | null,"is_active": boolean,"loai": string,"ma_cau": string,"phuong_an": NonNullable<Json>,"stem": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bloom_level": number,"chu_de_ma": string,"chu_de_ten": string,"created_at"?: string,"dap_an_dung"?: NonNullable<Json>,"giai_thich"?: string | null,"id"?: string,"import_stt"?: number | null,"is_active"?: boolean,"loai": string,"ma_cau": string,"phuong_an"?: NonNullable<Json>,"stem": string,"updated_at"?: string
                  }
                  Update: {
                    "bloom_level"?: number,"chu_de_ma"?: string,"chu_de_ten"?: string,"created_at"?: string,"dap_an_dung"?: NonNullable<Json>,"giai_thich"?: string | null,"id"?: string,"import_stt"?: number | null,"is_active"?: boolean,"loai"?: string,"ma_cau"?: string,"phuong_an"?: NonNullable<Json>,"stem"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"dao_tao_lan_thi": {
                  Row: {
                    "auth_user_id": string,"bat_dau_luc": string,"cau_hinh_id": string | null,"che_do": string,"created_at": string,"dat": boolean | null,"de_snapshot": NonNullable<Json>,"diem_pct": number | null,"diem_so": number | null,"diem_toi_da": number | null,"form_thong_tin": NonNullable<Json>,"han_nop_luc": string,"huy_boi": string | null,"huy_luc": string | null,"id": string,"ly_do_huy": string | null,"nop_luc": string | null,"quota_report": NonNullable<Json>,"seed": string,"so_cau": number,"thoi_gian_phut": number,"trang_thai": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_user_id": string,"bat_dau_luc"?: string,"cau_hinh_id"?: string | null,"che_do": string,"created_at"?: string,"dat"?: boolean | null,"de_snapshot"?: NonNullable<Json>,"diem_pct"?: number | null,"diem_so"?: number | null,"diem_toi_da"?: number | null,"form_thong_tin"?: NonNullable<Json>,"han_nop_luc": string,"huy_boi"?: string | null,"huy_luc"?: string | null,"id"?: string,"ly_do_huy"?: string | null,"nop_luc"?: string | null,"quota_report"?: NonNullable<Json>,"seed": string,"so_cau": number,"thoi_gian_phut": number,"trang_thai"?: string,"updated_at"?: string
                  }
                  Update: {
                    "auth_user_id"?: string,"bat_dau_luc"?: string,"cau_hinh_id"?: string | null,"che_do"?: string,"created_at"?: string,"dat"?: boolean | null,"de_snapshot"?: NonNullable<Json>,"diem_pct"?: number | null,"diem_so"?: number | null,"diem_toi_da"?: number | null,"form_thong_tin"?: NonNullable<Json>,"han_nop_luc"?: string,"huy_boi"?: string | null,"huy_luc"?: string | null,"id"?: string,"ly_do_huy"?: string | null,"nop_luc"?: string | null,"quota_report"?: NonNullable<Json>,"seed"?: string,"so_cau"?: number,"thoi_gian_phut"?: number,"trang_thai"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dao_tao_lan_thi_cau_hinh_id_fkey"
      columns: ["cau_hinh_id"]
isOneToOne: false
      referencedRelation: "dao_tao_cau_hinh"
      referencedColumns: ["id"]
    }
                  ]
                },"gstt_dm_bang_kiem": {
                  Row: {
                    "ap_dung_jsonb": NonNullable<Json>,"cach_tinh_diem": string | null,"created_at": string | null,"doi_tuong_giam_sat": string | null,"id": string,"is_active": boolean | null,"is_system": boolean | null,"loai_giam_sat": string | null,"loai_hinh_giam_sat": string | null,"ma_bk": string,"mo_ta": string | null,"phan_loai_chuyen_mon": string | null,"phien_ban": string | null,"ten_bang_kiem": string,"tieu_chi_jsonb": NonNullable<Json>,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ap_dung_jsonb"?: NonNullable<Json>,"cach_tinh_diem"?: string | null,"created_at"?: string | null,"doi_tuong_giam_sat"?: string | null,"id"?: string,"is_active"?: boolean | null,"is_system"?: boolean | null,"loai_giam_sat"?: string | null,"loai_hinh_giam_sat"?: string | null,"ma_bk": string,"mo_ta"?: string | null,"phan_loai_chuyen_mon"?: string | null,"phien_ban"?: string | null,"ten_bang_kiem": string,"tieu_chi_jsonb"?: NonNullable<Json>,"updated_at"?: string | null
                  }
                  Update: {
                    "ap_dung_jsonb"?: NonNullable<Json>,"cach_tinh_diem"?: string | null,"created_at"?: string | null,"doi_tuong_giam_sat"?: string | null,"id"?: string,"is_active"?: boolean | null,"is_system"?: boolean | null,"loai_giam_sat"?: string | null,"loai_hinh_giam_sat"?: string | null,"ma_bk"?: string,"mo_ta"?: string | null,"phan_loai_chuyen_mon"?: string | null,"phien_ban"?: string | null,"ten_bang_kiem"?: string,"tieu_chi_jsonb"?: NonNullable<Json>,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"gstt_fact_chung_sessions": {
                  Row: {
                    "bang_kiem_id": string | null,"cach_thuc_id": string | null,"client_request_id": string | null,"created_at": string,"dat_tron_goi": boolean | null,"du_lieu_nghi_van": boolean,"ghi_chu_chung": string | null,"hinh_thuc_id": string | null,"id": string,"is_active": boolean,"is_giam_sat_ca_nhan": boolean,"is_seen": boolean,"khoa_id": string | null,"khu_vuc_id": string | null,"loai_giam_sat": string | null,"metadata": Json | null,"ngay_giam_sat": string | null,"nghe_nghiep_id": string | null,"nguoi_giam_sat_id": string | null,"nhan_vien_id": string | null,"results_jsonb": NonNullable<Json>,"thoi_gian_bat_dau": string | null,"thoi_gian_ghi_nhan": string | null,"thoi_gian_ket_thuc": string | null,"tong_diem": number | null,"updated_at": string,"vi_tri": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bang_kiem_id"?: string | null,"cach_thuc_id"?: string | null,"client_request_id"?: string | null,"created_at"?: string,"dat_tron_goi"?: boolean | null,"du_lieu_nghi_van"?: boolean,"ghi_chu_chung"?: string | null,"hinh_thuc_id"?: string | null,"id"?: string,"is_active"?: boolean,"is_giam_sat_ca_nhan"?: boolean,"is_seen"?: boolean,"khoa_id"?: string | null,"khu_vuc_id"?: string | null,"loai_giam_sat"?: string | null,"metadata"?: Json | null,"ngay_giam_sat"?: string | null,"nghe_nghiep_id"?: string | null,"nguoi_giam_sat_id"?: string | null,"nhan_vien_id"?: string | null,"results_jsonb"?: NonNullable<Json>,"thoi_gian_bat_dau"?: string | null,"thoi_gian_ghi_nhan"?: string | null,"thoi_gian_ket_thuc"?: string | null,"tong_diem"?: number | null,"updated_at"?: string,"vi_tri"?: string | null
                  }
                  Update: {
                    "bang_kiem_id"?: string | null,"cach_thuc_id"?: string | null,"client_request_id"?: string | null,"created_at"?: string,"dat_tron_goi"?: boolean | null,"du_lieu_nghi_van"?: boolean,"ghi_chu_chung"?: string | null,"hinh_thuc_id"?: string | null,"id"?: string,"is_active"?: boolean,"is_giam_sat_ca_nhan"?: boolean,"is_seen"?: boolean,"khoa_id"?: string | null,"khu_vuc_id"?: string | null,"loai_giam_sat"?: string | null,"metadata"?: Json | null,"ngay_giam_sat"?: string | null,"nghe_nghiep_id"?: string | null,"nguoi_giam_sat_id"?: string | null,"nhan_vien_id"?: string | null,"results_jsonb"?: NonNullable<Json>,"thoi_gian_bat_dau"?: string | null,"thoi_gian_ghi_nhan"?: string | null,"thoi_gian_ket_thuc"?: string | null,"tong_diem"?: number | null,"updated_at"?: string,"vi_tri"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_bang_kiem"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_tieu_chi_bang_kiem"
      referencedColumns: ["bang_kiem_id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "v_gstt_bang_kiem_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "v_gstt_dashboard_bundle_rate_v3"
      referencedColumns: ["bang_kiem_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"gstt_fact_ke_hoach_giam_sat": {
                  Row: {
                    "created_at": string,"ghi_chu": string | null,"id": string,"is_active": boolean,"khoa_id": string,"loai": string,"nguoi_lap_id": string | null,"thang": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ghi_chu"?: string | null,"id"?: string,"is_active"?: boolean,"khoa_id": string,"loai": string,"nguoi_lap_id"?: string | null,"thang": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ghi_chu"?: string | null,"id"?: string,"is_active"?: boolean,"khoa_id"?: string,"loai"?: string,"nguoi_lap_id"?: string | null,"thang"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gstt_fact_ke_hoach_giam_sat_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gstt_fact_ke_hoach_giam_sat_nguoi_lap_id_fkey"
      columns: ["nguoi_lap_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gstt_fact_ke_hoach_giam_sat_nguoi_lap_id_fkey"
      columns: ["nguoi_lap_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "gstt_fact_ke_hoach_giam_sat_nguoi_lap_id_fkey"
      columns: ["nguoi_lap_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gstt_fact_ke_hoach_giam_sat_nguoi_lap_id_fkey"
      columns: ["nguoi_lap_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gstt_fact_ke_hoach_giam_sat_nguoi_lap_id_fkey"
      columns: ["nguoi_lap_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gstt_fact_ke_hoach_giam_sat_nguoi_lap_id_fkey"
      columns: ["nguoi_lap_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"gstt_fact_vst": {
                  Row: {
                    "co_deo_gang": boolean | null,"created_at": string,"du_thoi_gian": boolean | null,"dung_ky_thuat": boolean | null,"ghi_chu": string | null,"hanh_dong": string | null,"id": string,"khoa_id": string | null,"khu_vuc_id": string | null,"metadata": Json | null,"ngay_giam_sat": string | null,"nghe_nghiep_id": string | null,"nhan_vien_id": string | null,"session_id": string,"thoi_diem": string | null,"thoi_gian_ghi_nhan": string | null,"vi_tri": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "co_deo_gang"?: boolean | null,"created_at"?: string,"du_thoi_gian"?: boolean | null,"dung_ky_thuat"?: boolean | null,"ghi_chu"?: string | null,"hanh_dong"?: string | null,"id"?: string,"khoa_id"?: string | null,"khu_vuc_id"?: string | null,"metadata"?: Json | null,"ngay_giam_sat"?: string | null,"nghe_nghiep_id"?: string | null,"nhan_vien_id"?: string | null,"session_id": string,"thoi_diem"?: string | null,"thoi_gian_ghi_nhan"?: string | null,"vi_tri"?: string | null
                  }
                  Update: {
                    "co_deo_gang"?: boolean | null,"created_at"?: string,"du_thoi_gian"?: boolean | null,"dung_ky_thuat"?: boolean | null,"ghi_chu"?: string | null,"hanh_dong"?: string | null,"id"?: string,"khoa_id"?: string | null,"khu_vuc_id"?: string | null,"metadata"?: Json | null,"ngay_giam_sat"?: string | null,"nghe_nghiep_id"?: string | null,"nhan_vien_id"?: string | null,"session_id"?: string,"thoi_diem"?: string | null,"thoi_gian_ghi_nhan"?: string | null,"vi_tri"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "v_gstt_giam_sat_vst_sessions_full"
      referencedColumns: ["id"]
    }
                  ]
                },"gstt_fact_vst_sessions": {
                  Row: {
                    "cach_thuc_id": string | null,"client_request_id": string | null,"created_at": string,"deleted_at": string | null,"deleted_by": string | null,"hinh_thuc_id": string | null,"id": string,"is_active": boolean,"is_seen": boolean,"khoa_id": string | null,"khu_vuc_id": string | null,"ly_do_xoa": string | null,"metadata": NonNullable<Json>,"ngay_giam_sat": string | null,"nguoi_giam_sat_id": string | null,"thoi_gian_bat_dau": string | null,"thoi_gian_ket_thuc": string | null,"updated_at": string,"vi_tri_cu_the": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cach_thuc_id"?: string | null,"client_request_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"hinh_thuc_id"?: string | null,"id"?: string,"is_active"?: boolean,"is_seen"?: boolean,"khoa_id"?: string | null,"khu_vuc_id"?: string | null,"ly_do_xoa"?: string | null,"metadata"?: NonNullable<Json>,"ngay_giam_sat"?: string | null,"nguoi_giam_sat_id"?: string | null,"thoi_gian_bat_dau"?: string | null,"thoi_gian_ket_thuc"?: string | null,"updated_at"?: string,"vi_tri_cu_the"?: string | null
                  }
                  Update: {
                    "cach_thuc_id"?: string | null,"client_request_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"hinh_thuc_id"?: string | null,"id"?: string,"is_active"?: boolean,"is_seen"?: boolean,"khoa_id"?: string | null,"khu_vuc_id"?: string | null,"ly_do_xoa"?: string | null,"metadata"?: NonNullable<Json>,"ngay_giam_sat"?: string | null,"nguoi_giam_sat_id"?: string | null,"thoi_gian_bat_dau"?: string | null,"thoi_gian_ket_thuc"?: string | null,"updated_at"?: string,"vi_tri_cu_the"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"gstt_fact_vst_yeu_cau_dieu_chinh": {
                  Row: {
                    "created_at": string,"id": string,"loai": string,"ly_do": string,"ly_do_tu_choi": string | null,"nguoi_duyet_auth_id": string | null,"nguoi_yeu_cau_auth_id": string,"nguoi_yeu_cau_nhan_su_id": string | null,"payload": Json | null,"session_id": string,"trang_thai": string,"xu_ly_luc": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"loai": string,"ly_do": string,"ly_do_tu_choi"?: string | null,"nguoi_duyet_auth_id"?: string | null,"nguoi_yeu_cau_auth_id": string,"nguoi_yeu_cau_nhan_su_id"?: string | null,"payload"?: Json | null,"session_id": string,"trang_thai"?: string,"xu_ly_luc"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"loai"?: string,"ly_do"?: string,"ly_do_tu_choi"?: string | null,"nguoi_duyet_auth_id"?: string | null,"nguoi_yeu_cau_auth_id"?: string,"nguoi_yeu_cau_nhan_su_id"?: string | null,"payload"?: Json | null,"session_id"?: string,"trang_thai"?: string,"xu_ly_luc"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gstt_fact_vst_yeu_cau_dieu_chinh_nguoi_yeu_cau_nhan_su_id_fkey"
      columns: ["nguoi_yeu_cau_nhan_su_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gstt_fact_vst_yeu_cau_dieu_chinh_nguoi_yeu_cau_nhan_su_id_fkey"
      columns: ["nguoi_yeu_cau_nhan_su_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "gstt_fact_vst_yeu_cau_dieu_chinh_nguoi_yeu_cau_nhan_su_id_fkey"
      columns: ["nguoi_yeu_cau_nhan_su_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gstt_fact_vst_yeu_cau_dieu_chinh_nguoi_yeu_cau_nhan_su_id_fkey"
      columns: ["nguoi_yeu_cau_nhan_su_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gstt_fact_vst_yeu_cau_dieu_chinh_nguoi_yeu_cau_nhan_su_id_fkey"
      columns: ["nguoi_yeu_cau_nhan_su_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gstt_fact_vst_yeu_cau_dieu_chinh_nguoi_yeu_cau_nhan_su_id_fkey"
      columns: ["nguoi_yeu_cau_nhan_su_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "gstt_fact_vst_yeu_cau_dieu_chinh_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "gstt_fact_vst_yeu_cau_dieu_chinh_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gstt_fact_vst_yeu_cau_dieu_chinh_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "gstt_fact_vst_yeu_cau_dieu_chinh_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "v_gstt_giam_sat_vst_sessions_full"
      referencedColumns: ["id"]
    }
                  ]
                },"gstt_map_bang_kiem_short_long": {
                  Row: {
                    "created_at": string,"ma_bk_long": string,"ma_bk_short": string,"note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ma_bk_long": string,"ma_bk_short": string,"note"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"ma_bk_long"?: string,"ma_bk_short"?: string,"note"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"gstt_map_tieu_chi_merge": {
                  Row: {
                    "created_at": string,"ma_bk_long": string,"ma_bk_short": string,"merge_group": string,"old_criterion_id": string,"old_ma_tc": string | null,"target_criterion_id": string | null,"target_ma_tc": string,"target_stt": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ma_bk_long": string,"ma_bk_short": string,"merge_group": string,"old_criterion_id": string,"old_ma_tc"?: string | null,"target_criterion_id"?: string | null,"target_ma_tc": string,"target_stt"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"ma_bk_long"?: string,"ma_bk_short"?: string,"merge_group"?: string,"old_criterion_id"?: string,"old_ma_tc"?: string | null,"target_criterion_id"?: string | null,"target_ma_tc"?: string,"target_stt"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"gstt_map_tieu_chi_orphan": {
                  Row: {
                    "created_at": string,"ma_bk_long": string | null,"ma_bk_short": string | null,"match_confidence": string,"new_criterion_id": string | null,"new_ma_tc": string | null,"new_stt": number | null,"old_criterion_id": string,"old_ma_tc": string | null,"old_noi_dung": string,"old_stt": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ma_bk_long"?: string | null,"ma_bk_short"?: string | null,"match_confidence"?: string,"new_criterion_id"?: string | null,"new_ma_tc"?: string | null,"new_stt"?: number | null,"old_criterion_id": string,"old_ma_tc"?: string | null,"old_noi_dung": string,"old_stt"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"ma_bk_long"?: string | null,"ma_bk_short"?: string | null,"match_confidence"?: string,"new_criterion_id"?: string | null,"new_ma_tc"?: string | null,"new_stt"?: number | null,"old_criterion_id"?: string,"old_ma_tc"?: string | null,"old_noi_dung"?: string,"old_stt"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"ksnk_dm_tham_so": {
                  Row: {
                    "created_at": string,"created_by": string | null,"gia_tri": number,"hieu_luc_tu": string,"id": string,"ma_tham_so": string,"nguon": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"gia_tri": number,"hieu_luc_tu": string,"id"?: string,"ma_tham_so": string,"nguon": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"gia_tri"?: number,"hieu_luc_tu"?: string,"id"?: string,"ma_tham_so"?: string,"nguon"?: string
                  }
                  Relationships: [
                    
                  ]
                },"mdm_dm_khoa_phong": {
                  Row: {
                    "created_at": string | null,"id": string,"is_active": boolean | null,"khoi_id": string | null,"ma_khoa": string,"specs": Json | null,"ten_khoa": string,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"is_active"?: boolean | null,"khoi_id"?: string | null,"ma_khoa": string,"specs"?: Json | null,"ten_khoa": string,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"is_active"?: boolean | null,"khoi_id"?: string | null,"ma_khoa"?: string,"specs"?: Json | null,"ten_khoa"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "dm_khoa_phong_khoi_id_fkey"
      columns: ["khoi_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_khoa_phong_khoi_id_fkey"
      columns: ["khoi_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_khoa_phong_khoi_id_fkey"
      columns: ["khoi_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_khoa_phong_khoi_id_fkey"
      columns: ["khoi_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_khoa_phong_khoi_id_fkey"
      columns: ["khoi_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_khoa_phong_khoi_id_fkey"
      columns: ["khoi_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_khoa_phong_khoi_id_fkey"
      columns: ["khoi_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_khoa_phong_khoi_id_fkey"
      columns: ["khoi_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_khoa_phong_khoi_id_fkey"
      columns: ["khoi_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_khoa_phong_khoi_id_fkey"
      columns: ["khoi_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_khoa_phong_khoi_id_fkey"
      columns: ["khoi_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_khoa_phong_khoi_id_fkey"
      columns: ["khoi_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_khoa_phong_khoi_id_fkey"
      columns: ["khoi_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_khoa_phong_khoi_id_fkey"
      columns: ["khoi_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    }
                  ]
                },"mdm_nhan_su": {
                  Row: {
                    "auth_user_id": string | null,"chuc_danh_id": string | null,"chuc_vu_id": string | null,"created_at": string,"extra_data": Json | null,"ho_ten": string | null,"id": string,"is_active": boolean,"khoa_id": string | null,"ma_nv": string | null,"nghe_nghiep_id": string | null,"to_id": string | null,"updated_at": string,"vai_tro_he_thong_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_user_id"?: string | null,"chuc_danh_id"?: string | null,"chuc_vu_id"?: string | null,"created_at"?: string,"extra_data"?: Json | null,"ho_ten"?: string | null,"id"?: string,"is_active"?: boolean,"khoa_id"?: string | null,"ma_nv"?: string | null,"nghe_nghiep_id"?: string | null,"to_id"?: string | null,"updated_at"?: string,"vai_tro_he_thong_id"?: string | null
                  }
                  Update: {
                    "auth_user_id"?: string | null,"chuc_danh_id"?: string | null,"chuc_vu_id"?: string | null,"created_at"?: string,"extra_data"?: Json | null,"ho_ten"?: string | null,"id"?: string,"is_active"?: boolean,"khoa_id"?: string | null,"ma_nv"?: string | null,"nghe_nghiep_id"?: string | null,"to_id"?: string | null,"updated_at"?: string,"vai_tro_he_thong_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_vai_tro_he_thong_id_fkey"
      columns: ["vai_tro_he_thong_id"]
isOneToOne: false
      referencedRelation: "sys_roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_vai_tro_he_thong_id_fkey"
      columns: ["vai_tro_he_thong_id"]
isOneToOne: false
      referencedRelation: "v_sys_role_permissions_matrix"
      referencedColumns: ["role_id"]
    }
                  ]
                },"nkbv_dm_cdc_baseline": {
                  Row: {
                    "created_at": string,"expected_dur": number,"expected_infection_rate_per_1000": number,"id": string,"is_active": boolean,"khoa_id": string | null,"loai_thiet_bi": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expected_dur": number,"expected_infection_rate_per_1000": number,"id"?: string,"is_active"?: boolean,"khoa_id"?: string | null,"loai_thiet_bi": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"expected_dur"?: number,"expected_infection_rate_per_1000"?: number,"id"?: string,"is_active"?: boolean,"khoa_id"?: string | null,"loai_thiet_bi"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"nkbv_fact_ba_ngay_dung_cu": {
                  Row: {
                    "created_at": string,"id": string,"loai_dung_cu": string,"ma_benh_an": string,"ngay_lich": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"loai_dung_cu": string,"ma_benh_an": string,"ngay_lich": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"loai_dung_cu"?: string,"ma_benh_an"?: string,"ngay_lich"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "nkbv_fact_ba_ngay_dung_cu_ma_benh_an_fkey"
      columns: ["ma_benh_an"]
isOneToOne: false
      referencedRelation: "nkbv_fact_benh_an"
      referencedColumns: ["ma_benh_an"]
    }
                  ]
                },"nkbv_fact_ba_ngay_khoa": {
                  Row: {
                    "created_at": string,"id": string,"khoa_id": string,"ma_benh_an": string,"ngay_lich": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"khoa_id": string,"ma_benh_an": string,"ngay_lich": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"khoa_id"?: string,"ma_benh_an"?: string,"ngay_lich"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "nkbv_fact_ba_ngay_khoa_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nkbv_fact_ba_ngay_khoa_ma_benh_an_fkey"
      columns: ["ma_benh_an"]
isOneToOne: false
      referencedRelation: "nkbv_fact_benh_an"
      referencedColumns: ["ma_benh_an"]
    }
                  ]
                },"nkbv_fact_ba_phan_tich": {
                  Row: {
                    "analysis_mode": string,"created_at": string,"draft": NonNullable<Json>,"id": string,"index_label": string,"index_payload": NonNullable<Json>,"is_active": boolean,"ma_benh_an": string,"panel": string,"session_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_mode"?: string,"created_at"?: string,"draft"?: NonNullable<Json>,"id"?: string,"index_label"?: string,"index_payload"?: NonNullable<Json>,"is_active"?: boolean,"ma_benh_an": string,"panel": string,"session_id": string,"updated_at"?: string
                  }
                  Update: {
                    "analysis_mode"?: string,"created_at"?: string,"draft"?: NonNullable<Json>,"id"?: string,"index_label"?: string,"index_payload"?: NonNullable<Json>,"is_active"?: boolean,"ma_benh_an"?: string,"panel"?: string,"session_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "nkbv_fact_ba_phan_tich_ma_benh_an_fkey"
      columns: ["ma_benh_an"]
isOneToOne: false
      referencedRelation: "nkbv_fact_benh_an"
      referencedColumns: ["ma_benh_an"]
    }
                  ]
                },"nkbv_fact_ba_timeline": {
                  Row: {
                    "created_at": string,"criteria_key": string | null,"detail": string | null,"id": string,"is_active": boolean,"ma_benh_an": string,"metadata": NonNullable<Json>,"milestone_date": string,"milestone_kind": string,"specimen_hint": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"criteria_key"?: string | null,"detail"?: string | null,"id"?: string,"is_active"?: boolean,"ma_benh_an": string,"metadata"?: NonNullable<Json>,"milestone_date": string,"milestone_kind": string,"specimen_hint"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"criteria_key"?: string | null,"detail"?: string | null,"id"?: string,"is_active"?: boolean,"ma_benh_an"?: string,"metadata"?: NonNullable<Json>,"milestone_date"?: string,"milestone_kind"?: string,"specimen_hint"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "nkbv_fact_ba_timeline_ma_benh_an_fkey"
      columns: ["ma_benh_an"]
isOneToOne: false
      referencedRelation: "nkbv_fact_benh_an"
      referencedColumns: ["ma_benh_an"]
    }
                  ]
                },"nkbv_fact_benh_an": {
                  Row: {
                    "created_at": string,"gioi_tinh": string | null,"ho_ten_benh_nhan": string,"id": string,"is_active": boolean,"ket_cuc_dieu_tri": string | null,"khoa_dieu_tri_id": string | null,"ly_do_tu_vong": string | null,"ma_benh_an": string,"ma_benh_nhan": string,"ngay_ra_vien": string | null,"ngay_sinh": string | null,"ngay_vao_vien": string | null,"tu_vong_lien_quan_nkbv": boolean | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"gioi_tinh"?: string | null,"ho_ten_benh_nhan": string,"id"?: string,"is_active"?: boolean,"ket_cuc_dieu_tri"?: string | null,"khoa_dieu_tri_id"?: string | null,"ly_do_tu_vong"?: string | null,"ma_benh_an": string,"ma_benh_nhan": string,"ngay_ra_vien"?: string | null,"ngay_sinh"?: string | null,"ngay_vao_vien"?: string | null,"tu_vong_lien_quan_nkbv"?: boolean | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"gioi_tinh"?: string | null,"ho_ten_benh_nhan"?: string,"id"?: string,"is_active"?: boolean,"ket_cuc_dieu_tri"?: string | null,"khoa_dieu_tri_id"?: string | null,"ly_do_tu_vong"?: string | null,"ma_benh_an"?: string,"ma_benh_nhan"?: string,"ngay_ra_vien"?: string | null,"ngay_sinh"?: string | null,"ngay_vao_vien"?: string | null,"tu_vong_lien_quan_nkbv"?: boolean | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fact_nkbv_benh_an_khoa_dieu_tri_fkey"
      columns: ["khoa_dieu_tri_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    }
                  ]
                },"nkbv_fact_device_registry": {
                  Row: {
                    "created_at": string,"device_type": string,"first_access_date": string | null,"id": string,"insertion_date": string,"is_active": boolean,"khoa_id": string | null,"line_type": string | null,"ma_benh_an": string,"ma_benh_nhan": string | null,"metadata": NonNullable<Json>,"notes": string | null,"removal_date": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"device_type": string,"first_access_date"?: string | null,"id"?: string,"insertion_date": string,"is_active"?: boolean,"khoa_id"?: string | null,"line_type"?: string | null,"ma_benh_an": string,"ma_benh_nhan"?: string | null,"metadata"?: NonNullable<Json>,"notes"?: string | null,"removal_date"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"device_type"?: string,"first_access_date"?: string | null,"id"?: string,"insertion_date"?: string,"is_active"?: boolean,"khoa_id"?: string | null,"line_type"?: string | null,"ma_benh_an"?: string,"ma_benh_nhan"?: string | null,"metadata"?: NonNullable<Json>,"notes"?: string | null,"removal_date"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"nkbv_fact_labid_event": {
                  Row: {
                    "collection_date": string,"created_at": string,"event_type": string,"id": string,"is_active": boolean,"is_event": boolean,"ma_benh_an": string,"ma_benh_nhan": string | null,"metadata": NonNullable<Json>,"organism_category": string,"phenotype": string,"reason": string | null,"specimen_class": string,"updated_at": string,"vi_sinh_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "collection_date": string,"created_at"?: string,"event_type": string,"id"?: string,"is_active"?: boolean,"is_event"?: boolean,"ma_benh_an": string,"ma_benh_nhan"?: string | null,"metadata"?: NonNullable<Json>,"organism_category": string,"phenotype": string,"reason"?: string | null,"specimen_class": string,"updated_at"?: string,"vi_sinh_id"?: string | null
                  }
                  Update: {
                    "collection_date"?: string,"created_at"?: string,"event_type"?: string,"id"?: string,"is_active"?: boolean,"is_event"?: boolean,"ma_benh_an"?: string,"ma_benh_nhan"?: string | null,"metadata"?: NonNullable<Json>,"organism_category"?: string,"phenotype"?: string,"reason"?: string | null,"specimen_class"?: string,"updated_at"?: string,"vi_sinh_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "nkbv_fact_labid_event_vi_sinh_id_fkey"
      columns: ["vi_sinh_id"]
isOneToOne: false
      referencedRelation: "nkbv_fact_vi_sinh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nkbv_fact_labid_event_vi_sinh_id_fkey"
      columns: ["vi_sinh_id"]
isOneToOne: false
      referencedRelation: "v_nkbv_vi_sinh_chua_phan_tich"
      referencedColumns: ["id"]
    }
                  ]
                },"nkbv_fact_mau_so_daily": {
                  Row: {
                    "created_at": string,"id": string,"khoa_id": string,"metadata": NonNullable<Json>,"ngay_ghi_nhan": string,"nguoi_bao_cao_id": string | null,"so_dot_tho_may_emv": number,"so_ngay_catheter_cvc": number,"so_ngay_dieu_tri": number,"so_ngay_sonde_tieu": number,"so_ngay_tho_may": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"khoa_id": string,"metadata"?: NonNullable<Json>,"ngay_ghi_nhan": string,"nguoi_bao_cao_id"?: string | null,"so_dot_tho_may_emv"?: number,"so_ngay_catheter_cvc"?: number,"so_ngay_dieu_tri"?: number,"so_ngay_sonde_tieu"?: number,"so_ngay_tho_may"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"khoa_id"?: string,"metadata"?: NonNullable<Json>,"ngay_ghi_nhan"?: string,"nguoi_bao_cao_id"?: string | null,"so_dot_tho_may_emv"?: number,"so_ngay_catheter_cvc"?: number,"so_ngay_dieu_tri"?: number,"so_ngay_sonde_tieu"?: number,"so_ngay_tho_may"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fact_nkbv_mau_so_daily_khoa_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    }
                  ]
                },"nkbv_fact_mau_so_phau_thuat": {
                  Row: {
                    "asa_score": number | null,"co_dat_implant": boolean,"created_at": string,"expected_ssi_prob": number,"ho_ten_benh_nhan": string,"id": string,"is_active": boolean,"is_laparoscopic": boolean,"khoa_id": string,"loai_phau_thuat_nhsn": string,"ma_benh_nhan": string,"metadata": NonNullable<Json>,"ngay_phau_thuat": string,"phan_loai_vet_mo": string,"ten_phau_thuat": string,"thoi_gian_mo_phut": number,"thoi_gian_nguong_nhsn": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asa_score"?: number | null,"co_dat_implant"?: boolean,"created_at"?: string,"expected_ssi_prob"?: number,"ho_ten_benh_nhan": string,"id"?: string,"is_active"?: boolean,"is_laparoscopic"?: boolean,"khoa_id": string,"loai_phau_thuat_nhsn": string,"ma_benh_nhan": string,"metadata"?: NonNullable<Json>,"ngay_phau_thuat": string,"phan_loai_vet_mo": string,"ten_phau_thuat": string,"thoi_gian_mo_phut": number,"thoi_gian_nguong_nhsn"?: number,"updated_at"?: string
                  }
                  Update: {
                    "asa_score"?: number | null,"co_dat_implant"?: boolean,"created_at"?: string,"expected_ssi_prob"?: number,"ho_ten_benh_nhan"?: string,"id"?: string,"is_active"?: boolean,"is_laparoscopic"?: boolean,"khoa_id"?: string,"loai_phau_thuat_nhsn"?: string,"ma_benh_nhan"?: string,"metadata"?: NonNullable<Json>,"ngay_phau_thuat"?: string,"phan_loai_vet_mo"?: string,"ten_phau_thuat"?: string,"thoi_gian_mo_phut"?: number,"thoi_gian_nguong_nhsn"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fact_nkbv_mau_so_pt_khoa_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    }
                  ]
                },"nkbv_fact_su_kien": {
                  Row: {
                    "clinical_notes": Json | null,"created_at": string,"doe": string | null,"gioi_tinh": string | null,"ho_ten_benh_nhan": string,"id": string,"is_active": boolean,"khoa_ghi_nhan_id": string | null,"lo_tiet_khuan_id": string | null,"loa_khoa_id": string | null,"loai_benh_pham": string | null,"loai_nkbv_id": string,"ma_benh_an": string | null,"ma_benh_nhan": string,"ma_benh_pham": string | null,"ma_ca": string,"ma_cycle_qr_lien_quan": string | null,"ngay_phat_hien": string,"ngay_phau_thuat": string | null,"ngay_sinh": string | null,"ngay_vao_vien": string | null,"nguoi_ghi_id": string | null,"nguoi_tham_dinh_id": string | null,"quy_trinh_id": string | null,"so_luong": string | null,"tac_nhan_vi_khuan": string | null,"tham_dinh_luc": string | null,"trang_thai_id": string,"updated_at": string,"verification_data": Json | null,"vi_sinh_record_id": string | null,"vi_tri_nhiem_khuan": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "clinical_notes"?: Json | null,"created_at"?: string,"doe"?: string | null,"gioi_tinh"?: string | null,"ho_ten_benh_nhan": string,"id"?: string,"is_active"?: boolean,"khoa_ghi_nhan_id"?: string | null,"lo_tiet_khuan_id"?: string | null,"loa_khoa_id"?: string | null,"loai_benh_pham"?: string | null,"loai_nkbv_id": string,"ma_benh_an"?: string | null,"ma_benh_nhan": string,"ma_benh_pham"?: string | null,"ma_ca": string,"ma_cycle_qr_lien_quan"?: string | null,"ngay_phat_hien": string,"ngay_phau_thuat"?: string | null,"ngay_sinh"?: string | null,"ngay_vao_vien"?: string | null,"nguoi_ghi_id"?: string | null,"nguoi_tham_dinh_id"?: string | null,"quy_trinh_id"?: string | null,"so_luong"?: string | null,"tac_nhan_vi_khuan"?: string | null,"tham_dinh_luc"?: string | null,"trang_thai_id": string,"updated_at"?: string,"verification_data"?: Json | null,"vi_sinh_record_id"?: string | null,"vi_tri_nhiem_khuan"?: string | null
                  }
                  Update: {
                    "clinical_notes"?: Json | null,"created_at"?: string,"doe"?: string | null,"gioi_tinh"?: string | null,"ho_ten_benh_nhan"?: string,"id"?: string,"is_active"?: boolean,"khoa_ghi_nhan_id"?: string | null,"lo_tiet_khuan_id"?: string | null,"loa_khoa_id"?: string | null,"loai_benh_pham"?: string | null,"loai_nkbv_id"?: string,"ma_benh_an"?: string | null,"ma_benh_nhan"?: string,"ma_benh_pham"?: string | null,"ma_ca"?: string,"ma_cycle_qr_lien_quan"?: string | null,"ngay_phat_hien"?: string,"ngay_phau_thuat"?: string | null,"ngay_sinh"?: string | null,"ngay_vao_vien"?: string | null,"nguoi_ghi_id"?: string | null,"nguoi_tham_dinh_id"?: string | null,"quy_trinh_id"?: string | null,"so_luong"?: string | null,"tac_nhan_vi_khuan"?: string | null,"tham_dinh_luc"?: string | null,"trang_thai_id"?: string,"updated_at"?: string,"verification_data"?: Json | null,"vi_sinh_record_id"?: string | null,"vi_tri_nhiem_khuan"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fact_nkbv_su_kien_khoa_ghi_nhan_fkey"
      columns: ["khoa_ghi_nhan_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_ma_benh_an_fkey"
      columns: ["ma_benh_an"]
isOneToOne: false
      referencedRelation: "nkbv_fact_benh_an"
      referencedColumns: ["ma_benh_an"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_nguoi_ghi_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_nguoi_ghi_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_nguoi_ghi_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_nguoi_ghi_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_nguoi_ghi_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_nguoi_ghi_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_vi_sinh_record_fkey"
      columns: ["vi_sinh_record_id"]
isOneToOne: false
      referencedRelation: "nkbv_fact_vi_sinh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_vi_sinh_record_fkey"
      columns: ["vi_sinh_record_id"]
isOneToOne: false
      referencedRelation: "v_nkbv_vi_sinh_chua_phan_tich"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_nkbv_su_kien_nguoi_tham_dinh"
      columns: ["nguoi_tham_dinh_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_nkbv_su_kien_nguoi_tham_dinh"
      columns: ["nguoi_tham_dinh_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_nkbv_su_kien_nguoi_tham_dinh"
      columns: ["nguoi_tham_dinh_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_nkbv_su_kien_nguoi_tham_dinh"
      columns: ["nguoi_tham_dinh_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_nkbv_su_kien_nguoi_tham_dinh"
      columns: ["nguoi_tham_dinh_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_nkbv_su_kien_nguoi_tham_dinh"
      columns: ["nguoi_tham_dinh_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "nkbv_fact_su_kien_lo_tiet_khuan_id_fkey"
      columns: ["lo_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_lo_tiet_khuan"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nkbv_fact_su_kien_loa_khoa_id_fkey"
      columns: ["loa_khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nkbv_fact_su_kien_quy_trinh_id_fkey"
      columns: ["quy_trinh_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_quy_trinh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nkbv_fact_su_kien_quy_trinh_id_fkey"
      columns: ["quy_trinh_id"]
isOneToOne: false
      referencedRelation: "v_cssd_quy_trinh_full"
      referencedColumns: ["id"]
    }
                  ]
                },"nkbv_fact_vi_sinh": {
                  Row: {
                    "created_at": string,"gioi_tinh": string | null,"ho_ten_benh_nhan": string,"id": string,"is_active": boolean,"is_mdro": boolean,"ket_qua_duong_tinh": boolean,"ket_qua_phan_loai": string | null,"khoa_yeu_cau_id": string | null,"loai_benh_pham": string,"loai_benh_pham_chuan": string | null,"ma_benh_an": string,"ma_benh_nhan": string,"ma_benh_pham": string | null,"ma_xet_nghiem": string | null,"mdro_phenotype": string | null,"mdro_source": string | null,"metadata": Json | null,"ngay_lay_mau": string,"ngay_sinh": string | null,"ngay_vao_vien": string | null,"so_luong": string | null,"tac_nhan": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"gioi_tinh"?: string | null,"ho_ten_benh_nhan": string,"id"?: string,"is_active"?: boolean,"is_mdro"?: boolean,"ket_qua_duong_tinh"?: boolean,"ket_qua_phan_loai"?: string | null,"khoa_yeu_cau_id"?: string | null,"loai_benh_pham": string,"loai_benh_pham_chuan"?: string | null,"ma_benh_an": string,"ma_benh_nhan": string,"ma_benh_pham"?: string | null,"ma_xet_nghiem"?: string | null,"mdro_phenotype"?: string | null,"mdro_source"?: string | null,"metadata"?: Json | null,"ngay_lay_mau": string,"ngay_sinh"?: string | null,"ngay_vao_vien"?: string | null,"so_luong"?: string | null,"tac_nhan": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"gioi_tinh"?: string | null,"ho_ten_benh_nhan"?: string,"id"?: string,"is_active"?: boolean,"is_mdro"?: boolean,"ket_qua_duong_tinh"?: boolean,"ket_qua_phan_loai"?: string | null,"khoa_yeu_cau_id"?: string | null,"loai_benh_pham"?: string,"loai_benh_pham_chuan"?: string | null,"ma_benh_an"?: string,"ma_benh_nhan"?: string,"ma_benh_pham"?: string | null,"ma_xet_nghiem"?: string | null,"mdro_phenotype"?: string | null,"mdro_source"?: string | null,"metadata"?: Json | null,"ngay_lay_mau"?: string,"ngay_sinh"?: string | null,"ngay_vao_vien"?: string | null,"so_luong"?: string | null,"tac_nhan"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fact_nkbv_vi_sinh_khoa_yeu_cau_fkey"
      columns: ["khoa_yeu_cau_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_vi_sinh_ma_benh_an_fkey"
      columns: ["ma_benh_an"]
isOneToOne: false
      referencedRelation: "nkbv_fact_benh_an"
      referencedColumns: ["ma_benh_an"]
    }
                  ]
                },"qlcv_dm_nhom_chuyen_mon": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma": string,"ten": string,"thu_tu": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"ma": string,"ten": string,"thu_tu"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"ma"?: string,"ten"?: string,"thu_tu"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"qlcv_fact_cong_viec": {
                  Row: {
                    "analytics_meta": NonNullable<Json>,"checklist": NonNullable<Json>,"created_at": string | null,"dia_diem_khoa_id": string | null,"dia_diem_khoa_ids": (string)[],"dinh_ky_mau_id": string | null,"gia_han_so_lan": number,"gio_bat_dau": string | null,"gio_ket_thuc": string | null,"han_hoan_thanh": string | null,"hoan_thanh_luc": string | null,"id": string,"is_active": boolean | null,"loai_cong_viec": string,"mo_ta": string | null,"muc_do_uu_tien": string | null,"ngay_thuc_hien": string | null,"nguoi_giao_viec_id": string | null,"nguoi_phoi_hop_ids": (string)[],"nguoi_phu_trach_id": string | null,"nguoi_tao_id": string | null,"nguoi_theo_doi_ids": (string)[],"nguon_lien_ket": Json | null,"nhat_ky": NonNullable<Json>,"nhiem_vu_id": string | null,"nhom_chuyen_mon_id": string | null,"phan_tram_hoan_thanh": number | null,"tieu_de": string,"to_cong_tac_id": string | null,"trang_thai": string,"updated_at": string | null,"vi_tri_thuc_hien": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "analytics_meta"?: NonNullable<Json>,"checklist"?: NonNullable<Json>,"created_at"?: string | null,"dia_diem_khoa_id"?: string | null,"dia_diem_khoa_ids"?: (string)[],"dinh_ky_mau_id"?: string | null,"gia_han_so_lan"?: number,"gio_bat_dau"?: string | null,"gio_ket_thuc"?: string | null,"han_hoan_thanh"?: string | null,"hoan_thanh_luc"?: string | null,"id"?: string,"is_active"?: boolean | null,"loai_cong_viec": string,"mo_ta"?: string | null,"muc_do_uu_tien"?: string | null,"ngay_thuc_hien"?: string | null,"nguoi_giao_viec_id"?: string | null,"nguoi_phoi_hop_ids"?: (string)[],"nguoi_phu_trach_id"?: string | null,"nguoi_tao_id"?: string | null,"nguoi_theo_doi_ids"?: (string)[],"nguon_lien_ket"?: Json | null,"nhat_ky"?: NonNullable<Json>,"nhiem_vu_id"?: string | null,"nhom_chuyen_mon_id"?: string | null,"phan_tram_hoan_thanh"?: number | null,"tieu_de": string,"to_cong_tac_id"?: string | null,"trang_thai": string,"updated_at"?: string | null,"vi_tri_thuc_hien"?: string | null
                  }
                  Update: {
                    "analytics_meta"?: NonNullable<Json>,"checklist"?: NonNullable<Json>,"created_at"?: string | null,"dia_diem_khoa_id"?: string | null,"dia_diem_khoa_ids"?: (string)[],"dinh_ky_mau_id"?: string | null,"gia_han_so_lan"?: number,"gio_bat_dau"?: string | null,"gio_ket_thuc"?: string | null,"han_hoan_thanh"?: string | null,"hoan_thanh_luc"?: string | null,"id"?: string,"is_active"?: boolean | null,"loai_cong_viec"?: string,"mo_ta"?: string | null,"muc_do_uu_tien"?: string | null,"ngay_thuc_hien"?: string | null,"nguoi_giao_viec_id"?: string | null,"nguoi_phoi_hop_ids"?: (string)[],"nguoi_phu_trach_id"?: string | null,"nguoi_tao_id"?: string | null,"nguoi_theo_doi_ids"?: (string)[],"nguon_lien_ket"?: Json | null,"nhat_ky"?: NonNullable<Json>,"nhiem_vu_id"?: string | null,"nhom_chuyen_mon_id"?: string | null,"phan_tram_hoan_thanh"?: number | null,"tieu_de"?: string,"to_cong_tac_id"?: string | null,"trang_thai"?: string,"updated_at"?: string | null,"vi_tri_thuc_hien"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fact_cong_viec_dinh_ky_mau_fk"
      columns: ["dinh_ky_mau_id"]
isOneToOne: false
      referencedRelation: "qlcv_fact_cong_viec_dinh_ky"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_cong_viec_dia_diem_khoa_id_fkey"
      columns: ["dia_diem_khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_cong_viec_nhiem_vu_id_fkey"
      columns: ["nhiem_vu_id"]
isOneToOne: false
      referencedRelation: "qlcv_fact_nhiem_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_cong_viec_nhom_chuyen_mon_id_fkey"
      columns: ["nhom_chuyen_mon_id"]
isOneToOne: false
      referencedRelation: "qlcv_dm_nhom_chuyen_mon"
      referencedColumns: ["id"]
    }
                  ]
                },"qlcv_fact_cong_viec_dinh_ky": {
                  Row: {
                    "created_at": string,"dia_diem_khoa_id": string | null,"dia_diem_khoa_ids": (string)[],"gio_bat_dau": string | null,"gio_ket_thuc": string | null,"id": string,"is_active": boolean,"ma_chu_ky": string,"mo_ta": string | null,"muc_do_uu_tien": string | null,"ngay_bat_dau": string,"ngay_ket_thuc": string | null,"nguoi_phoi_hop_ids": (string)[],"nguoi_phu_trach_id": string | null,"nguoi_tao_id": string | null,"nguoi_theo_doi_ids": (string)[],"nhiem_vu_id": string | null,"nhom_chuyen_mon_id": string | null,"tieu_de": string,"to_cong_tac_id": string | null,"updated_at": string,"vi_tri_thuc_hien": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dia_diem_khoa_id"?: string | null,"dia_diem_khoa_ids"?: (string)[],"gio_bat_dau"?: string | null,"gio_ket_thuc"?: string | null,"id"?: string,"is_active"?: boolean,"ma_chu_ky": string,"mo_ta"?: string | null,"muc_do_uu_tien"?: string | null,"ngay_bat_dau"?: string,"ngay_ket_thuc"?: string | null,"nguoi_phoi_hop_ids"?: (string)[],"nguoi_phu_trach_id"?: string | null,"nguoi_tao_id"?: string | null,"nguoi_theo_doi_ids"?: (string)[],"nhiem_vu_id"?: string | null,"nhom_chuyen_mon_id"?: string | null,"tieu_de": string,"to_cong_tac_id"?: string | null,"updated_at"?: string,"vi_tri_thuc_hien"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"dia_diem_khoa_id"?: string | null,"dia_diem_khoa_ids"?: (string)[],"gio_bat_dau"?: string | null,"gio_ket_thuc"?: string | null,"id"?: string,"is_active"?: boolean,"ma_chu_ky"?: string,"mo_ta"?: string | null,"muc_do_uu_tien"?: string | null,"ngay_bat_dau"?: string,"ngay_ket_thuc"?: string | null,"nguoi_phoi_hop_ids"?: (string)[],"nguoi_phu_trach_id"?: string | null,"nguoi_tao_id"?: string | null,"nguoi_theo_doi_ids"?: (string)[],"nhiem_vu_id"?: string | null,"nhom_chuyen_mon_id"?: string | null,"tieu_de"?: string,"to_cong_tac_id"?: string | null,"updated_at"?: string,"vi_tri_thuc_hien"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fact_cong_viec_dinh_ky_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_cong_viec_dinh_ky_dia_diem_khoa_id_fkey"
      columns: ["dia_diem_khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_cong_viec_dinh_ky_nhiem_vu_id_fkey"
      columns: ["nhiem_vu_id"]
isOneToOne: false
      referencedRelation: "qlcv_fact_nhiem_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_cong_viec_dinh_ky_nhom_chuyen_mon_id_fkey"
      columns: ["nhom_chuyen_mon_id"]
isOneToOne: false
      referencedRelation: "qlcv_dm_nhom_chuyen_mon"
      referencedColumns: ["id"]
    }
                  ]
                },"qlcv_fact_nhiem_vu": {
                  Row: {
                    "bien_phap": string | null,"chi_dao": string | null,"chi_tieu": string | null,"chu_ky_goi_y": string | null,"created_at": string,"han_hoan_thanh": string | null,"id": string,"is_active": boolean,"khung_thoi_gian_ghi_chu": string | null,"nam": number,"nguoi_chu_tri_id": string | null,"nguoi_phoi_hop_ids": (string)[],"nguoi_tao_id": string | null,"noi_dung_can_dat": string | null,"pham_vi_ap_dung": string | null,"quy": number | null,"ten": string,"thang": number | null,"thu_tu": number,"trang_thai": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bien_phap"?: string | null,"chi_dao"?: string | null,"chi_tieu"?: string | null,"chu_ky_goi_y"?: string | null,"created_at"?: string,"han_hoan_thanh"?: string | null,"id"?: string,"is_active"?: boolean,"khung_thoi_gian_ghi_chu"?: string | null,"nam": number,"nguoi_chu_tri_id"?: string | null,"nguoi_phoi_hop_ids"?: (string)[],"nguoi_tao_id"?: string | null,"noi_dung_can_dat"?: string | null,"pham_vi_ap_dung"?: string | null,"quy"?: number | null,"ten": string,"thang"?: number | null,"thu_tu"?: number,"trang_thai"?: string,"updated_at"?: string
                  }
                  Update: {
                    "bien_phap"?: string | null,"chi_dao"?: string | null,"chi_tieu"?: string | null,"chu_ky_goi_y"?: string | null,"created_at"?: string,"han_hoan_thanh"?: string | null,"id"?: string,"is_active"?: boolean,"khung_thoi_gian_ghi_chu"?: string | null,"nam"?: number,"nguoi_chu_tri_id"?: string | null,"nguoi_phoi_hop_ids"?: (string)[],"nguoi_tao_id"?: string | null,"noi_dung_can_dat"?: string | null,"pham_vi_ap_dung"?: string | null,"quy"?: number | null,"ten"?: string,"thang"?: number | null,"thu_tu"?: number,"trang_thai"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "qlcv_fact_nhiem_vu_nguoi_chu_tri_id_fkey"
      columns: ["nguoi_chu_tri_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_nhiem_vu_nguoi_chu_tri_id_fkey"
      columns: ["nguoi_chu_tri_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "qlcv_fact_nhiem_vu_nguoi_chu_tri_id_fkey"
      columns: ["nguoi_chu_tri_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_nhiem_vu_nguoi_chu_tri_id_fkey"
      columns: ["nguoi_chu_tri_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_nhiem_vu_nguoi_chu_tri_id_fkey"
      columns: ["nguoi_chu_tri_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_nhiem_vu_nguoi_chu_tri_id_fkey"
      columns: ["nguoi_chu_tri_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "qlcv_fact_nhiem_vu_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_nhiem_vu_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "qlcv_fact_nhiem_vu_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_nhiem_vu_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_nhiem_vu_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_nhiem_vu_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"sys_account_access_request": {
                  Row: {
                    "created_at": string,"decided_at": string | null,"decided_by": string | null,"email": string,"id": string,"kind": string,"payload": NonNullable<Json>,"reject_reason": string | null,"staff_id": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"email": string,"id"?: string,"kind": string,"payload"?: NonNullable<Json>,"reject_reason"?: string | null,"staff_id"?: string | null,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"email"?: string,"id"?: string,"kind"?: string,"payload"?: NonNullable<Json>,"reject_reason"?: string | null,"staff_id"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sys_account_access_request_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sys_account_access_request_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "sys_account_access_request_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sys_account_access_request_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sys_account_access_request_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sys_account_access_request_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"sys_admin_audit": {
                  Row: {
                    "action": string,"actor_email": string | null,"actor_user_id": string | null,"after_data": Json | null,"before_data": Json | null,"created_at": string,"id": string,"reason": string | null,"target_id": string | null,"target_table": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_email"?: string | null,"actor_user_id"?: string | null,"after_data"?: Json | null,"before_data"?: Json | null,"created_at"?: string,"id"?: string,"reason"?: string | null,"target_id"?: string | null,"target_table"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_email"?: string | null,"actor_user_id"?: string | null,"after_data"?: Json | null,"before_data"?: Json | null,"created_at"?: string,"id"?: string,"reason"?: string | null,"target_id"?: string | null,"target_table"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"sys_lookup_value": {
                  Row: {
                    "category_type": string,"code": string,"created_at": string,"description": string | null,"id": string,"is_active": boolean,"metadata": Json | null,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_type": string,"code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"metadata"?: Json | null,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "category_type"?: string,"code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"metadata"?: Json | null,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sys_mdm_registry": {
                  Row: {
                    "column_name": string,"created_at": string,"field_role": string,"id": string,"is_active": boolean,"is_required": boolean,"notes": string | null,"owner_module": string | null,"source_column": string | null,"source_loai_danh_muc": string | null,"source_table": string | null,"suggestion_policy": string,"table_name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "column_name": string,"created_at"?: string,"field_role": string,"id"?: string,"is_active"?: boolean,"is_required"?: boolean,"notes"?: string | null,"owner_module"?: string | null,"source_column"?: string | null,"source_loai_danh_muc"?: string | null,"source_table"?: string | null,"suggestion_policy"?: string,"table_name": string,"updated_at"?: string
                  }
                  Update: {
                    "column_name"?: string,"created_at"?: string,"field_role"?: string,"id"?: string,"is_active"?: boolean,"is_required"?: boolean,"notes"?: string | null,"owner_module"?: string | null,"source_column"?: string | null,"source_loai_danh_muc"?: string | null,"source_table"?: string | null,"suggestion_policy"?: string,"table_name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sys_mdm_suggestion": {
                  Row: {
                    "column_name": string,"confidence": number,"created_at": string,"id": string,"proposed_field_role": string | null,"proposed_source_loai_danh_muc": string | null,"proposed_source_table": string | null,"reason": string,"status": string,"suggestion_type": string,"table_name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "column_name": string,"confidence"?: number,"created_at"?: string,"id"?: string,"proposed_field_role"?: string | null,"proposed_source_loai_danh_muc"?: string | null,"proposed_source_table"?: string | null,"reason": string,"status"?: string,"suggestion_type": string,"table_name": string,"updated_at"?: string
                  }
                  Update: {
                    "column_name"?: string,"confidence"?: number,"created_at"?: string,"id"?: string,"proposed_field_role"?: string | null,"proposed_source_loai_danh_muc"?: string | null,"proposed_source_table"?: string | null,"reason"?: string,"status"?: string,"suggestion_type"?: string,"table_name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sys_module_locks": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"locked_until_date": string,"module_name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"locked_until_date": string,"module_name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"locked_until_date"?: string,"module_name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sys_permissions": {
                  Row: {
                    "action": string,"created_at": string,"description": string | null,"id": string,"module_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"created_at"?: string,"description"?: string | null,"id"?: string,"module_name": string
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"module_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sys_role_permissions": {
                  Row: {
                    "created_at": string,"id": string,"permission_id": string,"role_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"permission_id": string,"role_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"permission_id"?: string,"role_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "role_permissions_permission_id_fkey"
      columns: ["permission_id"]
isOneToOne: false
      referencedRelation: "sys_permissions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "role_permissions_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "sys_roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "role_permissions_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "v_sys_role_permissions_matrix"
      referencedColumns: ["role_id"]
    }
                  ]
                },"sys_roles": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sys_user_roles": {
                  Row: {
                    "created_at": string,"id": string,"role_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"role_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"role_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "sys_roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "v_sys_role_permissions_matrix"
      referencedColumns: ["role_id"]
    }
                  ]
                }
          }
          Views: {
            "cssd_dm_loai_may": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma_loai_may": string,"ten_loai_may": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_loai_may"?: string | null,"ten_loai_may"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_loai_may"?: string | null,"ten_loai_may"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"cssd_dm_loai_su_co": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma_loai_su_co": string,"ten_loai_su_co": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_loai_su_co"?: string | null,"ten_loai_su_co"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_loai_su_co"?: string | null,"ten_loai_su_co"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"cssd_dm_tram": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma_tram": string,"ten_tram": string,"thu_tu": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_tram"?: string | null,"ten_tram"?: string | null,"thu_tu"?: never,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_tram"?: string | null,"ten_tram"?: string | null,"thu_tu"?: never,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"fact_gsc_dashboard_summary": {
                  Row: {
                    "bang_kiem_id": string | null,"created_at": string,"khoa_id": string | null,"khu_vuc_id": string | null,"loai_giam_sat": string | null,"ngay_giam_sat": string | null,"nghe_nghiep_id": string | null,"nguoi_giam_sat_id": string | null,"session_id": string,"stype": string | null,"tong_dat": number | null,"tong_phien": number | null,"tong_quan_sat": number | null,"tong_vi_pham": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_bang_kiem"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_tieu_chi_bang_kiem"
      referencedColumns: ["bang_kiem_id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "v_gstt_bang_kiem_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "v_gstt_dashboard_bundle_rate_v3"
      referencedColumns: ["bang_kiem_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"fact_gsc_violations_summary": {
                  Row: {
                    "bang_kiem_id": string | null,"created_at": string,"criterion_id": string | null,"is_orphan_criterion": boolean | null,"khoa_id": string | null,"khu_vuc_id": string | null,"loai_giam_sat": string | null,"ngay_giam_sat": string | null,"nghe_nghiep_id": string | null,"nguoi_giam_sat_id": string | null,"resolved_criterion_id": string | null,"session_id": string,"stype": string | null,"ten_tieu_chi": string | null,"tong_quan_sat": number | null,"tong_vi_pham": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_bang_kiem"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_tieu_chi_bang_kiem"
      referencedColumns: ["bang_kiem_id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "v_gstt_bang_kiem_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "v_gstt_dashboard_bundle_rate_v3"
      referencedColumns: ["bang_kiem_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"fact_nkbv_device_registry": {
                  Row: {
                    "created_at": string,"device_type": string,"first_access_date": string | null,"id": string,"insertion_date": string,"is_active": boolean,"khoa_id": string | null,"line_type": string | null,"ma_benh_an": string,"ma_benh_nhan": string | null,"metadata": NonNullable<Json>,"notes": string | null,"removal_date": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"device_type"?: string | null,"first_access_date"?: string | null,"id"?: string | null,"insertion_date"?: string | null,"is_active"?: boolean | null,"khoa_id"?: string | null,"line_type"?: string | null,"ma_benh_an"?: string | null,"ma_benh_nhan"?: string | null,"metadata"?: Json | null,"notes"?: string | null,"removal_date"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"device_type"?: string | null,"first_access_date"?: string | null,"id"?: string | null,"insertion_date"?: string | null,"is_active"?: boolean | null,"khoa_id"?: string | null,"line_type"?: string | null,"ma_benh_an"?: string | null,"ma_benh_nhan"?: string | null,"metadata"?: Json | null,"notes"?: string | null,"removal_date"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"fact_vst_moments_summary": {
                  Row: {
                    "co_deo_gang": boolean | null,"created_at": string,"is_tuan_thu": boolean | null,"khoa_id": string | null,"khu_vuc_id": string | null,"moment_label": string | null,"ngay_giam_sat": string | null,"nghe_nghiep_id": string | null,"nguoi_giam_sat_id": string | null,"opportunity_id": string,"session_id": string,"so_quan_sat": number | null,"stype": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "v_gstt_giam_sat_vst_sessions_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"fact_vst_opportunities_summary": {
                  Row: {
                    "bo_sot": number | null,"co_deo_gang": boolean | null,"created_at": string,"da_tuan_thu": number | null,"du_thoi_gian": boolean | null,"dung_ky_thuat": boolean | null,"is_tuan_thu": boolean | null,"khoa_id": string | null,"khu_vuc_id": string | null,"lam_dung_gang": number | null,"loi_ky_thuat": number | null,"loi_thoi_gian": number | null,"ngay_giam_sat": string | null,"nghe_nghiep_id": string | null,"nguoi_giam_sat_id": string | null,"opportunity_id": string,"session_id": string,"so_co_hoi": number | null,"stype": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "v_gstt_giam_sat_vst_sessions_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"fact_vst_sessions_summary": {
                  Row: {
                    "created_at": string,"khoa_id": string | null,"khu_vuc_id": string | null,"ngay_giam_sat": string | null,"nguoi_giam_sat_id": string | null,"session_id": string,"stype": string | null,"tong_phien": number | null
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"khoa_id"?: string | null,"khu_vuc_id"?: string | null,"ngay_giam_sat"?: string | null,"nguoi_giam_sat_id"?: string | null,"session_id"?: string | null,"stype"?: never,"tong_phien"?: never
                         }
                        Update: {
                           "created_at"?: string | null,"khoa_id"?: string | null,"khu_vuc_id"?: string | null,"ngay_giam_sat"?: string | null,"nguoi_giam_sat_id"?: string | null,"session_id"?: string | null,"stype"?: never,"tong_phien"?: never
                         }
                        Relationships: [
                    {
      foreignKeyName: "giam_sat_vst_sessions_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"gstt_dm_cach_thuc_giam_sat": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma_cach_thuc": string,"ten_cach_thuc": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_cach_thuc"?: string | null,"ten_cach_thuc"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_cach_thuc"?: string | null,"ten_cach_thuc"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"gstt_dm_hinh_thuc_giam_sat": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma_hinh_thuc": string,"ten_hinh_thuc": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_hinh_thuc"?: string | null,"ten_hinh_thuc"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_hinh_thuc"?: string | null,"ten_hinh_thuc"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"gstt_dm_khu_vuc_giam_sat": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma_khu_vuc": string,"metadata": Json | null,"nhom_mau": string | null,"ten_khu_vuc": string,"thu_tu": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_khu_vuc"?: string | null,"metadata"?: Json | null,"nhom_mau"?: never,"ten_khu_vuc"?: string | null,"thu_tu"?: never,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_khu_vuc"?: string | null,"metadata"?: Json | null,"nhom_mau"?: never,"ten_khu_vuc"?: string | null,"thu_tu"?: never,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"gstt_dm_tieu_chi_bang_kiem": {
                  Row: {
                    "bang_kiem_id": string,"cac_lua_chon": (string)[] | null,"cho_phep_kpa": boolean | null,"created_at": string | null,"diem_toi_da": number | null,"ghi_chu": string | null,"id": string | null,"is_active": boolean | null,"kieu_du_lieu": string | null,"la_then_chot": boolean | null,"ma_csv_goc": string | null,"ma_tc": string | null,"noi_dung": string | null,"phan_muc": string | null,"stt": number | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"gstt_fact_gsc_dashboard_summary": {
                  Row: {
                    "bang_kiem_id": string | null,"created_at": string,"khoa_id": string | null,"khu_vuc_id": string | null,"loai_giam_sat": string | null,"ngay_giam_sat": string | null,"nghe_nghiep_id": string | null,"nguoi_giam_sat_id": string | null,"session_id": string,"stype": string | null,"tong_dat": number | null,"tong_phien": number | null,"tong_quan_sat": number | null,"tong_vi_pham": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_bang_kiem"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_tieu_chi_bang_kiem"
      referencedColumns: ["bang_kiem_id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "v_gstt_bang_kiem_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "v_gstt_dashboard_bundle_rate_v3"
      referencedColumns: ["bang_kiem_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"gstt_fact_gsc_violations_summary": {
                  Row: {
                    "bang_kiem_id": string | null,"created_at": string,"criterion_id": string | null,"is_orphan_criterion": boolean | null,"khoa_id": string | null,"khu_vuc_id": string | null,"loai_giam_sat": string | null,"ngay_giam_sat": string | null,"nghe_nghiep_id": string | null,"nguoi_giam_sat_id": string | null,"resolved_criterion_id": string | null,"session_id": string,"stype": string | null,"ten_tieu_chi": string | null,"tong_quan_sat": number | null,"tong_vi_pham": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_bang_kiem"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_tieu_chi_bang_kiem"
      referencedColumns: ["bang_kiem_id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "v_gstt_bang_kiem_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "v_gstt_dashboard_bundle_rate_v3"
      referencedColumns: ["bang_kiem_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"gstt_fact_vst_moments_summary": {
                  Row: {
                    "co_deo_gang": boolean | null,"created_at": string,"is_tuan_thu": boolean | null,"khoa_id": string | null,"khu_vuc_id": string | null,"moment_label": string | null,"ngay_giam_sat": string | null,"nghe_nghiep_id": string | null,"nguoi_giam_sat_id": string | null,"opportunity_id": string,"session_id": string,"so_quan_sat": number | null,"stype": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "v_gstt_giam_sat_vst_sessions_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"gstt_fact_vst_opportunities_summary": {
                  Row: {
                    "bo_sot": number | null,"co_deo_gang": boolean | null,"created_at": string,"da_tuan_thu": number | null,"du_thoi_gian": boolean | null,"dung_ky_thuat": boolean | null,"is_tuan_thu": boolean | null,"khoa_id": string | null,"khu_vuc_id": string | null,"lam_dung_gang": number | null,"loi_ky_thuat": number | null,"loi_thoi_gian": number | null,"ngay_giam_sat": string | null,"nghe_nghiep_id": string | null,"nguoi_giam_sat_id": string | null,"opportunity_id": string,"session_id": string,"so_co_hoi": number | null,"stype": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "v_gstt_giam_sat_vst_sessions_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"gstt_fact_vst_sessions_summary": {
                  Row: {
                    "created_at": string,"khoa_id": string | null,"khu_vuc_id": string | null,"ngay_giam_sat": string | null,"nguoi_giam_sat_id": string | null,"session_id": string,"stype": string | null,"tong_phien": number | null
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"khoa_id"?: string | null,"khu_vuc_id"?: string | null,"ngay_giam_sat"?: string | null,"nguoi_giam_sat_id"?: string | null,"session_id"?: string | null,"stype"?: never,"tong_phien"?: never
                         }
                        Update: {
                           "created_at"?: string | null,"khoa_id"?: string | null,"khu_vuc_id"?: string | null,"ngay_giam_sat"?: string | null,"nguoi_giam_sat_id"?: string | null,"session_id"?: string | null,"stype"?: never,"tong_phien"?: never
                         }
                        Relationships: [
                    {
      foreignKeyName: "giam_sat_vst_sessions_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"mdm_dm_chuc_danh": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma_chuc_danh": string,"ten_chuc_danh": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_chuc_danh"?: string | null,"ten_chuc_danh"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_chuc_danh"?: string | null,"ten_chuc_danh"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"mdm_dm_chuc_vu": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma_chuc_vu": string,"ten_chuc_vu": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_chuc_vu"?: string | null,"ten_chuc_vu"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_chuc_vu"?: string | null,"ten_chuc_vu"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"mdm_dm_khoi_khoa": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma_khoi": string,"ten_khoi": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_khoi"?: string | null,"ten_khoi"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_khoi"?: string | null,"ten_khoi"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"mdm_dm_nghe_nghiep": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma_nghe_nghiep": string,"ten_nghe_nghiep": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_nghe_nghiep"?: string | null,"ten_nghe_nghiep"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_nghe_nghiep"?: string | null,"ten_nghe_nghiep"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"mdm_dm_to_cong_tac": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma_to": string,"ten_to": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_to"?: string | null,"ten_to"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_to"?: string | null,"ten_to"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"mdm_field_registry": {
                  Row: {
                    "column_name": string,"created_at": string,"field_role": string,"id": string,"is_active": boolean,"is_required": boolean,"notes": string | null,"owner_module": string | null,"source_column": string | null,"source_loai_danh_muc": string | null,"source_table": string | null,"suggestion_policy": string,"table_name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "column_name"?: string | null,"created_at"?: string | null,"field_role"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"is_required"?: boolean | null,"notes"?: string | null,"owner_module"?: string | null,"source_column"?: string | null,"source_loai_danh_muc"?: string | null,"source_table"?: string | null,"suggestion_policy"?: string | null,"table_name"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "column_name"?: string | null,"created_at"?: string | null,"field_role"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"is_required"?: boolean | null,"notes"?: string | null,"owner_module"?: string | null,"source_column"?: string | null,"source_loai_danh_muc"?: string | null,"source_table"?: string | null,"suggestion_policy"?: string | null,"table_name"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"mdm_governance_suggestion": {
                  Row: {
                    "column_name": string,"confidence": number,"created_at": string,"id": string,"proposed_field_role": string | null,"proposed_source_loai_danh_muc": string | null,"proposed_source_table": string | null,"reason": string,"status": string,"suggestion_type": string,"table_name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "column_name"?: string | null,"confidence"?: number | null,"created_at"?: string | null,"id"?: string | null,"proposed_field_role"?: string | null,"proposed_source_loai_danh_muc"?: string | null,"proposed_source_table"?: string | null,"reason"?: string | null,"status"?: string | null,"suggestion_type"?: string | null,"table_name"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "column_name"?: string | null,"confidence"?: number | null,"created_at"?: string | null,"id"?: string | null,"proposed_field_role"?: string | null,"proposed_source_loai_danh_muc"?: string | null,"proposed_source_table"?: string | null,"reason"?: string | null,"status"?: string | null,"suggestion_type"?: string | null,"table_name"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"nkbv_dm_loai": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma_loai": string,"ten_loai": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_loai"?: string | null,"ten_loai"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_loai"?: string | null,"ten_loai"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"nkbv_dm_trang_thai_ca": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"ma_trang_thai": string,"ten_trang_thai": string,"thu_tu": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_trang_thai"?: string | null,"ten_trang_thai"?: string | null,"thu_tu"?: never,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"ma_trang_thai"?: string | null,"ten_trang_thai"?: string | null,"thu_tu"?: never,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"nkbv_v_ba_dung_cu_dat_rut": {
                  Row: {
                    "loai_dung_cu": string,"ma_benh_an": string,"ngay_dat": string | null,"ngay_rut": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "nkbv_fact_ba_ngay_dung_cu_ma_benh_an_fkey"
      columns: ["ma_benh_an"]
isOneToOne: false
      referencedRelation: "nkbv_fact_benh_an"
      referencedColumns: ["ma_benh_an"]
    }
                  ]
                },"v_auth_user_permissions": {
                  Row: {
                    "auth_user_id": string | null,"email": string | null,"ho_ten": string | null,"is_active": boolean,"khoa_id": string | null,"ma_khoa_phong": string | null,"ma_nv": string | null,"permissions": Json | null,"roles": Json | null,"staff_id": string,"ten_khoa_phong": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "ho_so_nhan_vien_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    }
                  ]
                },"v_cssd_bo_dung_cu_bien_dong": {
                  Row: {
                    "bo_dung_cu_id": string | null,"loai_dung_cu_id": string,"so_luong_bien_dong": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fact_kho_dung_cu_giao_dich_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_bo_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_kho_dung_cu_giao_dich_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_dung_cu_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_kho_dung_cu_giao_dich_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_heat_split_hint"
      referencedColumns: ["bo_id"]
    },{
      foreignKeyName: "fact_kho_dung_cu_giao_dich_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_kho_dung_cu_giao_dich_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_loai_dung_cu_summary"
      referencedColumns: ["id"]
    }
                  ]
                },"v_cssd_bo_dung_cu_chi_tiet_full": {
                  Row: {
                    "bo_dung_cu_id": string | null,"co_ma_khac": boolean | null,"created_at": string | null,"ghi_chu": string | null,"id": string,"is_active": boolean | null,"loai_dung_cu_id": string | null,"ma_bo": string | null,"ma_chi_tiet": string | null,"ma_khac": string | null,"ma_loai_dung_cu": string | null,"ma_qr_mau": string | null,"so_luong": number | null,"specs": Json | null,"ten_bo": string | null,"ten_chi_tiet": string | null,"ten_dung_cu_le": string,"ten_loai_dung_cu": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_bo_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_dung_cu_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_heat_split_hint"
      referencedColumns: ["bo_id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_loai_dung_cu_summary"
      referencedColumns: ["id"]
    }
                  ]
                },"v_cssd_bo_dung_cu_chi_tiet_realtime": {
                  Row: {
                    "bo_dung_cu_id": string | null,"chi_tiet_id": string,"ghi_chu": string | null,"is_active": boolean | null,"is_chiu_nhiet": boolean,"is_missing": boolean | null,"loai_dung_cu_id": string | null,"ma_bo": string,"ma_loai_dung_cu": string,"missing_count": number | null,"phan_loai_spaulding": string,"phuong_phap_tiet_khuan": string | null,"so_luong_thuc_te": number | null,"so_luong_tieu_chuan": number | null,"ten_bo": string,"ten_loai_dung_cu": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_bo_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_dung_cu_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_heat_split_hint"
      referencedColumns: ["bo_id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_loai_dung_cu_summary"
      referencedColumns: ["id"]
    }
                  ]
                },"v_cssd_bo_dung_cu_summary": {
                  Row: {
                    "co_ma_dinh_danh_rieng": boolean,"created_at": string | null,"ghi_chu": string | null,"id": string,"is_active": boolean | null,"khoa_su_dung_id": string | null,"loai_dung_cu_id": string | null,"ma_bo": string,"ngay_kiem_ke_gan_nhat": string | null,"phan_loai_bo": string,"quy_cach": string | null,"so_khoan": number | null,"so_luong_bo": number | null,"ten_bo": string,"tong_phan_bo": number | null,"tong_so_luong_dung_cu": number | null,"trang_thai": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "dm_bo_dung_cu_khoa_su_dung_id_fkey"
      columns: ["khoa_su_dung_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_loai_dung_cu_summary"
      referencedColumns: ["id"]
    }
                  ]
                },"v_cssd_bo_heat_split_hint": {
                  Row: {
                    "bo_id": string,"has_chiu_nhiet": boolean | null,"has_khong_chiu_nhiet": boolean | null,"ma_bo": string,"parent_bo_id": string | null,"require_split": boolean | null,"ten_bo": string,"vai_tro_tach": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "bo_id"?: string | null,"has_chiu_nhiet"?: never,"has_khong_chiu_nhiet"?: never,"ma_bo"?: string | null,"parent_bo_id"?: string | null,"require_split"?: never,"ten_bo"?: string | null,"vai_tro_tach"?: string | null
                         }
                        Update: {
                           "bo_id"?: string | null,"has_chiu_nhiet"?: never,"has_khong_chiu_nhiet"?: never,"ma_bo"?: string | null,"parent_bo_id"?: string | null,"require_split"?: never,"ten_bo"?: string | null,"vai_tro_tach"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "cssd_dm_bo_dung_cu_parent_bo_id_fkey"
      columns: ["parent_bo_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_bo_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_dm_bo_dung_cu_parent_bo_id_fkey"
      columns: ["parent_bo_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_dung_cu_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_dm_bo_dung_cu_parent_bo_id_fkey"
      columns: ["parent_bo_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_heat_split_hint"
      referencedColumns: ["bo_id"]
    }
                  ]
                },"v_cssd_bo_thanh_phan_hieu_luc": {
                  Row: {
                    "bo_dung_cu_id": string | null,"bo_tong_id": string | null,"chi_tiet_id": string | null,"ghi_chu": string | null,"is_chiu_nhiet": boolean | null,"loai_dung_cu_id": string | null,"nguon_bo_dung_cu_id": string | null,"so_luong": number | null,"so_luong_thuc_te": number | null,"specs": Json | null,"ten_chi_tiet": string | null,"ten_dung_cu_le": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["nguon_bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_bo_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["nguon_bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_dung_cu_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["nguon_bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_heat_split_hint"
      referencedColumns: ["bo_id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_loai_dung_cu_summary"
      referencedColumns: ["id"]
    }
                  ]
                },"v_cssd_bo_thanh_phan_hieu_luc_realtime": {
                  Row: {
                    "bo_dung_cu_id": string | null,"bo_tong_id": string | null,"chi_tiet_id": string | null,"ghi_chu": string | null,"is_active": boolean | null,"is_chiu_nhiet": boolean,"is_missing": boolean | null,"loai_dung_cu_id": string | null,"ma_bo": string,"ma_loai_dung_cu": string,"missing_count": number | null,"nguon_bo_dung_cu_id": string | null,"phan_loai_spaulding": string,"phuong_phap_tiet_khuan": string | null,"so_luong_thuc_te": number | null,"so_luong_tieu_chuan": number | null,"ten_bo": string,"ten_loai_dung_cu": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["nguon_bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_bo_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["nguon_bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_dung_cu_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey"
      columns: ["nguon_bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_heat_split_hint"
      referencedColumns: ["bo_id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey"
      columns: ["loai_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_loai_dung_cu_summary"
      referencedColumns: ["id"]
    }
                  ]
                },"v_cssd_hoa_chat_full": {
                  Row: {
                    "created_at": string | null,"don_vi_tinh": string | null,"ghi_chu": string | null,"han_su_dung": string | null,"id": string,"is_active": boolean | null,"loai_hoa_chat": string | null,"ma_hoa_chat": string,"nguong_ton_toi_thieu": number | null,"nhom_id": string | null,"nhom_ten": string | null,"nong_do": string | null,"quy_cach": string | null,"so_ngay_cho_hang": number,"specs": NonNullable<Json>,"ten_hoa_chat": string,"ty_le_canh_bao_pct": number,"updated_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "cssd_dm_hoa_chat_nhom_id_loai_fkey"
      columns: ["nhom_id","loai_hoa_chat"]
isOneToOne: false
      referencedRelation: "cssd_dm_hoa_chat_nhom"
      referencedColumns: ["id","loai_hoa_chat"]
    }
                  ]
                },"v_cssd_kho_hoa_chat_ton_lo": {
                  Row: {
                    "dm_hoa_chat_id": string,"han_su_dung": string | null,"ma_lo": string | null,"ton_so_luong": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fact_kho_hoa_chat_giao_dich_dm_hoa_chat_id_fkey"
      columns: ["dm_hoa_chat_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_hoa_chat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_kho_hoa_chat_giao_dich_dm_hoa_chat_id_fkey"
      columns: ["dm_hoa_chat_id"]
isOneToOne: false
      referencedRelation: "v_cssd_hoa_chat_full"
      referencedColumns: ["id"]
    }
                  ]
                },"v_cssd_loai_dung_cu_summary": {
                  Row: {
                    "bo_dung_cu_chua": Json | null,"cong_dung": string | null,"created_at": string,"hinh_dang": string | null,"id": string,"is_active": boolean,"is_chiu_nhiet": boolean,"kich_thuoc": string | null,"ma_loai": string,"ma_loai_dung_cu": string | null,"mo_ta": string | null,"phan_loai": string,"phan_loai_spaulding": string,"phuong_phap_tiet_khuan": string | null,"so_luong_kho_du_phong": number,"so_luong_tong": number | null,"so_ngay_han_dung": number | null,"ten_loai": string,"ten_loai_dung_cu": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "bo_dung_cu_chua"?: never,"cong_dung"?: never,"created_at"?: string | null,"hinh_dang"?: never,"id"?: string | null,"is_active"?: boolean | null,"is_chiu_nhiet"?: boolean | null,"kich_thuoc"?: never,"ma_loai"?: string | null,"ma_loai_dung_cu"?: never,"mo_ta"?: string | null,"phan_loai"?: string | null,"phan_loai_spaulding"?: string | null,"phuong_phap_tiet_khuan"?: string | null,"so_luong_kho_du_phong"?: number | null,"so_luong_tong"?: never,"so_ngay_han_dung"?: number | null,"ten_loai"?: string | null,"ten_loai_dung_cu"?: never,"updated_at"?: string | null
                         }
                        Update: {
                           "bo_dung_cu_chua"?: never,"cong_dung"?: never,"created_at"?: string | null,"hinh_dang"?: never,"id"?: string | null,"is_active"?: boolean | null,"is_chiu_nhiet"?: boolean | null,"kich_thuoc"?: never,"ma_loai"?: string | null,"ma_loai_dung_cu"?: never,"mo_ta"?: string | null,"phan_loai"?: string | null,"phan_loai_spaulding"?: string | null,"phuong_phap_tiet_khuan"?: string | null,"so_luong_kho_du_phong"?: number | null,"so_luong_tong"?: never,"so_ngay_han_dung"?: number | null,"ten_loai"?: string | null,"ten_loai_dung_cu"?: never,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"v_cssd_quy_trinh_full": {
                  Row: {
                    "bo_dung_cu_id": string | null,"bom_kiem_dem_at": string | null,"bom_kiem_dem_boi_id": string | null,"created_at": string | null,"han_su_dung": string | null,"id": string,"is_active": boolean | null,"is_dong_bang": boolean,"is_red_alert": boolean,"khoa_nhan_id": string | null,"khoa_su_dung_id": string | null,"lo_tiet_khuan_id": string | null,"ma_bo": string | null,"ma_ca_mo_id": string | null,"ma_cycle_qr": string | null,"ma_qr_bo_vinh_vien": string | null,"ma_qr_quy_trinh": string,"ma_trang_thai_hien_tai": string | null,"ma_vai_tro_bo": string,"ngay_het_han": string | null,"ngay_tiet_khuan": string | null,"nguoi_cap_phat_id": string | null,"nguoi_dang_giu_id": string | null,"nguoi_dong_goi_id": string | null,"nguoi_kiem_tra_id": string | null,"nguoi_lam_sach_id": string | null,"nguoi_tiep_nhan_id": string | null,"nguoi_tiet_khuan_id": string | null,"quy_trinh_cha_id": string | null,"suds_count": number | null,"ten_bo": string | null,"ten_khoa": string | null,"ten_khoa_nhan": string | null,"ten_loai_dung_cu": string | null,"ten_tram_hien_tai": string | null,"thoi_gian_cap_phat": string | null,"thoi_gian_dong_goi": string | null,"thoi_gian_lam_sach": string | null,"thoi_gian_qc": string | null,"thoi_gian_tiep_nhan": string | null,"thoi_gian_tiet_khuan": string | null,"tinh_trang": string | null,"tram_hien_tai_id": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "cssd_fact_quy_trinh_bom_kiem_dem_boi_id_fkey"
      columns: ["bom_kiem_dem_boi_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_quy_trinh_bom_kiem_dem_boi_id_fkey"
      columns: ["bom_kiem_dem_boi_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "cssd_fact_quy_trinh_bom_kiem_dem_boi_id_fkey"
      columns: ["bom_kiem_dem_boi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_quy_trinh_bom_kiem_dem_boi_id_fkey"
      columns: ["bom_kiem_dem_boi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_quy_trinh_bom_kiem_dem_boi_id_fkey"
      columns: ["bom_kiem_dem_boi_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cssd_fact_quy_trinh_bom_kiem_dem_boi_id_fkey"
      columns: ["bom_kiem_dem_boi_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "cssd_fact_quy_trinh_khoa_nhan_id_fkey"
      columns: ["khoa_nhan_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dm_bo_dung_cu_khoa_su_dung_id_fkey"
      columns: ["khoa_su_dung_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_quy_trinh_quy_trinh_cha_id_fkey"
      columns: ["quy_trinh_cha_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_quy_trinh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_quy_trinh_quy_trinh_cha_id_fkey"
      columns: ["quy_trinh_cha_id"]
isOneToOne: false
      referencedRelation: "v_cssd_quy_trinh_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_cap_phat"
      columns: ["nguoi_cap_phat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_cap_phat"
      columns: ["nguoi_cap_phat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_cap_phat"
      columns: ["nguoi_cap_phat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_cap_phat"
      columns: ["nguoi_cap_phat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_cap_phat"
      columns: ["nguoi_cap_phat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_cap_phat"
      columns: ["nguoi_cap_phat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dang_giu"
      columns: ["nguoi_dang_giu_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dang_giu"
      columns: ["nguoi_dang_giu_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dang_giu"
      columns: ["nguoi_dang_giu_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dang_giu"
      columns: ["nguoi_dang_giu_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dang_giu"
      columns: ["nguoi_dang_giu_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dang_giu"
      columns: ["nguoi_dang_giu_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dong_goi"
      columns: ["nguoi_dong_goi_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dong_goi"
      columns: ["nguoi_dong_goi_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dong_goi"
      columns: ["nguoi_dong_goi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dong_goi"
      columns: ["nguoi_dong_goi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dong_goi"
      columns: ["nguoi_dong_goi_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_dong_goi"
      columns: ["nguoi_dong_goi_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_kiem_tra"
      columns: ["nguoi_kiem_tra_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_kiem_tra"
      columns: ["nguoi_kiem_tra_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_kiem_tra"
      columns: ["nguoi_kiem_tra_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_kiem_tra"
      columns: ["nguoi_kiem_tra_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_kiem_tra"
      columns: ["nguoi_kiem_tra_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_kiem_tra"
      columns: ["nguoi_kiem_tra_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_lam_sach"
      columns: ["nguoi_lam_sach_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_lam_sach"
      columns: ["nguoi_lam_sach_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_lam_sach"
      columns: ["nguoi_lam_sach_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_lam_sach"
      columns: ["nguoi_lam_sach_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_lam_sach"
      columns: ["nguoi_lam_sach_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_lam_sach"
      columns: ["nguoi_lam_sach_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiep_nhan"
      columns: ["nguoi_tiep_nhan_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiep_nhan"
      columns: ["nguoi_tiep_nhan_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiep_nhan"
      columns: ["nguoi_tiep_nhan_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiep_nhan"
      columns: ["nguoi_tiep_nhan_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiep_nhan"
      columns: ["nguoi_tiep_nhan_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiep_nhan"
      columns: ["nguoi_tiep_nhan_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiet_khuan"
      columns: ["nguoi_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiet_khuan"
      columns: ["nguoi_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiet_khuan"
      columns: ["nguoi_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiet_khuan"
      columns: ["nguoi_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiet_khuan"
      columns: ["nguoi_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_nguoi_tiet_khuan"
      columns: ["nguoi_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_quy_trinh_tram_hien_tai"
      columns: ["tram_hien_tai_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quy_trinh_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_bo_dung_cu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quy_trinh_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_dung_cu_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quy_trinh_bo_dung_cu_id_fkey"
      columns: ["bo_dung_cu_id"]
isOneToOne: false
      referencedRelation: "v_cssd_bo_heat_split_hint"
      referencedColumns: ["bo_id"]
    },{
      foreignKeyName: "quy_trinh_lo_tiet_khuan_id_fkey"
      columns: ["lo_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_lo_tiet_khuan"
      referencedColumns: ["id"]
    }
                  ]
                },"v_cssd_su_co_full": {
                  Row: {
                    "attributes": NonNullable<Json>,"created_at": string | null,"id": string,"incident_group": string | null,"incident_type_label": string | null,"is_red_alert": boolean | null,"loai_su_co_id": string | null,"ma_loai_su_co": string | null,"ma_qr_quy_trinh": string | null,"ma_tram_gay_loi": string | null,"ma_tram_phat_hien": string,"mo_ta": string | null,"quy_trinh_id": string | null,"ten_loai_su_co": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_su_co_loai_su_co"
      columns: ["loai_su_co_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "su_co_quy_trinh_id_fkey"
      columns: ["quy_trinh_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_quy_trinh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "su_co_quy_trinh_id_fkey"
      columns: ["quy_trinh_id"]
isOneToOne: false
      referencedRelation: "v_cssd_quy_trinh_full"
      referencedColumns: ["id"]
    }
                  ]
                },"v_cssd_thiet_bi_full": {
                  Row: {
                    "chu_ky_bao_tri_ngay": number | null,"created_at": string | null,"ghi_chu": string | null,"hang_san_xuat": string | null,"id": string,"is_active": boolean | null,"loai_may_id": string | null,"loai_thiet_bi": string | null,"ma_loai_may": string | null,"ma_thiet_bi": string,"model": string | null,"nam_san_xuat": number | null,"ngay_bao_tri_gan_nhat": string | null,"ngay_bao_tri_tiep_theo": string | null,"ngay_dua_vao_su_dung": string | null,"serial_number": string | null,"specs": NonNullable<Json>,"ten_loai_may_hien_thi": string | null,"ten_thiet_bi": string,"trang_thai": string | null,"updated_at": string | null,"vi_tri": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_dm_thiet_bi_loai_may"
      columns: ["loai_may_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    }
                  ]
                },"v_gstt_bang_kiem_full": {
                  Row: {
                    "ap_dung_jsonb": NonNullable<Json>,"created_at": string | null,"id": string,"is_active": boolean | null,"is_system": boolean | null,"loai_hinh_giam_sat": string | null,"ma_bk": string,"mo_ta": string | null,"phan_loai_chuyen_mon": string | null,"ten_bang_kiem": string,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "ap_dung_jsonb"?: Json | null,"created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"is_system"?: boolean | null,"loai_hinh_giam_sat"?: string | null,"ma_bk"?: string | null,"mo_ta"?: string | null,"phan_loai_chuyen_mon"?: string | null,"ten_bang_kiem"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "ap_dung_jsonb"?: Json | null,"created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"is_system"?: boolean | null,"loai_hinh_giam_sat"?: string | null,"ma_bk"?: string | null,"mo_ta"?: string | null,"phan_loai_chuyen_mon"?: string | null,"ten_bang_kiem"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"v_gstt_dashboard_bundle_rate_v3": {
                  Row: {
                    "bang_kiem_id": string,"khoa_id": string | null,"ma_bk": string,"ngay": string | null,"so_dat": number | null,"so_khong_dat": number | null,"ten_bang_kiem": string,"tong_phien": number | null,"ty_le_dat": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "giam_sat_chung_sessions_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    }
                  ]
                },"v_gstt_dashboard_nhsn_denominator_v3": {
                  Row: {
                    "khoa_id": string,"ngay": string,"so_ngay_catheter_cvc": number,"so_ngay_dieu_tri": number,"so_ngay_sonde_tieu": number,"so_ngay_tho_may": number
                  }
                  ComputedFields: never
                  Insert: {
                           "khoa_id"?: string | null,"ngay"?: string | null,"so_ngay_catheter_cvc"?: number | null,"so_ngay_dieu_tri"?: number | null,"so_ngay_sonde_tieu"?: number | null,"so_ngay_tho_may"?: number | null
                         }
                        Update: {
                           "khoa_id"?: string | null,"ngay"?: string | null,"so_ngay_catheter_cvc"?: number | null,"so_ngay_dieu_tri"?: number | null,"so_ngay_sonde_tieu"?: number | null,"so_ngay_tho_may"?: number | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "fact_nkbv_mau_so_daily_khoa_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    }
                  ]
                },"v_gstt_giam_sat_chung_sessions_full": {
                  Row: {
                    "bang_kiem_id": string | null,"cach_thuc_giam_sat": string | null,"cach_thuc_id": string | null,"cach_tinh_diem": string | null,"created_at": string,"dat_tron_goi": boolean | null,"du_lieu_nghi_van": boolean,"ghi_chu_chung": string | null,"hinh_thuc_giam_sat": string | null,"hinh_thuc_id": string | null,"id": string,"is_active": boolean,"is_bo_sung_nguoi_benh": boolean | null,"is_giam_sat_ca_nhan": boolean,"is_manual_nhan_vien": boolean | null,"is_seen": boolean,"khoa_id": string | null,"khu_vuc_id": string | null,"loai_bang_kiem": string | null,"loai_giam_sat": string | null,"ma_benh_an": string | null,"ma_cach_thuc_giam_sat": string | null,"ma_hinh_thuc_giam_sat": string | null,"ma_khoa_phong": string | null,"ma_khu_vuc_giam_sat": string | null,"ma_nghe_nghiep": string | null,"ma_nguoi_benh": string | null,"ma_nguoi_giam_sat": string | null,"ma_nhan_vien": string | null,"ngay_giam_sat": string | null,"nghe_nghiep_id": string | null,"nguoi_giam_sat_id": string | null,"nhan_vien_id": string | null,"results_jsonb": NonNullable<Json>,"so_giuong_nguoi_benh": string | null,"ten_bang_kiem_hien_thi": string | null,"ten_cach_thuc_danh_muc": string | null,"ten_hinh_thuc_danh_muc": string | null,"ten_khoa_phong": string | null,"ten_khu_vuc_giam_sat": string | null,"ten_manual_nhan_vien": string | null,"ten_nghe_nghiep": string | null,"ten_nguoi_benh": string | null,"ten_nguoi_giam_sat": string | null,"ten_nhan_vien": string | null,"thoi_gian_bat_dau": string | null,"thoi_gian_ghi_nhan": string | null,"thoi_gian_ket_thuc": string | null,"tong_dat": number | null,"tong_diem": number | null,"tong_quan_sat": number | null,"updated_at": string,"vi_tri": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_bang_kiem"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_tieu_chi_bang_kiem"
      referencedColumns: ["bang_kiem_id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "v_gstt_bang_kiem_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_gsc_sessions_bang_kiem"
      columns: ["bang_kiem_id"]
isOneToOne: false
      referencedRelation: "v_gstt_dashboard_bundle_rate_v3"
      referencedColumns: ["bang_kiem_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_chung_sessions_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"v_gstt_giam_sat_vst_full": {
                  Row: {
                    "co_deo_gang": boolean | null,"created_at": string,"du_thoi_gian": boolean | null,"dung_ky_thuat": boolean | null,"ghi_chu": string | null,"hanh_dong": string | null,"id": string,"khoa_id": string | null,"khu_vuc": string | null,"khu_vuc_id": string | null,"legacy_csv_row_id": string | null,"ma_khu_vuc_giam_sat": string | null,"ma_nghe_nghiep": string | null,"ngay_giam_sat": string | null,"nghe_nghiep": string | null,"nghe_nghiep_id": string | null,"nhan_vien_id": string | null,"session_id": string,"ten_khoa_phong": string | null,"ten_khu_vuc_hien_thi": string | null,"ten_nghe_nghiep_hien_thi": string | null,"ten_nhan_vien": string | null,"ten_nhan_vien_ngoai": string | null,"thoi_diem": string | null,"thoi_gian_ghi_nhan": string | null,"vi_tri": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "v_gstt_giam_sat_vst_sessions_full"
      referencedColumns: ["id"]
    }
                  ]
                },"v_gstt_giam_sat_vst_sessions_full": {
                  Row: {
                    "cach_thuc_giam_sat": string | null,"cach_thuc_id": string | null,"created_at": string,"da_tuan_thu": number | null,"hinh_thuc_giam_sat": string | null,"hinh_thuc_id": string | null,"id": string,"is_active": boolean,"is_bo_sung_nguoi_benh": boolean | null,"is_seen": boolean,"khoa_id": string | null,"khu_vuc_id": string | null,"ma_benh_an": string | null,"ma_cach_thuc_giam_sat": string | null,"ma_hinh_thuc_giam_sat": string | null,"ma_khoa_phong": string | null,"ma_nguoi_benh": string | null,"ngay_giam_sat": string | null,"nguoi_giam_sat_id": string | null,"so_giuong_nguoi_benh": string | null,"ten_cach_thuc_danh_muc": string | null,"ten_hinh_thuc_danh_muc": string | null,"ten_khoa_phong": string | null,"ten_khu_vuc_giam_sat": string | null,"ten_nguoi_benh": string | null,"ten_nguoi_giam_sat": string | null,"thoi_gian_bat_dau": string | null,"thoi_gian_ket_thuc": string | null,"tong_co_hoi": number | null,"updated_at": string,"vi_tri_cu_the": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_cach_thuc_id_fkey"
      columns: ["cach_thuc_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey"
      columns: ["hinh_thuc_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey"
      columns: ["nguoi_giam_sat_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    }
                  ]
                },"v_gstt_gsc_dashboard_rows": {
                  Row: {
                    "created_at": string,"criterion_id": string | null,"id": string | null,"khoa_id": string | null,"loai_bang_kiem": string | null,"ngay_giam_sat": string | null,"note": string | null,"result_id": string | null,"result_value": string | null,"session_id": string,"ten_khoa": string | null,"tong_diem": number | null,"value": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "giam_sat_chung_sessions_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    }
                  ]
                },"v_gstt_vst_hotpath": {
                  Row: {
                    "co_deo_gang": boolean | null,"created_at": string,"du_thoi_gian": boolean | null,"dung_ky_thuat": boolean | null,"ghi_chu": string | null,"hanh_dong": string | null,"id": string,"khoa_id": string | null,"khu_vuc_id": string | null,"ngay_giam_sat": string | null,"nghe_nghiep_id": string | null,"nhan_vien_id": string | null,"session_id": string,"ten_nhan_vien_ngoai": string | null,"thoi_diem": string | null,"thoi_gian_ghi_nhan": string | null,"vi_tri": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "co_deo_gang"?: boolean | null,"created_at"?: string | null,"du_thoi_gian"?: boolean | null,"dung_ky_thuat"?: boolean | null,"ghi_chu"?: string | null,"hanh_dong"?: string | null,"id"?: string | null,"khoa_id"?: string | null,"khu_vuc_id"?: string | null,"ngay_giam_sat"?: string | null,"nghe_nghiep_id"?: string | null,"nhan_vien_id"?: string | null,"session_id"?: string | null,"ten_nhan_vien_ngoai"?: never,"thoi_diem"?: string | null,"thoi_gian_ghi_nhan"?: string | null,"vi_tri"?: string | null
                         }
                        Update: {
                           "co_deo_gang"?: boolean | null,"created_at"?: string | null,"du_thoi_gian"?: boolean | null,"dung_ky_thuat"?: boolean | null,"ghi_chu"?: string | null,"hanh_dong"?: string | null,"id"?: string | null,"khoa_id"?: string | null,"khu_vuc_id"?: string | null,"ngay_giam_sat"?: string | null,"nghe_nghiep_id"?: string | null,"nhan_vien_id"?: string | null,"session_id"?: string | null,"ten_nhan_vien_ngoai"?: never,"thoi_diem"?: string | null,"thoi_gian_ghi_nhan"?: string | null,"vi_tri"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_vst_obs_nghe_nghiep"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_nhan_vien_id_fkey"
      columns: ["nhan_vien_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "gstt_fact_vst_sessions_summary"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "giam_sat_vst_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "v_gstt_giam_sat_vst_sessions_full"
      referencedColumns: ["id"]
    }
                  ]
                },"v_mdm_nhan_su_full": {
                  Row: {
                    "auth_user_id": string | null,"chuc_danh": string | null,"chuc_danh_id": string | null,"chuc_vu": string | null,"chuc_vu_id": string | null,"created_at": string,"email": string | null,"extra_data": Json | null,"gioi_tinh": string | null,"ho_ten": string | null,"id": string,"is_active": boolean,"khoa_id": string | null,"ma_nv": string | null,"ngay_sinh": string | null,"nghe_nghiep_id": string | null,"so_dien_thoai": string | null,"ten_chuc_danh": string | null,"ten_chuc_vu": string | null,"ten_khoa": string | null,"ten_nghe_nghiep": string | null,"ten_to": string | null,"ten_vai_tro": string | null,"to_id": string | null,"updated_at": string,"vai_tro_he_thong_id": string | null,"vai_tro_he_thong_ksnk": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_danh_id_fkey"
      columns: ["chuc_danh_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_chuc_vu_id_fkey"
      columns: ["chuc_vu_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ho_so_nhan_vien_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_nghe_nghiep_id_fkey"
      columns: ["nghe_nghiep_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_vai_tro_he_thong_id_fkey"
      columns: ["vai_tro_he_thong_id"]
isOneToOne: false
      referencedRelation: "sys_roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mdm_nhan_su_vai_tro_he_thong_id_fkey"
      columns: ["vai_tro_he_thong_id"]
isOneToOne: false
      referencedRelation: "v_sys_role_permissions_matrix"
      referencedColumns: ["role_id"]
    }
                  ]
                },"v_mdm_nhan_su_picker": {
                  Row: {
                    "ho_ten": string | null,"id": string,"is_active": boolean,"khoa_id": string | null,"ma_nv": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "ho_ten"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"khoa_id"?: string | null,"ma_nv"?: string | null
                         }
                        Update: {
                           "ho_ten"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"khoa_id"?: string | null,"ma_nv"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "ho_so_nhan_vien_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    }
                  ]
                },"v_nkbv_su_kien_full": {
                  Row: {
                    "bien_phap_phong_ngua": string | null,"clinical_notes": Json | null,"created_at": string,"gioi_tinh": string | null,"ho_ten_benh_nhan": string,"id": string,"is_active": boolean,"ket_cuc_dieu_tri": string | null,"khoa_ghi_nhan_id": string | null,"khoa_ma": string | null,"khoa_ten": string | null,"lo_tiet_khuan_id": string | null,"loai_benh_pham": string | null,"loai_ma": string | null,"loai_nkbv_id": string,"loai_ten": string | null,"ly_do_loai_tru": string | null,"ly_do_tu_vong": string | null,"ma_benh_an": string | null,"ma_benh_nhan": string,"ma_benh_pham": string | null,"ma_ca": string,"ma_cycle_qr_lien_quan": string | null,"ngay_phat_hien": string,"ngay_ra_vien": string | null,"ngay_sinh": string | null,"ngay_vao_vien": string | null,"nguoi_ghi_id": string | null,"quy_trinh_id": string | null,"so_luong": string | null,"tac_nhan_vi_khuan": string | null,"tom_tat_dien_bien": string | null,"trang_thai_id": string,"trang_thai_ma": string | null,"trang_thai_ten": string | null,"tu_vong_lien_quan_nkbv": boolean | null,"updated_at": string,"verification_data": Json | null,"vi_sinh_record_id": string | null,"vi_tri_nhiem_khuan": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fact_nkbv_su_kien_khoa_ghi_nhan_fkey"
      columns: ["khoa_ghi_nhan_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_loai_nkbv_fkey"
      columns: ["loai_nkbv_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_ma_benh_an_fkey"
      columns: ["ma_benh_an"]
isOneToOne: false
      referencedRelation: "nkbv_fact_benh_an"
      referencedColumns: ["ma_benh_an"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_nguoi_ghi_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_nguoi_ghi_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_nguoi_ghi_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_nguoi_ghi_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_nguoi_ghi_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_nguoi_ghi_fkey"
      columns: ["nguoi_ghi_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_trang_thai_fkey"
      columns: ["trang_thai_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_vi_sinh_record_fkey"
      columns: ["vi_sinh_record_id"]
isOneToOne: false
      referencedRelation: "nkbv_fact_vi_sinh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_nkbv_su_kien_vi_sinh_record_fkey"
      columns: ["vi_sinh_record_id"]
isOneToOne: false
      referencedRelation: "v_nkbv_vi_sinh_chua_phan_tich"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nkbv_fact_su_kien_lo_tiet_khuan_id_fkey"
      columns: ["lo_tiet_khuan_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_lo_tiet_khuan"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nkbv_fact_su_kien_quy_trinh_id_fkey"
      columns: ["quy_trinh_id"]
isOneToOne: false
      referencedRelation: "cssd_fact_quy_trinh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nkbv_fact_su_kien_quy_trinh_id_fkey"
      columns: ["quy_trinh_id"]
isOneToOne: false
      referencedRelation: "v_cssd_quy_trinh_full"
      referencedColumns: ["id"]
    }
                  ]
                },"v_nkbv_vi_sinh_chua_phan_tich": {
                  Row: {
                    "id": string,"ma_benh_an": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_qlcv_cong_viec_full": {
                  Row: {
                    "analytics_meta": NonNullable<Json>,"checklist": NonNullable<Json>,"created_at": string | null,"dia_diem_khoa_id": string | null,"dia_diem_khoa_ids": (string)[],"dia_diem_khoa_ma": string | null,"dia_diem_khoa_ten": string | null,"dinh_ky_mau_id": string | null,"gio_bat_dau": string | null,"gio_ket_thuc": string | null,"han_hoan_thanh": string | null,"id": string,"is_active": boolean | null,"is_qua_han": boolean | null,"loai_cong_viec": string,"mo_ta": string | null,"muc_do_uu_tien": string | null,"ngay_thuc_hien": string | null,"nguoi_giao_ten": string | null,"nguoi_giao_viec_id": string | null,"nguoi_phoi_hop_ids": (string)[],"nguoi_phu_trach_id": string | null,"nguoi_phu_trach_ten": string | null,"nguoi_tao_id": string | null,"nguoi_tao_ten": string | null,"nguoi_theo_doi_ids": (string)[],"nguon_lien_ket": Json | null,"nhat_ky": NonNullable<Json>,"nhiem_vu_id": string | null,"nhiem_vu_ten": string | null,"nhom_chuyen_mon_id": string | null,"nhom_chuyen_mon_ten": string | null,"phan_tram_hoan_thanh": number | null,"ten_loai_cong_viec": string | null,"ten_trang_thai_hien_thi": string | null,"tieu_de": string,"to_cong_tac_id": string | null,"to_cong_tac_ten": string | null,"trang_thai": string,"trang_thai_mau_sac": string | null,"updated_at": string | null,"vi_tri_thuc_hien": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fact_cong_viec_dinh_ky_mau_fk"
      columns: ["dinh_ky_mau_id"]
isOneToOne: false
      referencedRelation: "qlcv_fact_cong_viec_dinh_ky"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_cong_viec_dia_diem_khoa_id_fkey"
      columns: ["dia_diem_khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_cong_viec_nhiem_vu_id_fkey"
      columns: ["nhiem_vu_id"]
isOneToOne: false
      referencedRelation: "qlcv_fact_nhiem_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_cong_viec_nhom_chuyen_mon_id_fkey"
      columns: ["nhom_chuyen_mon_id"]
isOneToOne: false
      referencedRelation: "qlcv_dm_nhom_chuyen_mon"
      referencedColumns: ["id"]
    }
                  ]
                },"v_qlcv_cong_viec_qua_han": {
                  Row: {
                    "analytics_meta": NonNullable<Json>,"checklist": NonNullable<Json>,"created_at": string | null,"dia_diem_khoa_id": string | null,"dia_diem_khoa_ma": string | null,"dia_diem_khoa_ten": string | null,"dinh_ky_mau_id": string | null,"gio_bat_dau": string | null,"gio_ket_thuc": string | null,"han_hoan_thanh": string | null,"id": string,"is_active": boolean | null,"is_qua_han": boolean | null,"loai_cong_viec": string,"mo_ta": string | null,"muc_do_uu_tien": string | null,"ngay_thuc_hien": string | null,"nguoi_giao_ten": string | null,"nguoi_giao_viec_id": string | null,"nguoi_phoi_hop_ids": (string)[],"nguoi_phu_trach_id": string | null,"nguoi_phu_trach_ten": string | null,"nguoi_tao_id": string | null,"nguoi_tao_ten": string | null,"nguoi_theo_doi_ids": (string)[],"nguon_lien_ket": Json | null,"nhat_ky": NonNullable<Json>,"nhiem_vu_id": string | null,"nhiem_vu_ten": string | null,"phan_tram_hoan_thanh": number | null,"ten_loai_cong_viec": string | null,"ten_trang_thai_hien_thi": string | null,"tieu_de": string,"to_cong_tac_id": string | null,"to_cong_tac_ten": string | null,"trang_thai": string,"trang_thai_mau_sac": string | null,"updated_at": string | null,"vi_tri_thuc_hien": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fact_cong_viec_dinh_ky_mau_fk"
      columns: ["dinh_ky_mau_id"]
isOneToOne: false
      referencedRelation: "qlcv_fact_cong_viec_dinh_ky"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_giao_viec_id_fkey"
      columns: ["nguoi_giao_viec_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_phu_trach_id_fkey"
      columns: ["nguoi_phu_trach_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "mdm_nhan_su"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_auth_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_full"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_mdm_nhan_su_picker"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_sys_staff_auth_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_nguoi_tao_id_fkey"
      columns: ["nguoi_tao_id"]
isOneToOne: false
      referencedRelation: "v_sys_user_permissions"
      referencedColumns: ["staff_id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_may"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_loai_su_co"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "cssd_dm_tram"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_cach_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_hinh_thuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "gstt_dm_khu_vuc_giam_sat"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_danh"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_chuc_vu"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoi_khoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_nghe_nghiep"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_to_cong_tac"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_loai"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "nkbv_dm_trang_thai_ca"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fact_cong_viec_to_cong_tac_id_fkey"
      columns: ["to_cong_tac_id"]
isOneToOne: false
      referencedRelation: "sys_lookup_value"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_cong_viec_dia_diem_khoa_id_fkey"
      columns: ["dia_diem_khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "qlcv_fact_cong_viec_nhiem_vu_id_fkey"
      columns: ["nhiem_vu_id"]
isOneToOne: false
      referencedRelation: "qlcv_fact_nhiem_vu"
      referencedColumns: ["id"]
    }
                  ]
                },"v_sys_role_permissions_matrix": {
                  Row: {
                    "permission_ids": (string)[] | null,"role_id": string,"role_name": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_sys_staff_auth_overview": {
                  Row: {
                    "auth_user_id": string | null,"email": string | null,"ho_ten": string | null,"id": string,"is_active": boolean,"ma_nv": string | null,"role_names": (string)[] | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_sys_user_permissions": {
                  Row: {
                    "auth_user_id": string | null,"email": string | null,"ho_ten": string | null,"is_active": boolean,"khoa_id": string | null,"ma_khoa_phong": string | null,"ma_nv": string | null,"permissions": Json | null,"roles": Json | null,"staff_id": string,"ten_khoa_phong": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "ho_so_nhan_vien_khoa_id_fkey"
      columns: ["khoa_id"]
isOneToOne: false
      referencedRelation: "mdm_dm_khoa_phong"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "bv103_norm_label":
{ Args: { "p": string }; Returns: string
                           },
"cssd_su_co_counts_for_red_alert":
{ Args: { "p_attributes": Json,"p_include_draft"?: boolean,"p_is_active": boolean }; Returns: boolean
                           },
"fn_admin_module_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"fn_cssd_append_chi_tiet_issue_note":
{ Args: { "p_chi_tiet_id": string,"p_issue_type": string,"p_note": string,"p_quantity": number }; Returns: undefined
                           },
"fn_cssd_apply_bom_lines_tx":
{ Args: { "p_approver_auth_user_id": string,"p_approver_is_admin"?: boolean,"p_incident_id": string }; Returns: Json
                           },
"fn_cssd_apply_bom_plan_tx":
{ Args: { "p_bo_id": string,"p_now"?: string,"p_writes": Json }; Returns: Json
                           },
"fn_cssd_apply_instrument_ledger_tx":
{ Args: { "p_bo_dung_cu_id": string,"p_bo_dung_cu_id_den": string,"p_chi_tiet_id": string,"p_ghi_chu": string,"p_issue_type": string,"p_loai_dung_cu_id": string,"p_loai_giao_dich": string,"p_ma_qr_den": string,"p_ma_qr_nguon": string,"p_nguoi_thuc_hien_id": string,"p_quy_trinh_id": string,"p_so_luong_thay_doi": number,"p_su_co_id": string,"p_ten_dung_cu_le": string }; Returns: undefined
                           },
"fn_cssd_apply_instrument_lines_tx":
{ Args: { "p_attributes": Json,"p_bo_dung_cu_id": string,"p_lines": Json,"p_nguoi_thuc_hien_id": string,"p_su_co_id": string,"p_touch_ngay_kiem_ke": boolean }; Returns: Json
                           },
"fn_cssd_assert_ledger_write":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"fn_cssd_bo_chi_tiet_hieu_luc":
{ Args: { "p_bo_id": string,"p_loai_dung_cu_id": string }; Returns: string
                           },
"fn_cssd_bo_tong_id":
{ Args: { "p_bo_id": string }; Returns: string
                           },
"fn_cssd_check_set_heat_resistance":
{ Args: { "p_bo_dung_cu_id": string }; Returns: Json
                           },
"fn_cssd_cycle_used_clinically":
{ Args: { "p_meta": Json }; Returns: boolean
                           },
"fn_cssd_dong_bo_tach_nhiet":
{ Args: { "p_bo_tong_id": string }; Returns: Json
                           },
"fn_cssd_dong_bo_tach_nhiet_core":
{ Args: { "p_bo_tong_id": string,"p_chi_vo_hieu"?: boolean }; Returns: Json
                           },
"fn_cssd_ensure_bom_lines":
{ Args: { "p_quy_trinh_id": string }; Returns: undefined
                           },
"fn_cssd_ensure_chi_tiet_for_ledger":
{ Args: { "p_bo_dung_cu_id": string,"p_loai_dung_cu_id": string,"p_ten_dung_cu_le": string }; Returns: undefined
                           },
"fn_cssd_gen_cycle_qr":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"fn_cssd_hoa_chat_approver_count":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"fn_cssd_hoa_chat_is_approver":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"fn_cssd_kho_lock":
{ Args: { "p_bo_dung_cu_id": string,"p_loai_dung_cu_id": string }; Returns: undefined
                           },
"fn_cssd_me_assert_bd_dau_ngay":
{ Args: { "p_thiet_bi_id": string }; Returns: undefined
                           },
"fn_cssd_me_assert_nha_implant":
{ Args: { "p_actor_user_id": string }; Returns: undefined
                           },
"fn_cssd_me_bi_bm02_hop_le":
{ Args: { "p_bi": Json,"p_ket_qua": string }; Returns: undefined
                           },
"fn_cssd_me_chuyen_bo_kho_vo_khuan":
{ Args: { "p_ids": (string)[],"p_me_id": string,"p_nguoi_nhan_su_id": string,"p_now": string }; Returns: number
                           },
"fn_cssd_me_la_bo_me_sub":
{ Args: { "p_ma_vai_tro": string,"p_quy_trinh_id": string }; Returns: boolean
                           },
"fn_cssd_me_ly_do_chan_nhiet":
{ Args: { "p_bo_id": string }; Returns: string
                           },
"fn_cssd_me_ly_do_lech_phuong_phap":
{ Args: { "p_bo_id": string,"p_chuong_trinh"?: string,"p_phuong_phap": string }; Returns: string
                           },
"fn_cssd_me_may_la_hoi_nuoc":
{ Args: { "p_thiet_bi_id": string }; Returns: boolean
                           },
"fn_cssd_me_nguoi_thao_tac":
{ Args: { "p_actor_user_id": string }; Returns: string
                           },
"fn_cssd_me_nhat_ky_them":
{ Args: { "p_chi_tiet"?: Json,"p_me_id": string,"p_nhan_su_id": string,"p_su_kien": string }; Returns: undefined
                           },
"fn_cssd_me_phuong_phap":
{ Args: { "p_thiet_bi_id": string }; Returns: string
                           },
"fn_cssd_nhat_ky_dong":
{ Args: { "p_chi_tiet"?: Json,"p_nguon"?: string,"p_nhan_su_id": string,"p_su_kien": string,"p_tram": string }; Returns: Json
                           },
"fn_cssd_nhat_ky_them":
{ Args: { "p_chi_tiet"?: Json,"p_nguon"?: string,"p_nhan_su_id": string,"p_quy_trinh_id": string,"p_su_kien": string,"p_tram": string }; Returns: undefined
                           },
"fn_cssd_operator_nhan_su_id":
{ Args: { "p_label": string }; Returns: string
                           },
"fn_cssd_resolve_active_quy_trinh_id":
{ Args: { "p_ma_qr": string }; Returns: string
                           },
"fn_cssd_resolve_ledger_actor":
{ Args: { "p_fallback": string }; Returns: string
                           },
"fn_cssd_set_thuc_te":
{ Args: { "p_bo_dung_cu_id": string,"p_loai_dung_cu_id": string }; Returns: number
                           },
"fn_cssd_tinh_trang_goi_xau":
{ Args: { "p_tinh": string }; Returns: boolean
                           },
"fn_cssd_transfer_bom_metadata":
{ Args: { "p_den_id": string,"p_qty": number,"p_ten": string,"p_tu_id": string }; Returns: undefined
                           },
"fn_cssd_transfer_bom_metadata_by_id":
{ Args: { "p_chi_tiet_tu_id": string,"p_den_id": string,"p_loai_dung_cu_id": string,"p_qty": number,"p_ten": string,"p_tu_id": string }; Returns: undefined
                           },
"fn_get_session_stype":
{ Args: { "p_nguoi_giam_sat_id": string,"p_target_khoa_id": string }; Returns: string
                           },
"fn_gsc_expand_session_results_for_tc":
{ Args: { "p_results": Json }; Returns: {
              "merge_applied": boolean,"resolved_criterion_id": string,"source_criterion_id": string,"value": string
            }[]
                           },
"fn_gsc_resolve_criterion_id":
{ Args: { "p_criterion_id": string }; Returns: string
                           },
"fn_gsc_resolve_criterion_label":
{ Args: { "p_criterion_id": string }; Returns: string
                           },
"fn_gstt_ke_hoach_tien_do":
{ Args: { "p_chi_tieu"?: number,"p_loai": string,"p_thang": string }; Returns: {
              "chi_tieu": number,"dat": boolean,"khoa_id": string,"so_phien": number,"ty_le_hoan_thanh": number
            }[]
                           },
"fn_ksnk_tham_so":
{ Args: { "p_ma": string,"p_ngay"?: string }; Returns: number
                           },
"fn_nkbv_actor_khoa_ma_benh_an_set":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"fn_nkbv_actor_khoa_restricted":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"fn_nkbv_ba_hub":
{ Args: { "p_ma_benh_an": string }; Returns: Json
                           },
"fn_nkbv_ba_keys_chua_phan_tich":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"fn_nkbv_dich_te_hoc_rates":
{ Args: { "p_den_ngay": string,"p_khoa_id"?: string,"p_tu_ngay": string }; Returns: {
              "cauti_rate_per_1000": number,"cauti_sir": number,"clabsi_rate_per_1000": number,"clabsi_sir": number,"cvc_dur": number,"cvc_sur": number,"foley_dur": number,"foley_sur": number,"khoa_id": string,"ma_khoa": string,"mbi_lcbi_rate_per_1000": number,"obs_cauti_cases": number,"obs_clabsi_cases": number,"obs_cvc_days": number,"obs_emv_episodes": number,"obs_foley_days": number,"obs_mbi_lcbi_cases": number,"obs_patient_days": number,"obs_ssi_cases": number,"obs_total_surgeries": number,"obs_vae_cases": number,"obs_vap_cases": number,"obs_vent_days": number,"ssi_raw_rate": number,"ssi_sir": number,"ten_khoa": string,"vae_rate_per_100_emv": number,"vae_rate_per_1000": number,"vae_sir": number,"vap_rate_per_1000": number,"vent_dur": number,"vent_sur": number
            }[]
                           },
"fn_nkbv_major_type_from_classification":
{ Args: { "p_classification": string }; Returns: string
                           },
"fn_nkbv_norm_vi_sinh_id":
{ Args: { "p": string }; Returns: string
                           },
"fn_nkbv_ssi_rates_by_surgery":
{ Args: { "p_den_ngay": string,"p_tu_ngay": string }; Returns: {
              "expected_ssi_cases": number,"loai_phau_thuat_nhsn": string,"obs_ssi_cases": number,"ssi_raw_rate": number,"ssi_sir": number,"total_surgeries": number
            }[]
                           },
"fn_qlcv_actor_is_ksnk":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"fn_qlcv_append_nhat_ky":
{ Args: { "p_cong_viec_id": string,"p_loai_hoat_dong": string,"p_nguoi_thuc_hien_id": string,"p_noi_dung"?: string,"p_phan_tram_hoan_thanh"?: number,"p_trang_thai"?: string }; Returns: Json
                           },
"fn_qlcv_can_read_fact":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"fn_qlcv_get_actor_khoa_id":
{ Args: { "p_nhan_su_id": string }; Returns: string
                           },
"fn_qlcv_ksnk_khoa_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"fn_qlcv_mo_ta_to_checklist":
{ Args: { "p_mo_ta": string }; Returns: Json
                           },
"fn_qlcv_today_vn":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"fn_qlcv_transition":
{ Args: { "p_action": string,"p_actor_nhan_su_id": string,"p_cong_viec_id": string,"p_ly_do"?: string,"p_patch"?: Json }; Returns: Json
                           },
"fn_qlcv_update_checklist":
{ Args: { "p_checklist": Json,"p_cong_viec_id": string,"p_phan_tram_hoan_thanh"?: number,"p_trang_thai_ma"?: string }; Returns: Json
                           },
"fn_require_cssd_workflow_edit":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"fn_require_gstt_analytics_access":
{ Args: { "p_module": string }; Returns: undefined
                           },
"fn_session_analytics_stype":
{ Args: { "p_hinh_thuc_id": string,"p_nguoi_giam_sat_id": string,"p_target_khoa_id": string }; Returns: string
                           },
"fn_stype_from_hinh_thuc_id":
{ Args: { "p_hinh_thuc_id": string }; Returns: string
                           },
"fn_sync_overdue_tasks":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"fn_sys_actor_has_permission":
{ Args: { "p_action": string,"p_actor_user_id": string,"p_module": string }; Returns: boolean
                           },
"fn_sys_actor_khoa_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"fn_sys_actor_nhan_su_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"fn_sys_attach_admin_rls":
{ Args: { "p_module": string,"p_table": unknown }; Returns: undefined
                           },
"fn_sys_has_permission":
{ Args: { "p_action": string,"p_module": string }; Returns: boolean
                           },
"fn_sys_has_role":
{ Args: { "p_role": string }; Returns: boolean
                           },
"fn_sys_is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"fn_sys_tai_khoan_mang_vai_admin":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"fn_vst_is_valid_opportunity":
{ Args: { "p_hanh_dong": string,"p_thoi_diem": string }; Returns: boolean
                           },
"is_admin_user":
{ Args: { "p_user_id"?: string }; Returns: boolean
                           },
"mdm_refresh_governance_suggestions":
{ Args: Record<PropertyKey, never>; Returns: {
              "inserted_count": number
            }[]
                           },
"rpc_assign_staff_ksnk_role":
{ Args: { "p_role_name": string,"p_staff_id": string }; Returns: Json
                           },
"rpc_cssd_apply_incident_void":
{ Args: { "p_attributes": Json,"p_deactivate_ledger_ids": (string)[],"p_event": Json,"p_expected_status"?: string,"p_expected_tram_id"?: string,"p_kho_delta": Json,"p_quy_trinh_id": string,"p_quy_trinh_patch": Json,"p_su_co_id": string }; Returns: Json
                           },
"rpc_cssd_apply_instrument_ledger":
{ Args: { "p_bo_dung_cu_id": string,"p_bo_dung_cu_id_den"?: string,"p_ghi_chu"?: string,"p_loai_dung_cu_id": string,"p_loai_giao_dich": string,"p_nguoi_thuc_hien_id"?: string,"p_quy_trinh_id": string,"p_so_luong_thay_doi": number,"p_su_co_id": string }; Returns: Json
                           },
"rpc_cssd_apply_instrument_lines":
{ Args: { "p_attributes"?: Json,"p_bo_dung_cu_id"?: string,"p_lines": Json,"p_nguoi_thuc_hien_id"?: string,"p_su_co_id": string,"p_touch_ngay_kiem_ke"?: boolean }; Returns: Json
                           },
"rpc_cssd_assign_cycle_qr":
{ Args: { "p_quy_trinh_id": string }; Returns: Json
                           },
"rpc_cssd_assign_cycle_qr_impl":
{ Args: { "p_quy_trinh_id": string }; Returns: Json
                           },
"rpc_cssd_bao_tri_bat_dau":
{ Args: { "p_actor_user_id": string,"p_checklist"?: Json,"p_loai_phieu"?: string,"p_ly_do": string,"p_ma_phieu"?: string,"p_su_co_id"?: string,"p_thiet_bi_id": string }; Returns: Json
                           },
"rpc_cssd_bao_tri_huy":
{ Args: { "p_actor_user_id": string,"p_id": string }; Returns: Json
                           },
"rpc_cssd_bao_tri_ket_thuc":
{ Args: { "p_actor_user_id": string,"p_checklist"?: Json,"p_id": string,"p_ket_qua": string }; Returns: Json
                           },
"rpc_cssd_cap_phat_commit":
{ Args: { "p_khoa_nhan_id"?: string,"p_ma_ca_mo_id"?: string,"p_nguoi_cap_phat_id"?: string,"p_quy_trinh_id": string }; Returns: Json
                           },
"rpc_cssd_commit_instrument_report":
{ Args: { "p_bo_dung_cu_id"?: string,"p_draft_id": string,"p_lines": Json,"p_nguoi_thuc_hien_id"?: string,"p_su_co": Json,"p_touch_ngay_kiem_ke"?: boolean }; Returns: Json
                           },
"rpc_cssd_decommission_kho_le":
{ Args: { "p_ghi_chu"?: string,"p_loai_dung_cu_id": string,"p_nguoi_thuc_hien_id"?: string,"p_so_luong": number }; Returns: Json
                           },
"rpc_cssd_kho_hoa_chat_duyet_phieu":
{ Args: { "p_actor_user_id": string,"p_giao_dich_id": string,"p_ly_do": string,"p_quyet_dinh": string }; Returns: Json
                           },
"rpc_cssd_kho_hoa_chat_ghi_giao_dich":
{ Args: { "p_actor_user_id": string,"p_dm_hoa_chat_id": string,"p_ghi_chu": string,"p_han_su_dung": string,"p_loai": string,"p_ly_do_xuat"?: string,"p_ma_lo": string,"p_ma_phieu": string,"p_so_luong": number,"p_su_co_id": string }; Returns: string
                           },
"rpc_cssd_kho_hoa_chat_lap_phieu_nguoc":
{ Args: { "p_actor_user_id": string,"p_ly_do": string,"p_phieu_goc_id": string }; Returns: string
                           },
"rpc_cssd_kho_station_counts":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"rpc_cssd_me_add_quy_trinh":
{ Args: { "p_actor_user_id": string,"p_me_id": string,"p_quy_trinh_id": string }; Returns: Json
                           },
"rpc_cssd_me_bat_dau":
{ Args: { "p_actor_user_id": string,"p_me_id": string }; Returns: Json
                           },
"rpc_cssd_me_ghi_cho_bi":
{ Args: { "p_ghi_chu": string,"p_ket_qua_ci": boolean,"p_me_id": string,"p_nguoi_nhan_su_id": string,"p_qc_json": Json }; Returns: Json
                           },
"rpc_cssd_me_ghi_test":
{ Args: { "p_actor_user_id"?: string,"p_chi_tiet"?: Json,"p_ket_qua": string,"p_loai": string,"p_me_id": string }; Returns: Json
                           },
"rpc_cssd_me_ket_luan_dat":
{ Args: { "p_ghi_chu": string,"p_ket_qua_bi": boolean,"p_ket_qua_ci": boolean,"p_me_id": string,"p_nguoi_nhan_su_id": string,"p_qc_json": Json }; Returns: Json
                           },
"rpc_cssd_me_ket_thuc_nap":
{ Args: { "p_actor_user_id"?: string,"p_me_id": string }; Returns: Json
                           },
"rpc_cssd_me_ket_thuc_tiet_khuan":
{ Args: { "p_actor_user_id"?: string,"p_me_id": string }; Returns: Json
                           },
"rpc_cssd_me_nhap_bi_am":
{ Args: { "p_actor_user_id": string,"p_me_id": string,"p_nguoi_nhan_su_id": string,"p_qc_bi_json"?: Json }; Returns: Json
                           },
"rpc_cssd_me_remove_quy_trinh":
{ Args: { "p_actor_user_id": string,"p_me_id": string,"p_quy_trinh_id": string }; Returns: Json
                           },
"rpc_cssd_me_tao":
{ Args: { "p_actor_user_id": string,"p_chuong_trinh"?: string,"p_ghi_chu"?: string,"p_thiet_bi_id": string }; Returns: Json
                           },
"rpc_cssd_me_thu_hoi":
{ Args: { "p_actor_user_id": string,"p_ap_suat"?: number,"p_chuong_trinh"?: string,"p_co_implant"?: boolean,"p_ghi_chu"?: string,"p_ket_qua_bi"?: boolean,"p_ket_qua_ci"?: boolean,"p_ma_qr"?: string,"p_me_id": string,"p_mo_ta": string,"p_mode": string,"p_nguoi_nhan_su_id": string,"p_nhiet_do"?: number,"p_phuong_phap"?: string,"p_qc_json"?: Json,"p_quy_trinh_id"?: string,"p_reporter_email"?: string,"p_thoi_gian_chu_ky"?: number,"p_trang_thai_bi"?: string,"p_type_id": string,"p_type_ten": string }; Returns: Json
                           },
"rpc_cssd_nhat_ky_ghi":
{ Args: { "p_actor_user_id"?: string,"p_chi_tiet"?: Json,"p_nguon"?: string,"p_quy_trinh_id": string,"p_su_kien": string,"p_tram": string }; Returns: Json
                           },
"rpc_cssd_persist_bom_checkpoint":
{ Args: { "p_bom_lines": Json,"p_deltas": Json,"p_do_split": string,"p_operator_id": string,"p_quy_trinh_id": string }; Returns: Json
                           },
"rpc_cssd_persist_bom_checkpoint_impl":
{ Args: { "p_bom_lines": Json,"p_deltas": Json,"p_do_split": string,"p_operator_id": string,"p_quy_trinh_id": string }; Returns: Json
                           },
"rpc_cssd_quy_trinh_append_ngoai_le":
{ Args: { "p_event": Json,"p_id": string }; Returns: undefined
                           },
"rpc_cssd_quy_trinh_metadata_merge":
{ Args: { "p_id": string,"p_patch": Json }; Returns: undefined
                           },
"rpc_cssd_reject_station":
{ Args: { "p_ly_do": string,"p_operator_label"?: string,"p_quy_trinh_id": string }; Returns: Json
                           },
"rpc_cssd_scan_station_commit":
{ Args: { "p_khoa_nhan_id"?: string,"p_ma_ca_mo_id"?: string,"p_ma_qr": string,"p_operator_label"?: string,"p_target_station": string }; Returns: Json
                           },
"rpc_cssd_station_flow_counts":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"rpc_cssd_thiet_bi_me_counts":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"rpc_cssd_tra_lui_mot_buoc":
{ Args: { "p_actor_user_id"?: string,"p_ly_do": string,"p_ma_qr"?: string,"p_nguoi_thao_tac"?: string,"p_quy_trinh_id": string,"p_tu_tram": string }; Returns: Json
                           },
"rpc_cssd_waiting_tiep_nhan":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_search"?: string }; Returns: {
              "id": string,"ma_bo": string,"ten_bo": string,"updated_at": string
            }[]
                           },
"rpc_ctyt_dovai_thong_ke_ky":
{ Args: { "p_den_ngay": string,"p_tu_ngay": string }; Returns: Json
                           },
"rpc_dao_tao_tao_luot_thi_that":
{ Args: { "p_auth_user_id": string,"p_bat_dau_luc": string,"p_cau_hinh_id": string,"p_de_snapshot": Json,"p_form_thong_tin": Json,"p_han_nop_luc": string,"p_quota_report": Json,"p_seed": string,"p_so_cau": number,"p_thoi_gian_phut": number }; Returns: Json
                           },
"rpc_dashboard_gsc_strategic_analytics":
{ Args: { "p_bang_kiem_mas"?: (string)[],"p_den_ngay": string,"p_hinh_thuc_ids"?: (string)[],"p_khoa_ids"?: (string)[],"p_khoi_ids"?: (string)[],"p_khu_vuc_ids"?: (string)[],"p_nghe_nghiep_ids"?: (string)[],"p_tu_ngay": string }; Returns: Json
                           },
"rpc_dashboard_gsc_strategic_analytics_impl":
{ Args: { "p_bang_kiem_mas"?: (string)[],"p_den_ngay": string,"p_hinh_thuc_ids"?: (string)[],"p_khoa_ids"?: (string)[],"p_khoi_ids"?: (string)[],"p_khu_vuc_ids"?: (string)[],"p_nghe_nghiep_ids"?: (string)[],"p_tu_ngay": string }; Returns: Json
                           },
"rpc_dashboard_vst_strategic_analytics":
{ Args: { "p_den_ngay": string,"p_hinh_thuc_ids"?: (string)[],"p_khoa_ids"?: (string)[],"p_khoi_ids"?: (string)[],"p_khu_vuc_ids"?: (string)[],"p_nghe_nghiep_ids"?: (string)[],"p_tu_ngay": string }; Returns: Json
                           },
"rpc_dashboard_vst_strategic_analytics_impl":
{ Args: { "p_den_ngay": string,"p_hinh_thuc_ids"?: (string)[],"p_khoa_ids"?: (string)[],"p_khoi_ids"?: (string)[],"p_khu_vuc_ids"?: (string)[],"p_nghe_nghiep_ids"?: (string)[],"p_tu_ngay": string }; Returns: Json
                           },
"rpc_dm_bang_kiem_max_numeric_suffix":
{ Args: { "p_prefix": string }; Returns: number
                           },
"rpc_get_compliance_dashboard_v4":
{ Args: { "p_den_ngay": string,"p_khoa_id"?: string,"p_tu_ngay": string }; Returns: Json
                           },
"rpc_get_dashboard_ksnk_staff_supervision_stats":
{ Args: { "p_den_ngay": string,"p_khoa_ids"?: (string)[],"p_khoi_ids"?: (string)[],"p_khu_vuc_ids"?: (string)[],"p_nghe_nghiep_ids"?: (string)[],"p_tu_ngay": string }; Returns: Json
                           },
"rpc_get_registry_options":
{ Args: { "p_categories": (string)[] }; Returns: Json
                           },
"rpc_gsc_checklist_detail":
{ Args: { "p_den_ngay": string,"p_hinh_thuc_ids"?: (string)[],"p_khoa_ids"?: (string)[],"p_khoi_ids"?: (string)[],"p_khu_vuc_ids"?: (string)[],"p_ma_bk": string,"p_nghe_nghiep_ids"?: (string)[],"p_tu_ngay": string }; Returns: Json
                           },
"rpc_gsc_checklist_detail_impl":
{ Args: { "p_den_ngay": string,"p_hinh_thuc_ids"?: (string)[],"p_khoa_ids"?: (string)[],"p_khoi_ids"?: (string)[],"p_khu_vuc_ids"?: (string)[],"p_ma_bk": string,"p_nghe_nghiep_ids"?: (string)[],"p_tu_ngay": string }; Returns: Json
                           },
"rpc_gsc_compare_matrices":
{ Args: { "p_bang_kiem_mas"?: (string)[],"p_den_ngay": string,"p_hinh_thuc_ids"?: (string)[],"p_khoa_ids"?: (string)[],"p_khoi_ids"?: (string)[],"p_khu_vuc_ids"?: (string)[],"p_nghe_nghiep_ids"?: (string)[],"p_tu_ngay": string }; Returns: Json
                           },
"rpc_gsc_compare_matrices_impl":
{ Args: { "p_bang_kiem_mas"?: (string)[],"p_den_ngay": string,"p_hinh_thuc_ids"?: (string)[],"p_khoa_ids"?: (string)[],"p_khoi_ids"?: (string)[],"p_khu_vuc_ids"?: (string)[],"p_nghe_nghiep_ids"?: (string)[],"p_tu_ngay": string }; Returns: Json
                           },
"rpc_gsc_tgs_session_hits":
{ Args: { "p_den_ngay": string,"p_khoa_id"?: string,"p_tu_ngay": string }; Returns: {
              "bang_kiem_id": string,"khoa_id": string,"session_id": string
            }[]
                           },
"rpc_gstt_dm_bang_kiem_max_numeric_suffix":
{ Args: { "p_prefix": string }; Returns: number
                           },
"rpc_mdm_nhan_su_max_numeric_suffix":
{ Args: { "p_prefix": string }; Returns: number
                           },
"rpc_nkbv_replace_ba_phan_tich_sessions":
{ Args: { "p_analysis_mode": string,"p_ma_benh_an": string,"p_rows": Json }; Returns: Json
                           },
"rpc_nkbv_tham_dinh_ca":
{ Args: { "p_actor_user_id": string,"p_decision": string,"p_id": string,"p_ly_do": string,"p_notes_patch": Json }; Returns: string
                           },
"rpc_qlcv_board_counts":
{ Args: { "p_actor_staff_id"?: string }; Returns: Json
                           },
"rpc_save_rbac_matrix":
{ Args: { "p_rows": Json }; Returns: Json
                           },
"rpc_scan_workflow_station":
{ Args: { "p_ma_qr": string,"p_operator_label"?: string,"p_target_station": string }; Returns: Json
                           },
"rpc_scan_workflow_station_impl":
{ Args: { "p_ma_qr": string,"p_operator_label"?: string,"p_target_station": string }; Returns: Json
                           },
"rpc_vst_compare_matrices":
{ Args: { "p_den_ngay": string,"p_hinh_thuc_ids"?: (string)[],"p_khoa_ids"?: (string)[],"p_khoi_ids"?: (string)[],"p_khu_vuc_ids"?: (string)[],"p_nghe_nghiep_ids"?: (string)[],"p_tu_ngay": string }; Returns: Json
                           },
"rpc_vst_compare_matrices_impl":
{ Args: { "p_den_ngay": string,"p_hinh_thuc_ids"?: (string)[],"p_khoa_ids"?: (string)[],"p_khoi_ids"?: (string)[],"p_khu_vuc_ids"?: (string)[],"p_nghe_nghiep_ids"?: (string)[],"p_tu_ngay": string }; Returns: Json
                           },
"rpc_vst_save_session":
{ Args: { "p_observations": Json,"p_session": Json,"p_session_id": string }; Returns: Json
                           },
"unaccent":
{ Args: { "": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
