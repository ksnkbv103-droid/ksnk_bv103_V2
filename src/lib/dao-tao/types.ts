/** Types thuần cho engine thi KSNK — không I/O. */

export type DaoTaoQuestionLoai =
  | "single"
  | "multi"
  | "true_false_cluster"
  | "order";

export type BloomLevel = 1 | 2 | 3 | 4 | 5;

export type BloomCode =
  | "C1_REMEMBER"
  | "C2_UNDERSTAND"
  | "C3_APPLY"
  | "C4_ANALYZE"
  | "C5_EVALUATE"
  | "C6_CREATE";

export type TargetRole =
  | "ROLE_IPC_SPECIALIST"
  | "ROLE_CSSD_STAFF"
  | "ROLE_HOUSEKEEPING"
  | "ROLE_LAUNDRY_STAFF"
  | "ROLE_PHYSICIAN_SPECIALTY"
  | "ROLE_PHYSICIAN_GENERAL"
  | "ROLE_NURSE_SPECIALTY"
  | "ROLE_NURSE_GENERAL"
  | "ROLE_STUDENT_TRAINEE"
  | "ROLE_IPC_NETWORK_MEMBER"
  | "ROLE_CSSD_TECH"
  | "ROLE_ENVIRONMENTAL_STAFF"
  | "ROLE_PHYSICIAN_SPECIALIST"
  | "ROLE_NURSE_SPECIALIST"
  | "ROLE_PHYSICIAN"
  | "ROLE_NURSE_MIDWIFE"
  | "ROLE_SUPPORT_STAFF";

export const TARGET_ROLE_LABELS: Record<string, string> = {
  ROLE_IPC_SPECIALIST: "Cán bộ chuyên trách giám sát KSNK",
  ROLE_CSSD_STAFF: "Nhân viên Đơn vị Tiệt khuẩn trung tâm (CSSD)",
  ROLE_HOUSEKEEPING: "Nhân viên làm sạch & Vệ sinh môi trường",
  ROLE_LAUNDRY_STAFF: "Nhân viên quản lý đồ vải & Giặt là y tế",
  ROLE_PHYSICIAN_SPECIALTY: "Bác sĩ chuyên khoa (Ngoại, GMHS, ICU, Thận nhân tạo)",
  ROLE_PHYSICIAN_GENERAL: "Bác sĩ lâm sàng chung (Đa khoa, Nội khoa, Nhi, PK)",
  ROLE_NURSE_SPECIALTY: "Điều dưỡng chuyên khoa (Phòng mổ, ICU, Lọc máu)",
  ROLE_NURSE_GENERAL: "Điều dưỡng lâm sàng chung / Kỹ thuật viên buồng bệnh",
  ROLE_STUDENT_TRAINEE: "Học viên quân y, sinh viên y khoa & Điều dưỡng thực tập",
  ROLE_IPC_NETWORK_MEMBER: "Mạng lưới KSNK kiêm nhiệm tại khoa lâm sàng",
  // Aliases tương thích ngược
  ROLE_CSSD_TECH: "Nhân viên Đơn vị Tiệt khuẩn trung tâm (CSSD)",
  ROLE_ENVIRONMENTAL_STAFF: "Nhân viên làm sạch & Vệ sinh môi trường",
  ROLE_PHYSICIAN_SPECIALIST: "Bác sĩ chuyên khoa (Ngoại, GMHS, ICU, Thận nhân tạo)",
  ROLE_NURSE_SPECIALIST: "Điều dưỡng chuyên khoa (Phòng mổ, ICU, Lọc máu)",
  ROLE_PHYSICIAN: "Bác sĩ (Chung & Chuyên khoa)",
  ROLE_NURSE_MIDWIFE: "Điều dưỡng / KTV (Chung & Chuyên khoa)",
  ROLE_SUPPORT_STAFF: "Nhân viên hỗ trợ (Vệ sinh & Đồ vải)",
};

export type TargetRolePreset = {
  code: TargetRole;
  label: string;
  badge: string;
  description: string;
  scopeSummary: string;
  defaultQuestions: number;
  durationMinutes: number;
  recommendedTopics?: string[];
};

