/**
 * Nguyên tử bằng chứng Chương 17 — key ổn định cho flags / UI / engine.
 */

export type Ch17EvidenceGroup =
  | "symptom"
  | "micro"
  | "pathology"
  | "imaging"
  | "lab"
  | "serology"
  | "clinical_note"
  | "other";

export type Ch17EvidenceDef = {
  key: string;
  label_vi: string;
  group: Ch17EvidenceGroup;
};

const E = (
  key: string,
  label_vi: string,
  group: Ch17EvidenceGroup,
): Ch17EvidenceDef => ({ key, label_vi, group });

/** Catalog vận hành Phase A–B (16 loại Phần II). */
export const CH17_EVIDENCE_CATALOG: readonly Ch17EvidenceDef[] = [
  // Shared
  E("sx_fever_gt38", "Sốt > 38,0°C", "symptom"),
  E("sx_hypothermia_lt36", "Hạ thân nhiệt < 36,0°C", "symptom"),
  E("sx_apnea", "Ngưng thở", "symptom"),
  E("sx_bradycardia", "Nhịp tim chậm", "symptom"),
  E("micro_blood_positive", "Cấy máu / NCT máu dương tính", "micro"),
  E("abx_note_site_specific", "Ghi chép điều trị kháng sinh đặc hiệu tổn thương", "clinical_note"),
  E("img_equivocal", "Hình ảnh học mập mờ (equivocal)", "imaging"),

  // BONE
  E("micro_bone_tissue", "Phân lập VSV từ mô/mảnh xương (cấy/NCT)", "micro"),
  E("path_osteomyelitis", "GPB / đại thể viêm xương tủy", "pathology"),
  E("sx_bone_swelling", "Sưng nề tại chỗ xương", "symptom"),
  E("sx_bone_pain", "Đau / tăng cảm giác đau khu trú xương", "symptom"),
  E("sx_bone_warmth", "Nóng khu trú vùng da phía trên xương", "symptom"),
  E("sx_bone_drainage", "Chảy dịch tự nhiên từ vị trí xương", "symptom"),
  E("img_bone_definitive", "CĐHA khẳng định viêm xương tủy", "imaging"),

  // DISC
  E("micro_disc_space", "Phân lập VSV từ khoang đĩa đệm", "micro"),
  E("path_disc_infection", "GPB / đại thể nhiễm trùng khoang đĩa đệm", "pathology"),
  E("sx_disc_pain", "Đau khu trú khoang đĩa đệm", "symptom"),
  E("img_disc_definitive", "CĐHA khẳng định nhiễm trùng đĩa đệm", "imaging"),

  // JNT
  E("micro_joint_fluid_or_synovium", "Phân lập VSV từ dịch khớp / sinh thiết màng hoạt dịch", "micro"),
  E("path_joint_infection", "GPB / đại thể nhiễm trùng khớp / bao hoạt dịch", "pathology"),
  E("sx_joint_suspect", "Nghi ngờ nhiễm trùng khớp", "symptom"),
  E("sx_joint_swelling", "Sưng khớp", "symptom"),
  E("sx_joint_pain", "Đau / tăng cảm giác đau khớp", "symptom"),
  E("sx_joint_warmth", "Nóng khớp", "symptom"),
  E("sx_joint_effusion", "Tràn dịch khớp", "symptom"),
  E("sx_joint_limited_rom", "Hạn chế vận động khớp", "symptom"),
  E("lab_synovial_wbc_or_le_pos", "WBC dịch khớp tăng hoặc LE dịch khớp (+)", "lab"),
  E("micro_joint_gram_wbc", "Gram dịch khớp: VSV + bạch cầu", "micro"),
  E("img_joint_definitive", "CĐHA khẳng định nhiễm trùng khớp", "imaging"),

  // PJI
  E("micro_pji_two_matching", "≥2 mẫu quanh khớp cùng loài (match)", "micro"),
  E("sx_pji_sinus_tract", "Đường rò thông trực tiếp với ổ khớp nhân tạo", "symptom"),
  E("lab_crp_gt100_and_esr_gt30", "CRP >100 mg/L AND ESR >30 mm/giờ", "lab"),
  E("lab_synovial_wbc_gt10k_or_le_pp", "WBC dịch khớp >10.000 hoặc LE ≥ ++", "lab"),
  E("lab_synovial_pmn_gt90", "PMN% dịch khớp >90%", "lab"),
  E("path_pji_pmn_gt5_hpf", "GPB quanh khớp: >5 PMN/HPF", "pathology"),
  E("micro_pji_single_positive", "Một mẫu quanh khớp đơn độc dương tính", "micro"),

  // IC
  E("micro_brain_or_dura", "Phân lập VSV từ mô não / màng cứng", "micro"),
  E("path_ic_abscess", "GPB / đại thể áp xe hoặc nhiễm trùng nội sọ", "pathology"),
  E("sx_headache", "Đau đầu", "symptom"),
  E("sx_dizziness", "Chóng mặt", "symptom"),
  E("sx_focal_neuro", "Dấu thần kinh định vị khu trú", "symptom"),
  E("sx_altered_consciousness", "Thay đổi mức độ ý thức", "symptom"),
  E("sx_confusion", "Lú lẫn", "symptom"),
  E("sx_infant_irritability", "Kích thích / bú kém / ngủ lịm (≤1 tuổi)", "symptom"),
  E("micro_brain_direct_smear", "Soi trực tiếp mô não / dịch hút áp xe thấy VSV", "micro"),
  E("img_ic_definitive", "CĐHA khẳng định nhiễm trùng nội sọ", "imaging"),
  E("sero_igm_or_igg4x", "IgM đặc hiệu hoặc tăng 4 lần IgG huyết thanh kép", "serology"),

  // MEN
  E("micro_csf_positive", "Phân lập VSV từ CSF (cấy/NCT)", "micro"),
  E("sx_meningitis_suspect", "Nghi ngờ viêm màng não", "symptom"),
  E("sx_meningeal_signs", "Dấu hiệu kích thích màng não", "symptom"),
  E("sx_cranial_nerve", "Dấu tổn thương dây thần kinh sọ", "symptom"),
  E("lab_csf_abnormal_triad", "CSF: tăng BC + tăng protein + giảm glucose", "lab"),
  E("micro_csf_gram_positive", "Nhuộm Gram CSF dương tính", "micro"),

  // SA
  E("micro_spinal_abscess", "Phân lập VSV từ ổ áp xe / dịch ngoài màng cứng tủy", "micro"),
  E("path_spinal_abscess", "GPB / đại thể áp xe tủy sống", "pathology"),
  E("sx_back_pain", "Đau / tăng cảm giác đau vùng lưng", "symptom"),
  E("sx_radiculitis", "Viêm rễ thần kinh", "symptom"),
  E("sx_paraparesis", "Liệt nửa người dưới", "symptom"),
  E("sx_paraplegia", "Liệt hai chi dưới", "symptom"),
  E("img_sa_definitive", "CĐHA khẳng định áp xe / nhiễm trùng ngoài màng cứng tủy", "imaging"),

  // CARD
  E("micro_pericardium", "Phân lập VSV từ mô / dịch màng ngoài tim", "micro"),
  E("sx_chest_pain", "Đau ngực", "symptom"),
  E("sx_paradoxical_pulse", "Mạch nghịch thường", "symptom"),
  E("sx_enlarged_cardiac_silhouette", "Tăng kích thước bóng tim", "symptom"),
  E("lab_ekg_typical", "Điện tâm đồ biến đổi điển hình", "lab"),
  E("path_myocardium", "GPB mô tim dương tính", "pathology"),
  E("img_pericardial_effusion", "Tràn dịch màng ngoài tim trên CĐHA", "imaging"),

  // MED
  E("micro_mediastinum", "Phân lập VSV từ mô / dịch trung thất", "micro"),
  E("path_mediastinitis", "GPB / đại thể viêm trung thất", "pathology"),
  E("sx_sternal_instability", "Mất vững xương ức", "symptom"),
  E("sx_mediastinal_purulent", "Chảy mủ từ vùng trung thất", "symptom"),
  E("img_mediastinal_widening", "Trung thất giãn rộng trên X-quang/CT", "imaging"),

  // VASC
  E("micro_vessel_wall", "Phân lập VSV từ thành mạch cắt trong mổ", "micro"),
  E("path_vascular_infection", "GPB / đại thể nhiễm trùng động/tĩnh mạch", "pathology"),
  E("sx_vascular_pain", "Đau tại chỗ mạch tổn thương", "symptom"),
  E("sx_vascular_erythema", "Viêm đỏ tại chỗ mạch", "symptom"),
  E("sx_vascular_warmth", "Nóng tại chỗ mạch", "symptom"),
  E("sx_vascular_lethargy", "Lờ đờ (≤1 tuổi)", "symptom"),
  E("micro_catheter_tip_gt15", "Cấy đầu catheter >15 khóm (bán định lượng)", "micro"),
  E("sx_vascular_purulent", "Chảy mủ thực sự tại vị trí mạch", "symptom"),

  // CDI / GE / GIT / IAB
  E("lab_cdi_toxin_unformed", "Độc tố / PCR toxin C. difficile trên phân không khuôn", "lab"),
  E("path_pseudomembranous_colitis", "Viêm đại tràng giả mạc (nội soi / GPB)", "pathology"),
  E("sx_acute_diarrhea_gt12h", "Tiêu chảy cấp phân lỏng >12 giờ (không phi nhiễm trùng)", "symptom"),
  E("sx_nausea", "Buồn nôn", "symptom"),
  E("sx_vomiting", "Nôn", "symptom"),
  E("sx_abdominal_pain", "Đau / tăng cảm giác đau bụng", "symptom"),
  E("micro_enteric_pathogen", "Tác nhân đường ruột ngoại lai từ phân / quệt TT", "micro"),
  E("micro_stool_direct_microscopy", "Soi kính trực tiếp phân thấy tác nhân đường ruột", "micro"),
  E("path_gi_abscess_or_infection", "GPB / đại thể áp xe hoặc nhiễm trùng đường tiêu hóa", "pathology"),
  E("micro_blood_mbi_organism", "Cấy máu (+) tác nhân thuộc danh mục MBI", "micro"),
  E("sx_odynophagia", "Đau khi nuốt", "symptom"),
  E("sx_dysphagia", "Nuốt khó", "symptom"),
  E("micro_drain_or_tissue_gi", "Phân lập VSV từ dẫn lưu / mô PT / ống dẫn lưu kín", "micro"),
  E("micro_gi_gram_or_koh", "Gram / KOH dịch dẫn lưu hoặc mô (+)", "micro"),
  E("img_git_definitive", "CĐHA khẳng định nhiễm trùng đường tiêu hóa", "imaging"),
  E("micro_iab_fluid_or_abscess", "Phân lập VSV từ dịch ổ bụng / mủ áp xe vô khuẩn", "micro"),
  E("path_iab_abscess", "GPB / đại thể áp xe hoặc nhiễm trùng khoang bụng", "pathology"),
  E("sx_hypotension", "Tụt huyết áp", "symptom"),
  E("lab_elevated_liver_enzymes", "Tăng men gan (AST/ALT)", "lab"),
  E("sx_jaundice", "Vàng da / vàng mắt", "symptom"),
  E("micro_iab_gram_or_culture", "Gram hoặc phân lập VSV từ dịch ổ bụng / dẫn lưu", "micro"),
  E("img_iab_definitive", "CĐHA khẳng định nhiễm trùng khoang bụng", "imaging"),

  // LUNG
  E("micro_lung_or_pleural", "Gram hoặc phân lập từ mô phổi / dịch màng phổi hợp lệ", "micro"),
  E("path_lung_abscess_or_empyema", "GPB / đại thể áp xe phổi hoặc tràn mủ màng phổi", "pathology"),
  E("img_lung_abscess_or_pleural", "CT/MRI khẳng định áp xe phổi / nhiễm trùng khoang màng phổi", "imaging"),

  // ENDO
  E("micro_endo_vegetation_or_device", "Phân lập VSV từ sùi / mô van / graft / dây tạo nhịp / tắc mạch", "micro"),
  E("path_endocarditis", "GPB viêm nội tâm mạc", "pathology"),
  E("sx_endo_gross_surgery", "Quan sát đại thể ENDO trong mổ tim", "symptom"),
  E("img_endo_typical", "CĐHA / PET điển hình ENDO", "imaging"),
  E("micro_endo_blood_typical_ge2", "≥2 cấy máu ≤1 ngày: tác nhân điển hình ENDO", "micro"),
  E("micro_endo_blood_prosthetic_ge2", "≥2 cấy máu ≤1 ngày: tác nhân điển hình trên prosthetic", "micro"),
  E("micro_endo_blood_other_ge3", "≥3 cấy máu ≤1 ngày: cùng tác nhân không điển hình", "micro"),
  E("sero_cox_bartonella_or_pcr", "Coxiella / Bartonella serology hoặc PCR đặc hiệu", "serology"),
  E("sx_endo_predisposing", "Tiền sử nguy cơ cao / tiêm chích ma túy", "symptom"),
  E("sx_endo_new_murmur", "Tiếng thổi tim mới", "symptom"),
  E("sx_endo_vascular_phenomenon", "Biến cố mạch máu", "symptom"),
  E("sx_endo_immunologic_phenomenon", "Biến cố miễn dịch", "symptom"),
  E("micro_blood_ordinary_positive", "Cấy máu dương tính thông thường (1 pathogen hoặc 2 commensals khớp)", "micro"),

  // REPR — EMET / OREP / VCUF (đóng gap SSI OB/GYN)
  E("micro_endometrium", "Phân lập VSV từ mô / dịch nội mạc tử cung", "micro"),
  E("path_endometritis", "GPB / đại thể viêm nội mạc tử cung", "pathology"),
  E("sx_emet_uterine_pain", "Đau tử cung / bụng dưới", "symptom"),
  E("sx_emet_purulent", "Chảy dịch mủ từ tử cung", "symptom"),
  E("micro_orep_tissue_or_fluid", "Phân lập VSV từ mô / dịch đường sinh sản sâu", "micro"),
  E("path_orep_infection", "GPB / đại thể nhiễm trùng mô chậu / sinh sản sâu", "pathology"),
  E("sx_orep_pelvic_pain", "Đau hố chậu / sinh sản", "symptom"),
  E("sx_dysuria", "Tiểu buốt", "symptom"),
  E("img_orep_definitive", "CĐHA khẳng định nhiễm trùng chậu / sinh sản sâu", "imaging"),
  E("micro_vcuf_fluid", "Phân lập VSV từ dịch mỏm cắt âm đạo", "micro"),
  E("sx_vcuf_purulent", "Chảy mủ từ mỏm cắt âm đạo", "symptom"),
  E("path_vcuf_abscess", "Áp xe mỏm cắt (lâm sàng / GPB / CĐHA)", "pathology"),
] as const;

const BY_KEY = new Map(CH17_EVIDENCE_CATALOG.map((e) => [e.key, e]));

export function getCh17Evidence(key: string): Ch17EvidenceDef | null {
  return BY_KEY.get(key) ?? null;
}

export function ch17EvidenceLabel(key: string): string {
  return BY_KEY.get(key)?.label_vi ?? key;
}

export function allCh17EvidenceKeys(): string[] {
  return CH17_EVIDENCE_CATALOG.map((e) => e.key);
}