export const CANONICAL_TARGET_ROLES: TargetRolePreset[] = [
  {
    code: "ROLE_IPC_SPECIALIST",
    label: "Cán bộ chuyên trách giám sát KSNK",
    badge: "Giám sát chuyên sâu",
    description: "Khoa Kiểm soát nhiễm khuẩn, giám sát viên lâm sàng, học viên lớp CME 9 tháng",
    scopeSummary: "Bao quát toàn diện 35 chuyên đề: Dịch tễ học bệnh viện, MDRO, điều tra vụ dịch, phân tích RCA, kiểm toán vệ sinh tay, xây dựng và thẩm định quy trình.",
    defaultQuestions: 40,
    durationMinutes: 45,
  },
  {
    code: "ROLE_PHYSICIAN_SPECIALTY",
    label: "Bác sĩ chuyên khoa can thiệp (Ngoại / ICU / Can thiệp)",
    badge: "Can thiệp chuyên sâu",
    description: "Bác sĩ Ngoại khoa, Phẫu thuật - GMHS, Hồi sức tích cực (ICU), Can thiệp tim mạch, Thận nhân tạo, Nội soi",
    scopeSummary: "Kháng sinh dự phòng (thời điểm 60' trước rạch da), vô khuẩn phòng mổ, MSBP khi đặt catheter CVC, bundle VAP, bảo tồn đường vào mạch máu, phác đồ MDRO/CRE.",
    defaultQuestions: 40,
    durationMinutes: 45,
  },
  {
    code: "ROLE_PHYSICIAN_GENERAL",
    label: "Bác sĩ lâm sàng chung (Đa khoa / Nội / Nhi / PK)",
    badge: "Lâm sàng chung",
    description: "Bác sĩ khoa Khám bệnh, Cấp cứu ban đầu, Nội khoa tổng quát, Nhi khoa, các chuyên khoa nội dung",
    scopeSummary: "Phòng ngừa chuẩn, cách ly đường lây (tiếp xúc/giọt bắn/không khí), chỉ định cấy vi sinh đúng thời điểm, quản lý kháng sinh AMS, xử trí phơi nhiễm nghề nghiệp PEP trong 72h.",
    defaultQuestions: 30,
    durationMinutes: 35,
  },
  {
    code: "ROLE_NURSE_SPECIALTY",
    label: "Điều dưỡng chuyên khoa (Phòng mổ / ICU / Lọc máu)",
    badge: "Kỹ thuật can thiệp",
    description: "Điều dưỡng dụng cụ phòng mổ, điều dưỡng hồi sức tích cực, kỹ thuật viên lọc máu ngoài thận",
    scopeSummary: "Rửa tay ngoại khoa 3-5 phút, bundle CLABSI, bundle VAP (nâng đầu $30-45^\\circ$, áp lực cuff $20-30\\,\\text{cmH}_2\\text{O}$), bundle CAUTI, chuẩn bị NB trước mổ (clipper, không cạo lông).",
    defaultQuestions: 40,
    durationMinutes: 45,
  },
  {
    code: "ROLE_NURSE_GENERAL",
    label: "Điều dưỡng lâm sàng chung / Kỹ thuật viên",
    badge: "Chăm sóc cơ bản",
    description: "Điều dưỡng buồng bệnh, điều dưỡng phòng khám, hộ sinh, kỹ thuật viên xét nghiệm/chẩn đoán hình ảnh",
    scopeSummary: "5 thời điểm vệ sinh tay theo WHO (kỹ thuật 6 bước 20-30s), thứ tự tháo PPE, tiêm an toàn 1 tay xúc nắp kim, sơ cứu kim đâm dưới vòi nước chảy, phân loại chất thải y tế.",
    defaultQuestions: 30,
    durationMinutes: 35,
  },
  {
    code: "ROLE_CSSD_STAFF",
    label: "Nhân viên Đơn vị Tiệt khuẩn trung tâm (CSSD)",
    badge: "Tiệt khuẩn CSSD",
    description: "Kỹ thuật viên tiệt khuẩn trung tâm, nhân viên xử lý dụng cụ phẫu thuật và khử khuẩn nội soi mềm",
    scopeSummary: "Nguyên tắc luân chuyển 1 chiều bẩn - sạch - vô khuẩn, giá trị $A_0$, test Bowie-Dick, chỉ thị sinh học BI (*Geobacillus stearothermophilus*), đóng gói, thu hồi mẻ hấp lỗi.",
    defaultQuestions: 30,
    durationMinutes: 35,
  },
  {
    code: "ROLE_HOUSEKEEPING",
    label: "Nhân viên làm sạch & Vệ sinh môi trường bệnh viện",
    badge: "Vệ sinh & Hộ lý",
    description: "Hộ lý buồng bệnh, nhân viên vệ sinh môi trường, nhân viên dịch vụ làm sạch công nghiệp",
    scopeSummary: "Quy trình lau 2 xô/3 xô, nguyên tắc từ sạch đến bẩn/từ trên xuống dưới, pha hóa chất Clo (1.000 ppm định kỳ, 5.000 ppm đổ tràn máu $\\ge 10\\,\\text{ml}$), phân loại túi rác vàng/đen/trắng/xanh.",
    defaultQuestions: 20,
    durationMinutes: 25,
  },
  {
    code: "ROLE_LAUNDRY_STAFF",
    label: "Nhân viên quản lý đồ vải & Giặt là y tế",
    badge: "Giặt là y tế",
    description: "Nhân viên nhà giặt, nhân viên thu gom và cấp phát đồ vải bệnh viện",
    scopeSummary: "Phân loại đồ vải tại nguồn buồng bệnh (tuyệt đối không giũ/đếm tại giường), vận chuyển xe kín 1 chiều, giặt nhiệt $\\ge 71^\\circ\\text{C}$ trong 25 phút, tiêu chuẩn đồ vải vô khuẩn phòng mổ.",
    defaultQuestions: 20,
    durationMinutes: 25,
  },
  {
    code: "ROLE_STUDENT_TRAINEE",
    label: "Học viên quân y, sinh viên y khoa & ĐD thực tập",
    badge: "Định hướng thực tập",
    description: "Học viên bác sĩ, sinh viên y học quân sự, sinh viên điều dưỡng đang thực tập lâm sàng tại BV103",
    scopeSummary: "Định hướng văn hóa an toàn và kiểm soát nhiễm khuẩn cơ bản, 5 thời điểm VST, đeo khẩu trang N95, nhận biết biển cảnh báo cách ly, xử trí tai nạn rủi ro phơi nhiễm nghề nghiệp.",
    defaultQuestions: 20,
    durationMinutes: 25,
  },
];

export type DaoTaoCheDo = "thi_thu" | "thi_that";

export type DapAnDung =
  | { kind: "single"; optionId: string }
  | { kind: "multi"; optionIds: string[] }
  | { kind: "true_false_cluster"; byOptionId: Record<string, boolean> }
  | { kind: "order"; orderedOptionIds: string[] };

export type BankOption = {
  id: string;
  nhanGoc: string;
  noiDung: string;
  thuTuGoc: number;
  tfDung?: boolean | null;
};

export type EvidenceSource = {
  source_id: string;
  tier: string;
  doc_title: string;
  section_ref: string;
  verbatim_quote: string;
  verified_numbers?: string[];
};

export type EvidenceLock = {
  primary_tier: string;
  sources: EvidenceSource[];
  canonical_param_ids?: string[];
  is_verified?: boolean;
};

export type BankQuestion = {
  id: string;
  /** Mã chủ đề (cân đề đa chiều). */
  chuDeMa: string;
  chuDeTen?: string;
  loai: DaoTaoQuestionLoai;
  bloomLevel: BloomLevel;
  bloomCode?: BloomCode | string;
  clinicalVignette?: string | null;
  stem: string;
  giaiThich?: string | null;
  dapAnDung: DapAnDung;
  options: BankOption[];
  distractorRationales?: Record<string, string>;
  evidenceLock?: EvidenceLock | null;
  targetRoles?: string[];
  sopRefs?: string[];
};

export type QuotaMap = Record<string, number>;

export type SelectExamInput = {
  bank: BankQuestion[];
  soCau: number;
  bloomQuota: QuotaMap;
  loaiQuota: QuotaMap;
  seed: string;
  shuffleCau?: boolean;
  shuffleDapAn?: boolean;
  targetRole?: TargetRole | string;
  chuDeMas?: string[];
  sopRefs?: string[];
};

export type SnapshotOption = {
  id: string;
  noiDung: string;
  /** Vị trí hiển thị sau shuffle (0-based). */
  displayIndex: number;
  tfDung?: boolean | null;
};

export type ExamQuestionSnapshot = {
  cauHoiId: string;
  chuDeMa: string;
  chuDeTen?: string;
  loai: DaoTaoQuestionLoai;
  bloomLevel: BloomLevel;
  bloomCode?: BloomCode | string;
  clinicalVignette?: string | null;
  stem: string;
  giaiThich?: string | null;
  options: SnapshotOption[];
  dapAnDung: DapAnDung;
  distractorRationales?: Record<string, string>;
  evidenceLock?: EvidenceLock | null;
  targetRoles?: string[];
  sopRefs?: string[];
};

export type QuotaReport = {
  requested: number;
  selected: number;
  byLoai: Record<string, number>;
  byBloom: Record<string, number>;
  byChuDe: Record<string, number>;
  notes: string[];
};

export type SelectExamResult = {
  questions: ExamQuestionSnapshot[];
  report: QuotaReport;
};

export type TraLoi =
  | { kind: "single"; optionId: string | null }
  | { kind: "multi"; optionIds: string[] }
  | { kind: "true_false_cluster"; byOptionId: Record<string, boolean | null> }
  | { kind: "order"; orderedOptionIds: string[] };

export type ExamFormThongTin = {
  hoTen: string;
  khoaDonVi: string;
  email?: string;
};
