# Domain SSOT v3.3 — Giám sát nhiễm khuẩn bệnh viện (NKBV / HAI)

> **Phiên bản:** 3.3 · **Ngày:** 2026-08-27  
> **Phạm vi HAI lâm sàng BV103:** Ch.1–4, 6–7, 9–11 (PedVAE: không dùng), 16–17. **Ngoài domain này:** CLIP (Ch.5), LabID/MDRO module (Ch.12), AUR (Ch.14), CDC Location mapping (Ch.15).  
> **Chuẩn:** *National Healthcare Safety Network (NHSN) Patient Safety Component Manual*, **January 2025** (CDC)  
> **Nguồn PDF:** Google Drive `ksnkbv103@gmail.com` — [CDC · 2025 NHSN Patient Safety Component Manual](https://drive.google.com/file/d/1srXXSWNWpXJzuiVK0PNxbXxHtNXW4qgv/view) (458 trang; file id `1srXXSWNWpXJzuiVK0PNxbXxHtNXW4qgv`)  
> **Loại:** Đặc tả logic domain (thuật toán & thực thể). **Không** thay hợp đồng UI/state BV103.  
> **Đối tượng:** PO / bác sĩ KSNK / người viết rule engine  
> **Phạm vi tuổi:** **Người lớn.** Protocol nhi / NICU không viết thuật toán (xem [Ch.11](#11-pedvae-chương-11--không-dùng-tại-bv103) và [Phụ lục C](#phụ-lục-c--nhi-khoa-không-dùng-tại-bv103)).

---

## 0. Meta BV103

### 0.1. Vì sao v3.3

v3.1: rút CLIP/LabID/AUR/Location; Ch.17 đủ tiêu chí người lớn. v3.2: Phụ lục E từ điển. **v3.3:** quy trình ca/dữ liệu — file đầy đủ [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md); [Phụ lục F](#phụ-lục-f--quy-trình-xác-định-ca-và-thu-thập-dữ-liệu-bv103) chỉ tóm tắt. LIS tạo BA khi chưa có mã; đã có mã thì không đè. Copy HIS/gõ tay cùng cổng BA. Không sửa `src/` trong đợt này.

### 0.2. Quan hệ tài liệu

| Tài liệu | Vai trò |
|----------|---------|
| **File này (v3.3)** | Canonical thuật toán + từ điển E; Phụ lục F **chỉ trỏ** file luồng dữ liệu |
| [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md) | Thu thập BA/LIS/HIS-copy + thứ tự chẩn đoán tại BV103 |
| [`hai-criteria-element-dictionary-20260827.md`](hai-criteria-element-dictionary-20260827.md) | Từ điển yếu tố tiêu chí (SX/LAB/IMG) — căn cứ ID |
| [`hai-database-plan-20260827.md`](hai-database-plan-20260827.md) | Tổ chức CSDL + chi tiết bảng timeline (cửa sổ tính, không pre-agg) |
| [`hai-database-rebuild-plan-20260827.md`](hai-database-rebuild-plan-20260827.md) | Đập demo / xây lại bảng NKBV (kế hoạch, chưa code) |
| v2.0 (2026-08-04) | Lịch sử; không còn neo thuật toán |
| `domain-specification.md` + `clinical-forms.md` | Hợp đồng app pilot — **không ghi đè** |
| `All domain_NKBV` + `Domain *` | Archive nguồn thô |
| `investigation-forms/*` | Phân tích phiếu tinh gọn — không thay SSOT |

### 0.3. Mục lục sổ tay CDC 2025 (khóa 1:1)

Sổ tay ghi rõ: chương **8** và **13** đã rút, **không** dồn số.

| Ch. CDC | Tên | Trong SSOT này |
|---------|-----|----------------|
| 1 | NHSN Overview | [§1](#1-tổng-quan-nhsn--phạm-vi-bv103) |
| 2 | Identifying HAIs | [§2](#2-xác-định-hai-cửa-sổ-thời-gian) |
| 3 | Monthly Reporting Plan & Annual Surveys | [§3](#3-kế-hoạch-báo-cáo-tháng-mrp) |
| 4 | Bloodstream Infection (CLABSI / non-CL BSI) | [§4](#4-nhiễm-khuẩn-huyết-clabsi--lcbi) |
| 5 | CLIP | [§5](#5-clip--ngoài-phạm-vi-domain-này) — **không thuộc domain** |
| 6 | Pneumonia (VAP / non-vent PNEU) | [§6](#6-viêm-phổi-pneu--vap--non-vap) |
| 7 | UTI (CAUTI / non-CAUTI) | [§7](#7-nhiễm-khuẩn-tiết-niệu-cauti--uti) |
| 8 | *Retired* | [§8](#8-chương-8--đã-rút) |
| 9 | Surgical Site Infection | [§9](#9-nhiễm-khuẩn-vết-mổ-ssi) |
| 10 | VAE (adult locations only) | [§10](#10-vae-người-lớn) |
| 11 | PedVAE | [§11](#11-pedvae-chương-11--không-dùng-tại-bv103) |
| 12 | MDRO / CDI LabID | [§12](#12-labid-mdro--ngoài-phạm-vi-domain-này) — **không thuộc domain** |
| 13 | *Retired* | [§13](#13-chương-13--đã-rút) |
| 14 | AUR | [§14](#14-aur--ngoài-phạm-vi-domain-này) — **không thuộc domain** |
| 15 | CDC Locations | [§15](#15-cdc-location--ngoài-phạm-vi-domain-này) — **không thuộc domain** |
| 16 | General Key Terms | [§16](#16-thuật-ngữ-chung) |
| 17 | Specific types of infections | [§17](#17-định-nghĩa-vị-trí-nhiễm-khuẩn-cụ-thể) — **đủ tiêu chí người lớn** |

Lớp sản phẩm → [Phụ lục A](#phụ-lục-a--lớp-sản-phẩm-bv103). Đối chiếu app → [Phụ lục B](#phụ-lục-b--chuẩn-cdc-vs-phần-mềm). Từ điển → [Phụ lục E](#phụ-lục-e--từ-điển-nhsn-2025--ksnk-bv103). **Quy trình ca + dữ liệu** → [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md).

### 0.4. Từ điển thời gian (không nhầm cửa sổ)

| Nhãn | Nghĩa CDC 2025 | Áp dụng |
|------|----------------|---------|
| **IWP 7 ngày** | Ngày xét nghiệm/chẩn đoán đầu + 3 ngày trước + 3 ngày sau | Ch.4, 6, 7, 17 (trừ ENDO) |
| **DOE** | Ngày phần tử **đầu tiên** thỏa tiêu chí trong IWP | Như trên |
| **POA** | DOE ∈ ngày nhập (ngày 1) ± 2 ngày trước + ngày sau nhập | Như trên |
| **HAI** | DOE ≥ **ngày lịch thứ 3** (ngày nhập = ngày 1) | Như trên |
| **RIT 14 ngày** | Từ DOE = ngày 1; không báo ca cùng loại trong RIT | Như trên |
| **SBAP lâm sàng** | IWP ∪ RIT (thường 14–17 ngày) | Ch.4 nhận Secondary từ site Ch.6/7/17 |
| **Không dùng IWP/POA/RIT/SBAP Ch.2** | SSI, VAE, PedVAE | Ch.9, 10, 11 |
| **SSI Surveillance Period** | 30 hoặc 90 ngày từ ngày mổ | Ch.9 |
| **SSI-SBAP** | Cố định `[DOE−3, DOE+13]` = 17 ngày | Ch.9 Secondary BSI |
| **VAE Event Period** | 14 ngày từ DOE (ngày đầu worsening) | Ch.10 |
| **ENDO Extended IWP** | Index ± 10 = **21 ngày** | Ch.17 ENDO |
| **ENDO RIT / SBAP** | Hết đợt nằm viện hiện tại | Ch.17 ENDO |
| **Device Day 1** | Ngày đặt (hoặc ngày access nội trú đầu với CVC sẵn) | Ch.4, 7, 10 |

### 0.5. Nguyên tắc biên soạn

1. Không cải tiến thuật toán CDC; nếu PDF mâu thuẫn nội bộ → ghi `[PO cần xác nhận]`.
2. Mỗi khái niệm định nghĩa **một lần**; hội chứng chỉ giữ delta.
3. Nhánh ≤1 tuổi / PedVAP / NICU / UMB / NEC sơ sinh: **một dòng** “CDC có — không dùng tại BV103” — không cây thuật toán.

---

## 1. Tổng quan NHSN — phạm vi BV103

NHSN (CDC DHQP) là hệ thống giám sát nhiễm khuẩn liên quan chăm sóc y tế (HAI) chuẩn quốc gia Hoa Kỳ. Sổ tay **Patient Safety Component (PSC) January 2025** có nhiều module; **domain BV103 này chỉ HAI lâm sàng người lớn:**

- **Gắn dụng cụ (trong domain):** CLABSI, CAUTI, VAE (**chỉ khoa người lớn**), PNEU/VAP ngoài khoa thở máy in-plan
- **Gắn thủ thuật:** SSI
- **Site cụ thể / Secondary BSI:** Ch.17
- **Ngoài domain này (CDC vẫn có, BV103 không đưa vào SSOT HAI):** CLIP (Ch.5), PedVAE (Ch.11 — không dùng), LabID MDRO/CDI (Ch.12), AUR (Ch.14), CDC Location mapping (Ch.15), COVID viện

**In-plan:** viện cam kết làm **đúng và đủ** protocol NHSN cho sự kiện đã khai trên kế hoạch tháng (Ch.3). Chỉ dữ liệu in-plan vào benchmark / CMS.  
**Off-plan:** theo dõi nội bộ; không cam kết đủ protocol; không CDA upload.

**BV103 chọn (domain):** giám sát **người lớn**, một module phần mềm HAI lâm sàng. PedVAE / PedVAP in-plan / NICU **không** thuộc kế hoạch. PNEU ở khoa người lớn thở máy in-plan → **bắt buộc VAE (Ch.10)**, không dùng PNEU thay VAE.

Các component NHSN khác (Long-term care, Dialysis, Healthcare Personnel Safety, Neonatal Component, Outpatient Procedure) **ngoài** PSC này — không đưa vào SSOT BV103.

---

## 2. Xác định HAI (cửa sổ thời gian)

> Nguồn: CDC 2025 Ch.2. **Không** áp dụng cho SSI, VAE, PedVAE (bảng ngoại lệ Ch.2). LabID/AUR ngoài domain này.

### 2.1. Loại trừ chung (mọi định nghĩa NHSN)

Không dùng các giống sau để thỏa **bất kỳ** định nghĩa NHSN: *Blastomyces, Histoplasma, Coccidioides, Paracoccidioides, Cryptococcus, Pneumocystis*.  
Không báo HAI nếu mẫu lấy sau đồng ý hiến tạng **và** bệnh nhân đang hỗ trợ hiến tạng.  
Hospice / palliative **không** loại khỏi giám sát.  
Tái hoạt nhiễm tiềm ẩn (herpes, zona, giang mai, lao…) **không** coi là HAI.

Bệnh nhân observation nếu **nằm khoa nội trú** → phải vào tử số/mẫu số in-plan.

### 2.2. Infection Window Period (IWP)

IWP = **7 ngày lịch**: ngày lấy xét nghiệm/chẩn đoán **đầu tiên** dùng làm yếu tố tiêu chí + **3 ngày trước** + **3 ngày sau**.

Xét nghiệm/chẩn đoán để **đặt** IWP: mẫu lab, hình ảnh, thủ thuật/khám.  
Nếu tiêu chí **không** có xét nghiệm: dùng ngày dấu hiệu **khu trú** đầu (đau tại chỗ, dẫn lưu mủ, tiêu chảy…). **Sốt không** dùng để đặt IWP (không khu trú).

Chọn xét nghiệm **đầu** sao cho **mọi** yếu tố tiêu chí nằm trong IWP đó (ví dụ PNU2: ưu tiên phim nếu phim tạo cửa sổ đủ tiêu chí sớm hơn cấy máu).

### 2.3. Date of Event (DOE)

DOE = ngày phần tử **đầu tiên** thỏa tiêu chí site-specific **lần đầu** trong IWP.

DOE quyết định: POA vs HAI, nơi quy kết (LOA), gắn dụng cụ, ngày 1 của RIT.

### 2.4. POA vs HAI

- **POA:** DOE trong khung: ngày nhập nội trú (ngày 1), **2 ngày trước nhập**, và **ngày sau nhập**. Nếu DOE rơi 2 ngày trước nhập → ghi DOE = **ngày 1** viện (cho RIT).
- **HAI:** DOE **từ ngày lịch thứ 3** trở đi (ngày nhập = ngày 1).

Công thức vận hành: `ngày sự kiện ≥ ngày nhập + 2 ngày lịch`.

### 2.5. Location of Attribution (LOA) & Transfer Rule

Mặc định: quy kết **khoa nơi BN đang nằm vào DOE**.

**Transfer Rule:** nếu DOE = **ngày chuyển khoa** hoặc **ngày sau chuyển** → quy kết **khoa chuyển đi**. Nhiều khoa trong 24 giờ trước DOE → khoa đầu ngày trước DOE (theo protocol Ch.2).

### 2.6. Repeat Infection Timeframe (RIT)

RIT = **14 ngày** từ DOE (DOE = ngày 1). Trong RIT: không báo ca **cùng loại**; giữ DOE/RIT/gắn dụng cụ/LOA gốc; thêm tác nhân mới vào ca cũ.

- **Major type** (một RIT chung): BSI (mọi LCBI/MBI), UTI (SUTI/ABUTI), PNEU (mọi PNU).
- **Specific type:** các site Ch.17 (SKIN ≠ DECU có thể chồng RIT).

### 2.7. Secondary BSI Attribution Period (SBAP)

SBAP = IWP ∪ RIT (độ dài **14–17 ngày** tùy DOE so với Index). Máu trong SBAP + **matching organism** với site nguyên phát → Secondary BSI (không đếm CLABSI).

**Scenario 2:** máu là **thành phần bắt buộc** của tiêu chí site (vd. IAB 3b) → Secondary khi máu ∈ IWP của site đó.

**Cấm Secondary** (canonical, Ch.2 + protocol hội chứng):

- PedVAE: **cấm tuyệt đối** (BV103 không dùng PedVAE).
- Yeast/Candida từ máu **không** Secondary cho UTI.
- Candida / CoNS / Enterococcus từ đờm/ETA/BAL/PSB **không** Secondary cho PNEU trừ mô phổi / dịch màng phổi.
- VAE: Secondary **chỉ PVAP** (không VAC/IVAC); máu trong Event Period 14 ngày.

Matching: cùng chi/loài theo hướng dẫn Ch.2 Pathogen Assignment (không gộp “họ” lỏng).

### 2.8. Gắn dụng cụ (device-associated)

Nhiễm khuẩn HAI gắn dụng cụ khi dụng cụ **đã tại chỗ > 2 ngày lịch** vào DOE **và** còn tại chỗ **DOE hoặc ngày trước DOE**. Ngày đặt = Device Day 1; ngày rút cũng tính một Device Day.

- CVC sẵn lúc nhập: Device Day 1 = ngày **access nội trú đầu**.
- Foley / thở máy sẵn trước nhập: đếm từ ngày nhập khoa nội trú đầu.

**Break rule:** ngắt ≥ 1 ngày lịch đầy đủ → đặt lại = Device Day 1 mới.

### 2.9. Ma trận KHÔNG áp dụng Ch.2

| Khái niệm | SSI | VAE |
|-----------|-----|-----|
| IWP ±3 | Không | Không |
| POA/HAI Day-3 | Không (dùng SP 30/90) | Không (DOE = worsening) |
| RIT 14 | Không | Event Period 14d |
| SBAP IWP∪RIT | SBAP 17d cố định | Chỉ PVAP + Event Period |

LabID / AUR (CDC Ch.12, 14) cũng không dùng cửa sổ Ch.2 — **không thuộc domain này**.

---

## 3. Kế hoạch báo cáo tháng (MRP)

> CDC form **57.106**. Nguồn: Ch.3.

Mỗi tháng viện khai **module + khoa/thủ thuật in-plan**. In-plan = làm **đủ** protocol. Off-plan = nội bộ, không vào CMS/NHSN publications, không CDA.

**Annual Surveys** (Ch.3): khảo sát cơ sở hàng năm phục vụ mẫu số / risk adjustment — domain ghi nhận; app BV103 **chưa** có form MRP.

**Hệ quả BV103:** chưa có thực thể “kế hoạch tháng”. Giám sát hiện tại = vận hành nội bộ theo hội chứng HAI lâm sàng; **không** tuyên bố FacWide in-plan chuẩn CDC.

---

## 4. Nhiễm khuẩn huyết (CLABSI / LCBI)

> CDC 2025 Ch.4. Dùng cửa sổ Ch.2. LCBI-3 (≤1 tuổi): **CDC có — không dùng tại BV103.**

### 4.1. Định nghĩa

**Primary BSI / LCBI:** cấy máu (hoặc NCT) thỏa LCBI **và không** Secondary từ site khác.

**CLABSI:** LCBI + CVC gắn dụng cụ (Ch.2 §2.8) tại DOE.

**Common commensal:** danh sách NHSN (CoNS, *Micrococcus*, *Bacillus* spp. trừ anthracis, *Corynebacterium* spp. trừ diphtheriae, …).

### 4.2. LCBI 1 (mọi tuổi — BV103 dùng)

Tác nhân **recognized pathogen** (không nằm list commensal) từ:

1. ≥ 1 mẫu máu cấy, **hoặc**
2. NCT (vd. T2MR, NGS) định danh chi/loài từ máu; nếu có cấy máu trong NCT−2 … NCT+1 ngày → **chỉ dùng cấy**, bỏ NCT.

**Và** không liên quan nhiễm khuẩn site khác (Secondary Guide).

DOE LCBI 1 = ngày mẫu máu dương **đầu** đặt IWP.

Nếu vừa LCBI 1 vừa LCBI 2: báo **LCBI 1**; pathogen #1 = recognized, #2 = commensal.

### 4.3. LCBI 2 (mọi tuổi — BV103 dùng)

≥ 1: sốt >38°C, rét run, hạ HA  
**và** cùng commensal từ **≥ 2 mẫu máu** lấy **separate occasions**  
**và** không Secondary.

### 4.4. LCBI 3

CDC: nhánh ≤1 tuổi. **Không dùng tại BV103.**

### 4.5. MBI-LCBI

Sau khi thỏa LCBI, xét MBI nếu: giảm bạch cầu / ANC trong cửa sổ NHSN **và** tác nhân MBI-eligible **và** bằng chứng tổn thương hàng rào niêm mạc (tiêu chảy, GVHD ruột…). Chi tiết bảng ANC/GI theo protocol Ch.4. App hiện: nhánh rút gọn (P1).

### 4.6. Nhãn CLABSI

Sau LCBI: nếu CVC eligible (§2.8) → **CLABSI**; không → Primary LCBI không gắn line.

Ngoại lệ SIR (carve-out protocol): ECMO, VAD, community fungal… theo danh sách Ch.4 — IP đối chiếu khi xuất SIR chuẩn (app chưa SIR chuẩn).

### 4.7. Secondary trước CLABSI

Luôn chạy Secondary BSI (Ch.2 §2.7) **trước** khi gắn nhãn CLABSI. Máu đã Secondary → **không** đếm CLABSI.

```mermaid
flowchart TD
  A[Mau_duong] --> B{Secondary_tu_site_khac?}
  B -- Yes --> C[Khong_CLABSI]
  B -- No --> D{LCBI_1_hoac_2?}
  D -- No --> E[Khong_LCBI]
  D -- Yes --> F{CVC_device_associated?}
  F -- Yes --> G[CLABSI]
  F -- No --> H[Primary_LCBI]
```

---

## 5. CLIP — ngoài phạm vi domain này

CDC 2025 Ch.5 (form 57.125) là **process** tuân thủ đặt CVC — không phải ca HAI. **Không** thuộc SSOT HAI lâm sàng BV103. App CLIP nếu còn là lát phần mềm riêng, không neo file này.

---

## 6. Viêm phổi (PNEU / VAP / Non-VAP)

> CDC 2025 Ch.6. Dùng IWP/DOE/POA/RIT Ch.2.  
> **Adult vent in-plan → bắt buộc VAE Ch.10**, không dùng PNEU cho người lớn thở máy in-plan.  
> PedVAP in-plan (khoa nhi): **không dùng tại BV103.** PNU1 nhánh B (≤1 tuổi) và C (>1–≤12 tuổi): **CDC có — không dùng tại BV103.**  
> Pneumatocele ≤1 tuổi: không dùng.

### 6.1. Imaging (mọi PNU — người lớn)

- Không bệnh nền tim–phổi: ≥1 phim thâm nhiễm mới / tiến triển / hang.  
- Có bệnh nền: ≥2 phim serial trong 7 ngày chứng minh tồn tại/tiến triển; phim mơ hồ cần **clinical correlation** (bác sĩ ghi kháng sinh điều trị viêm phổi).

**Cấm** chốt PNEU chỉ bằng chẩn đoán lâm sàng của bác sĩ, không đủ tiêu chí.

### 6.2. PNU1 — nhánh A (mọi tuổi — BV103 dùng)

Imaging + ≥1 toàn thân (sốt >38; WBC ≤4000 hoặc ≥12000; rối loạn ý thức nếu ≥70 tuổi không nguyên nhân khác)  
+ ≥2 hô hấp khác dòng: đờm mủ/đổi tính chất; khó thở / thở nhanh >25; ho mới/xấu; ran / thở phế quản; gas exchange xấu (P/F ≤240 hoặc tăng O₂/máy).

### 6.3. PNU2

Imaging + ≥1 toàn thân + ≥1 hô hấp + (≥1 lab Table 2 **hoặc** Table 3):

- Table 2: máu (+); dịch màng phổi (+); LRT ít nhiễm đạt ngưỡng (BAL/PBAL ≥10⁴; PSB ≥10³; ETA ≥10⁵ nếu thở máy; semi-quant Moderate/Heavy); ≥5% BAL nội bào; mô phổi ≥10⁴ CFU/g; mô bệnh học.  
- Table 3: virus / *Bordetella* / *Legionella* / *Chlamydia* / *Mycoplasma*; IgG ×4; Legionella IFA; kháng nguyên nước tiểu Legionella.

Flora miệng hỗn hợp **cấm** PNU2/3. Candida/yeast NOS, CoNS, Enterococcus từ đờm/ETA/BAL/PSB **cấm** trừ mô phổi / dịch màng phổi.

### 6.4. PNU3 (suy giảm miễn dịch)

Tiêu chí miễn dịch protocol (giảm bạch cầu, ung thư máu, HIV CD4<200, ghép, hóa chất, steroid >14 ngày…) + imaging + ≥1 triệu chứng + lab (kể ngoại lệ Candida máu **khớp** LRT trong IWP).

### 6.5. Nhãn VAP vs Non-VAP

Sau PNU*: nếu thở máy xâm lấn eligible (>2 ngày lịch + hiện diện DOE/DOE−1) → **VAP**; không → **Non-ventilator PNEU (HAP)**.

Secondary BSI: SBAP Ch.2; cấm Candida/CoNS/Enterococcus secondary trừ lung/pleural.

```mermaid
flowchart TD
  A[Ra_soat_PNEU] --> B{Nguoi_lon_tho_may_in_plan?}
  B -- Yes --> C[Chuyen_VAE_Ch10]
  B -- No --> D{Imaging_du?}
  D -- No --> Z[Dung]
  D -- Yes --> E{PNU3_mien_dich?}
  E -- Yes --> F[PNU3]
  E -- No --> G{Lab_PNU2?}
  G -- Yes --> H[PNU2]
  G -- No --> I[PNU1_A]
  F --> J{Vent_eligible?}
  H --> J
  I --> J
  J -- Yes --> K[VAP]
  J -- No --> L[Non_VAP]
```

---

## 7. Nhiễm khuẩn tiết niệu (CAUTI / UTI)

> CDC 2025 Ch.7. Dùng Ch.2. SUTI 2 (≤1 tuổi): **CDC có — không dùng tại BV103.**  
> NICU chỉ CAUTI **off-plan** — BV103 không giám sát NICU.  
> **USI** (thận/niệu quản/khoang quanh thận, **không** phải UTI nước tiểu) → [Ch.17 USI](#1710-usi).

UTI **luôn là site nguyên phát** — không Secondary từ site khác.

### 7.1. Foley (IUC)

Chỉ ống thông tiểu **lưu trong niệu đạo–bàng quang**. Không: condom, straight/in-out, nephrostomy, suprapubic đơn thuần (trừ khi protocol nêu).

CAUTI (SUTI 1a): IUC **>2 ngày lịch** nội trú tại DOE **và** còn tại chỗ DOE hoặc rút ngày trước DOE.

### 7.2. SUTI 1a — CAUTI (mọi tuổi — BV103)

1. IUC eligible như trên  
2. ≥1: sốt >38°C; đau trên xương mu*; đau góc sườn-cột sống*; **không** dùng tiểu gấp/rắt/buốt khi **ống còn tại chỗ**  
3. Cấy nước tiểu ≤2 loài, ≥1 vi khuẩn **≥10⁵ CFU/ml**

Mọi yếu tố ∈ IWP. Sốt **không** loại vì “do nguyên nhân khác”.

### 7.3. SUTI 1b — Non-CAUTI

Không đủ điều kiện IUC >2 ngày; cùng triệu chứng + cấy ≥10⁵; ống không tại chỗ vào DOE/ngày trước (triệu chứng tiểu gấp/rắt/buốt **được** dùng).

### 7.4. ABUTI

Không triệu chứng SUTI + cấy nước tiểu ≥10⁵ + **cấy máu cùng khuẩn** (không yeast). Mọi tuổi.

### 7.5. Loại trừ tác nhân nước tiểu

**Không** dùng để thỏa UTI: mọi **yeast/nấm men**, nấm mốc, nấm lưỡng hình, ký sinh trùng.

Mẫu vẫn chấp nhận nếu **còn đúng một vi khuẩn ≥10⁵ CFU/ml** kèm yeast (yeast không đếm loài; không tạo UTI từ yeast).

Secondary BSI từ UTI: matching trong SBAP; **máu yeast không** Secondary cho UTI.

```mermaid
flowchart TD
  A[Nuoc_tieu] --> B{Yeast_mold_khong_vi_khuan_1e5?}
  B -- Yes --> Z[Khong_UTI]
  B -- No --> C{CFU_ge_1e5_va_le_2_loai?}
  C -- No --> Z
  C -- Yes --> D{Trieu_chung_SUTI?}
  D -- No --> E{Mau_cung_khuan?}
  E -- Yes --> F[ABUTI]
  E -- No --> Z
  D -- Yes --> G{IUC_device_associated?}
  G -- Yes --> H[SUTI_1a_CAUTI]
  G -- No --> I[SUTI_1b]
```

---

## 8. Chương 8 — đã rút

CDC 2025: chương 8 **không** còn trong sổ tay (số chương không dồn). BV103 không định nghĩa nội dung Ch.8.

---

## 9. Nhiễm khuẩn vết mổ (SSI)

> CDC 2025 Ch.9. **Không** dùng IWP/POA/RIT/SBAP Ch.2.

### 9.1. Mẫu số thủ thuật

Phẫu thuật NHSN: mã ICD-10-PCS/CPT map; có đường rạch; OR hợp lệ (kể cả mổ lấy thai, cath lab mạch khi đủ định nghĩa). Thời gian ≥5 phút và ≤ IQR5. ASA 1–5 (ASA 6 loại).

**Cấm WoundClass = Clean** cho APPY, BILI, CHOL, COLO, REC, SB, VHYS → loại khỏi mẫu số.

### 9.2. Surveillance Period (SP)

- **30 ngày:** mọi Superficial; Deep/Organ của nhóm mã 30-ngày (APPY, COLO, CSEC, HYST, … theo bảng Ch.9).  
- **90 ngày:** Deep/Organ BRST, CARD, CBGB/C, CRAN, FUSN, FX, HER, HPRO, KPRO, PACE, PVBY, VSHN.  
- Secondary incision luôn ≤30 ngày.

DOE = ngày yếu tố đầu thỏa tiêu chí **trong SP**. Ngày mổ = ngày 1 SP.

**Reset SP:** mổ NHSN mới qua cùng vết → SP cũ hết, SP mới từ mổ mới.

### 9.3. Độ sâu (sâu nhất thắng)

**Superficial** (≤30 ngày, da/mô dưới da) ≥1: mủ; cấy vô khuẩn (+); chủ động mở + không cấy + ≥1 sưng/nóng/đỏ/đau; chẩn đoán MD/IP.  
**Cấm:** stitch abscess; chân đinh; cellulitis đơn thuần.

**Deep** (30/90 ngày, fascia/cơ) ≥1: mủ sâu; mở/toác + (cấy+ hoặc không cấy) + sốt/đau — cấy (−) **không** đủ; áp xe sâu.

**Organ/Space:** mủ từ dẫn lưu vô khuẩn vào tạng/khoang **hoặc** cấy dịch/mô **hoặc** áp xe/imaging (± clinical correlation) **và** ≥1 tiêu chí site Ch.17.

### 9.4. PATOS / 24h OR / Manipulation

**PATOS = Yes** chỉ khi độ sâu nhiễm **lúc mổ** = độ sâu SSI sau; bằng chứng trong Operative Note.

Trở lại OR ≤24 giờ: một bản ghi mẫu số; cộng thời gian; ASA/Wound xấu nhất; SP từ hết mổ 2.

**Invasive manipulation exclusion:** không nghi nhiễm trước + can thiệp xâm lấn vào vết vì chẩn đoán/điều trị + nhiễm sau đúng lớp → không tính procedure gốc (không áp dụng nắn kín / thay băng thường).

### 9.5. SSI Secondary BSI

SBAP **cố định 17 ngày:** `[DOE−3, DOE+13]`. Scenario 1: máu ∈ SBAP + match. Scenario 2: máu là criterion Ch.17 → Secondary.

```mermaid
flowchart TD
  A[Mo_NHSN] --> B{DOE_trong_SP?}
  B -- No --> Z[Dung]
  B -- Yes --> C{Do_sau?}
  C -- Nong --> D[Superficial]
  C -- Sau --> E[Deep]
  C -- Organ --> F{Ch17_site?}
  F -- Yes --> G[Organ_Space]
  G --> H{Mau_trong_SBAP_17d?}
  H -- Yes --> I[SSI_cong_Secondary]
```

---

## 10. VAE người lớn

> CDC 2025 Ch.10. **Chỉ khoa người lớn.** Không IWP ±3.  
> Tuổi ≥18 tại khoa adult; thở máy ≥4 ngày lịch (ngày đặt = Vent Day 1).

### 10.1. VAC

Baseline 2 ngày ổn định/giảm PEEP tối thiểu hoặc FiO₂ tối thiểu  
→ Worsening 2 ngày duy trì tăng PEEP hoặc FiO₂ theo ngưỡng protocol  
→ DOE = **ngày đầu worsening** (ngày 3 của chuỗi 4 ngày) và ≥ Vent Day 3.

Loại trừ ngày ECMO/HFV trọn ngày khỏi dải tính; APRV: chỉ dùng FiO₂ (không PEEP tương đương) theo protocol.

### 10.2. IVAC (sau VAC)

Trong VAE Window (DOE ±3, theo Ch.10): sốt/hạ thân nhiệt **hoặc** biến động WBC  
**và** kháng sinh mới + đủ Qualifying Antimicrobial Days (≥4 QAD).

### 10.3. PVAP (sau IVAC)

Một trong 3 nhóm lab trong Window (ngưỡng BAL/ETA/PSB; tế bào; mô; virus/Legionella… — **cấm** flora miệng, Candida/yeast, CoNS, Enterococcus từ đờm/ETA/BAL trừ lung/pleural).

### 10.4. Event Period & Secondary

Khóa **14 ngày** từ DOE: không tạo VAE mới chồng. Secondary BSI **chỉ PVAP** + máu matching trong Event Period.

**Transfer Rule** VAE: DOE ngày chuyển hoặc ngày sau → khoa chuyển đi.

```mermaid
flowchart TD
  A[Nguoi_lon_tho_may] --> B{ge_4_vent_days?}
  B -- No --> Z[Dung]
  B -- Yes --> C{Baseline_2d_cong_Worsening_2d?}
  C -- No --> Z
  C -- Yes --> D[VAC_DOE]
  D --> E{Sot_WBC_cong_ABX_QAD?}
  E -- No --> F[Bao_VAC]
  E -- Yes --> G[IVAC]
  G --> H{Lab_PVAP?}
  H -- No --> I[Bao_IVAC]
  H -- Yes --> J[PVAP]
```

---

## 11. PedVAE (Chương 11) — không dùng tại BV103

CDC 2025 Ch.11: *Pediatric Ventilator-Associated Event — for use in neonatal and pediatric locations only.* Một bậc (không VAC/IVAC/PVAP); MAP/FiO₂; **cấm** Secondary BSI.

**Quyết định BV103:** không giám sát PedVAE, không viết cây MAP/FiO₂, không form, không engine. Người lớn thở máy → [Ch.10](#10-vae-người-lớn).

---

## 12. LabID MDRO — ngoài phạm vi domain này

CDC 2025 Ch.12 (LabID MDRO/CDI, Infection Surveillance MDRO, process cách ly) **không** thuộc SSOT HAI lâm sàng. **GI-CDI** khi dùng như site HAI/SSI → [Ch.17 CDI](#cdi). App `nkbv_fact_labid_event` nếu còn là lát phần mềm, không neo file này.

---

## 13. Chương 13 — đã rút

CDC 2025: không còn Ch.13 trong PSC. Không định nghĩa nội dung.

---

## 14. AUR — ngoài phạm vi domain này

CDC 2025 Ch.14 (AU + AR, Days Present, SAAR, CDA bắt buộc, cấm nhập tay) **không** thuộc SSOT HAI lâm sàng. Không viết protocol DOT/AR trong file này.

---

## 15. CDC Location — ngoài phạm vi domain này

CDC 2025 Ch.15 (CDC Location Code, 80% acuity, Virtual Location, SIR) **không** thuộc SSOT HAI lâm sàng. Mã CDC trên danh mục khoa nếu còn là lát phần mềm/dashboard, không neo file này.

---

## 16. Thuật ngữ chung

> CDC 2025 Ch.16. Dùng cho ≥2 protocol **HAI lâm sàng**. **Không** thay định nghĩa lâm sàng viện. Thuật ngữ chỉ phục vụ CLIP/LabID/AUR/Location **không** đưa vào bảng này.

| Thuật ngữ | Nghĩa giám sát NHSN |
|-----------|---------------------|
| **ASC/AST** | Cấy/xét nghiệm chủ động tìm mang (MRSA mũi, VRE trực tràng) — **không** dùng thỏa tiêu chí HAI/Ch.17 |
| **Calendar day** | 00:00–23:59 |
| **Clinical correlation** | Bác sĩ ghi **điều trị kháng sinh** cho nhiễm trùng tại chỗ khi imaging **mơ hồ** |
| **DOE** | Ngày phần tử đầu thỏa tiêu chí trong IWP 7 ngày (không áp SSI/VAE) |
| **Device-associated** | HAI + dụng cụ >2 ngày lịch tại DOE và còn DOE hoặc D−1 |
| **Device days** | Số BN có dụng cụ tại khoa trong kỳ (đếm ngày hoặc sampling tuần) |
| **Equivocal imaging** | Không chắc nhiễm; cần clinical correlation |
| **Event contributed to death** | Sự kiện gây chết hoặc làm nặng bệnh nền dẫn đến chết (hồ sơ/tử thiết) |
| **Died** | Chết trong đợt nằm viện hiện tại |
| **Matching organism** | Đầu [Ch.17](#17-định-nghĩa-vị-trí-nhiễm-khuẩn-cụ-thể) |
| **Physician / physician designee** | Đầu [Ch.17](#17-định-nghĩa-vị-trí-nhiễm-khuẩn-cụ-thể) |

**Birthweight / Apnea sơ sinh (Ch.16):** CDC có — **không dùng tại BV103.**

Định nghĩa riêng hội chứng: xem từng chương (vd. central line, IUC, ventilator).

---

## 17. Định nghĩa vị trí nhiễm khuẩn cụ thể

> CDC 2025 Ch.17. Dùng khi SSI Organ/Space **hoặc** site nguyên phát cho Secondary BSI.  
> IWP/RIT/POA = **Ch.2**, trừ **ENDO** (cửa sổ đặc biệt §17.4).  
> Tiêu chí UTI / BSI / PNEU / VAE / SSI **không** nằm trong chương này — xem Ch.4, 6, 7, 9, 10.

**Quy ước viết tắt trong chương này**

| Ký hiệu | Nghĩa CDC (không dịch thuật ngữ) |
|---------|----------------------------------|
| **NCT** | Cấy **hoặc** xét nghiệm vi sinh không cấy, **phục vụ chẩn đoán/điều trị** — **không** phải Active Surveillance Culture/Testing (ASC/AST) |
| **\*** | Không nguyên nhân khác (*no other recognized cause*) |
| **Matching organism** | Cùng loài nếu cả hai mẫu có loài; nếu một mẫu chỉ có chi thì khớp ở chi. **Không** bắt kháng sinh đồ máu và site phải giống nhau. Ngoại lệ LCBI-2 *Staphylococcus* / *Streptococcus*: xem Ch.4. Chi tiết ví dụ: PDF 17-1 … 17-3. |
| **MBI organism** | Giống trong NHSN Terminology Browser (dùng GIT/IAB + máu) |
| **Physician** | Bác sĩ điều trị / phẫu thuật / nhiễm khuẩn / cấp cứu **hoặc** người được ủy quyền (NP/PA) |
| **Organism(s)** | Gồm cả virus |

Nấm *Blastomyces, Histoplasma, Coccidioides, Paracoccidioides, Cryptococcus, Pneumocystis* **không** dùng thỏa bất kỳ định nghĩa NHSN (đã nêu Ch.2).

Khi nhiều site cùng lúc: chọn **sâu nhất** theo hướng dẫn báo cáo từng mã (vd. BONE thắng JNT/PJI nếu đủ xương).

Nhánh ≤1 tuổi / sơ sinh (UMB, NEC neonate, CIRC, USI 4, IC/MEN/CARD/MED/VASC/UR nhánh trẻ): **CDC có — không dùng tại BV103** — ghi dưới từng mã, không viết cây.

### 17.1. Catalog người lớn

| Nhóm | Mã (domain BV103) |
|------|-------------------|
| **BJ** | BONE, DISC, JNT, PJI |
| **CNS** | IC, MEN, SA |
| **CVS** | CARD, ENDO, MED, VASC |
| **EENT** | CONJ, EAR, EYE, ORAL, SINU, UR |
| **GI** | CDI, GE, GIT, IAB |
| **LRI** | LUNG (không phải PNEU) |
| **REPR** | EMET, EPIS, OREP, VCUF, BRST |
| **SST** | BURN, DECU, SKIN, ST |
| **USI** | USI — **loại trừ UTI Ch.7** |

**UMB, NEC sơ sinh, CIRC newborn:** CDC có — **không dùng tại BV103.**

**GI-CDI (Ch.17)** là tiêu chí **nhiễm khuẩn lâm sàng** *C. difficile* khi dùng như site HAI/SSI. Module LabID (Ch.12) **không thuộc domain này** — không trộn Incident/Recurrent/HO-CO vào GI-CDI.

---

### 17.2. BJ — nhiễm khuẩn xương–khớp

#### BONE — Osteomyelitis

Thỏa **ít nhất một**:

1. NCT từ **xương**.  
2. Bằng chứng viêm xương trên đại thể hoặc GPB.  
3. ≥2 dấu tại chỗ: sốt >38,0°C, sưng*, đau/tức*, nóng*, chảy dịch* **và** một trong:  
   - (a) NCT máu **và** imaging chắc chắn nhiễm (X-quang/CT/MRI/xạ hình; mơ hồ cần clinical correlation điều trị viêm xương)  
   - (b) imaging chắc chắn nhiễm (cùng quy tắc mơ hồ như trên)

**Báo cáo:** viêm trung thất sau mổ tim **kèm** viêm xương → SSI-**MED**, không SSI-BONE. Nếu đủ cả Organ/Space JNT và BONE → SSI-**BONE**. Sau HPRO/KPRO nếu đủ cả PJI và BONE → SSI-**BONE**.

#### DISC — Disc space infection

Thỏa **ít nhất một**:

1. NCT từ khoang đĩa đệm.  
2. Đại thể/GPB nhiễm khoang đĩa.  
3. Sốt >38,0°C **hoặc** đau* tại đĩa **và** một trong:  
   - (a) NCT máu **và** imaging chắc chắn (mơ hồ → clinical correlation điều trị DISC)  
   - (b) imaging chắc chắn (cùng quy tắc)

#### JNT — Joint or bursa (không dùng Organ/Space SSI sau HPRO/KPRO)

Thỏa **ít nhất một**:

1. NCT từ dịch khớp hoặc sinh thiết màng hoạt dịch.  
2. Đại thể/GPB nhiễm khớp/bursa.  
3. Nghi nhiễm khớp **và** ≥2: sưng*, đau/tức*, nóng*, tràn dịch*, hạn chế vận động* **và** một trong:  
   - (a) bạch cầu dịch khớp tăng (theo lab) **hoặc** leukocyte esterase dịch khớp (+)  
   - (b) vi khuẩn + bạch cầu trên Gram dịch khớp  
   - (c) NCT máu  
   - (d) imaging chắc chắn (mơ hồ → clinical correlation điều trị JNT)

**Báo cáo:** JNT + BONE cùng lúc → SSI-**BONE**.

#### PJI — Periprosthetic Joint Infection (chỉ Organ/Space SSI sau **HPRO và KPRO**)

Thỏa **ít nhất một**:

1. **Hai** mẫu quanh khớp giả (mô hoặc dịch) **cùng matching organism** (NCT). Vi sinh từ **hardware** háng/gối được dùng cho nhánh 1.  
2. **Sinus tract** thông khớp trên đại thể (lỗ hẹp xuyên mô mềm, khoang chết, nguy cơ áp xe).  
3. **Ba** tiêu chí phụ:  
   - (a) CRP huyết thanh >100 mg/L **và** ESR >30 mm/giờ  
   - (b) WBC dịch khớp >10.000/µL **hoặc** leukocyte esterase “++” trở lên  
   - (c) PMN% dịch khớp >90%  
   - (d) GPB quanh khớp: >5 PMN / quang trường lớn  
   - (e) NCT **một** mẫu quanh khớp (+)

Cutoff 3a–3d **chỉ** cho giám sát SSI HPRO/KPRO NHSN — không thay định nghĩa lâm sàng MSIS.

**Báo cáo:** sau HPRO/KPRO nếu đủ PJI và BONE → SSI-**BONE**.

---

### 17.3. CNS — nhiễm khuẩn thần kinh trung ương

#### IC — Intracranial (áp xe não, dưới/trên màng cứng, viêm não)

Thỏa **ít nhất một**:

1. NCT từ mô não hoặc màng cứng.  
2. Áp xe hoặc bằng chứng nhiễm nội sọ trên đại thể/GPB.  
3. ≥2: đau đầu*, chóng mặt*, sốt >38,0°C, dấu khu trú*, thay đổi ý thức*, lú lẫn* **và** một trong:  
   - (a) vi sinh trên kính hiển vi mô não/áp xe (chọc/mổ/tử thiết)  
   - (b) imaging chắc chắn (siêu âm/CT/MRI/xạ hình/chụp mạch; mơ hồ → clinical correlation điều trị IC)  
   - (c) IgM đơn độc chẩn đoán **hoặc** IgG tăng 4 lần huyết thanh cặp

**Nhánh 4 (≤1 tuổi):** CDC có — **không dùng tại BV103.**

**Báo cáo:** MEN + viêm não (IC) cùng lúc → **MEN**. MEN + áp xe não (IC) sau mổ → **IC**. MEN + SA cùng lúc → **SA**.

#### MEN — Meningitis or ventriculitis

Thỏa **ít nhất một**:

1. NCT từ CSF.  
2. Nghi viêm màng não/não thất **và** ≥2 yếu tố **trong đó “i” một mình không đủ hai yếu tố**:  
   - (i) sốt >38,0°C **hoặc** đau đầu  
   - (ii) dấu màng não*  
   - (iii) dấu dây thần kinh sọ*  
   **và** một trong: (a) CSF: bạch cầu tăng + protein tăng + glucose giảm (theo lab); (b) Gram CSF thấy vi sinh; (c) NCT máu; (d) IgM / IgG tăng 4 lần.

**Nhánh 3 (≤1 tuổi):** CDC có — **không dùng tại BV103.**

**Báo cáo:** co giật **không** thỏa “dấu dây thần kinh sọ”. Nhiễm shunt CSF trong 90 ngày đặt → SSI-MEN; sau đó hoặc sau thao tác/chọc → CNS-MEN, **không** SSI. Cùng quy tắc IC/SA như trên.

#### SA — Spinal abscess/infection

Thỏa **ít nhất một**:

1. NCT từ áp xe hoặc mủ khoang ngoài/dưới màng cứng tủy.  
2. Áp xe hoặc bằng chứng nhiễm tủy trên đại thể/GPB.  
3. ≥1: sốt >38,0°C, đau lưng/tức*, viêm rễ*, liệt hai chi dưới một phần*, liệt hoàn toàn* **và** một trong:  
   - (a) NCT máu **và** imaging chắc chắn SA (mơ hồ → clinical correlation)  
   - (b) imaging chắc chắn (myelography/siêu âm/CT/MRI/xạ hình; mơ hồ → clinical correlation)

**Báo cáo:** MEN + SA sau mổ → **SA**.

---

### 17.4. CVS — nhiễm khuẩn tim mạch

#### CARD — Myocarditis or pericarditis

Thỏa **ít nhất một**:

1. NCT từ mô/dịch màng ngoài tim.  
2. ≥2: sốt >38,0°C, đau ngực*, mạch nghịch*, tim to* **và** một trong: (a) ECG phù hợp; (b) GPB cơ tim; (c) IgG tăng 4 lần; (d) tràn dịch màng ngoài tim trên echo/CT/MRI/chụp mạch.

**Nhánh 3 (≤1 tuổi):** CDC có — **không dùng tại BV103.**

#### ENDO — Endocarditis (cửa sổ đặc biệt)

| Khái niệm | ENDO | Ch.2 thường |
|-----------|------|-------------|
| IWP | Ngày xét nghiệm/chẩn đoán **đầu** dùng làm yếu tố + **10 ngày trước** + **10 ngày sau** = **21 ngày** | ±3 |
| RIT | Hết **đợt nằm viện hiện tại** | 14 ngày |
| SBAP Secondary BSI | IWP 21 ngày **và mọi ngày còn lại** của admission | IWP ∪ RIT |

Secondary BSI ENDO: **chỉ** máu **khớp matching organism** với tác nhân đã dùng chốt ENDO. Ví dụ ENDO bằng *S. aureus* (sùi hoặc máu) rồi máu *S. aureus* + *E. coli* → chỉ *S. aureus* gán Secondary; *E. coli* phải xét BSI riêng (site khác hoặc primary). Nếu máu đó **tự** thỏa một nhánh ENDO thì **cả hai** giống được gán.

Van tự nhiên hoặc van giả thỏa **ít nhất một** nhánh:

**ENDO 1\*** — NCT từ: sùi tim†, mô tim, van giả/vòng khâu đã tháo, graft động mạch chủ lên **có bằng chứng van‡**, CIED nội mạch, hoặc thuyên tắc động mạch. Cũng eligible: cấy (+) dây máy tạo nhịp/sốc hoặc thành phần VAD **trong tim**.

**ENDO 2** — GPB thấy endocarditis¶ trên sùi/mô tim/van giả/vòng khâu/graft ĐMC lên có van‡ / CIED / thuyên tắc.

**ENDO 3** — Quan sát đại thể endocarditis trong mổ tim.

**ENDO 4** — Imaging echo hoặc CT tim có ≥1: (i) sùi van/cấu trúc đỡ†; (ii) thủng van/lá; (iii) phình van/lá; (iv) áp xe quanh van/graft; (v) giả phình; (vi) rò trong tim; (vii) hở van **mới có ý nghĩa so với ảnh cũ** (chỉ echo); (viii) hở một phần **mới** van giả (so ảnh cũ)  
**hoặc** FDG PET/CT: (ix) hoạt tính bất thường van tự nhiên/giả\|\|, graft ĐMC lên có van, dây máy/vật liệu giả **>3 tháng** sau mổ tim; (x) hoạt tính bất thường **≤3 tháng** sau đặt van giả\|\| / graft / dây / vật liệu  
**và** một trong (a–f):  
(a) typical IE từ **≥2** máu khớp, lấy **ngày khác**, cách nhau **≤1 ngày lịch**: *S. aureus, S. lugdunensis, E. faecalis*, streptococci **trừ** *S. pneumoniae* và *S. pyogenes*, *Granulicatella, Abiotrophia, Gemella*, HACEK  
(b) typical trên **vật liệu giả** từ ≥2 máu (cùng quy tắc ngày): CoNS, *C. striatum, C. jeikeium, S. marcescens, P. aeruginosa, C. acnes*, NTM, *Candida* spp.  
(c) non-typical từ **≥3** máu khớp (cùng quy tắc ngày)  
(d) *C. burnetii* anti-phase I IgG >1:800 **hoặc** NCT một máu  
(e) IFA IgM/IgG *B. henselae* hoặc *B. quintana* với IgG **≥1:800**  
(f) *C. burnetii*, *Bartonella* spp. hoặc *T. whipplei* trên máu bằng PCR/NCT

**ENDO 5** — **Ba** yếu tố (mỗi nhóm i–v chỉ dùng **một** điều kiện) từ: (i) tiền sử ENDO / van giả / sửa van / CIED / tim bẩm sinh chưa sửa# / hở-hep hơn nhẹ mọi nguyên nhân / HOCM / IVDU**; (ii) sốt >38,0°C; (iii) hở van mới khi nghe; (iv) hiện tượng mạch (thuyên tắc lớn, nhồi phổi nhiễm, phình nấm, xuất huyết nội sọ, xuất huyết kết mạc, Janeway); (v) hiện tượng miễn dịch (viêm cầu thận phức hợp, Osler, Roth, RF (+))  
**và** một trong (a–f) như ENDO 4.

**ENDO 6** — Imaging echo/CT **hoặc** FDG PET/CT như ENDO 4 (kèm hở van mới trên echo = mục viii trong PDF)  
**và** điều kiện từ **ba** nhóm trong (a–e): (a) yếu tố nguy cơ như 5i; (b) sốt; (c) hiện tượng mạch; (d) miễn dịch; (e) máu: mầm bệnh nhận diện **hoặc** cùng commensal từ ≥2 lần lấy máu ngày khác / ngày liên tiếp.

**ENDO 7** — **Mỗi** nhóm a–g: nguy cơ như 5i; sốt; hở van mới khi nghe; hiện tượng mạch; miễn dịch; máu như ENDO 6e.

Imaging mơ hồ (§) → clinical correlation (bác sĩ ghi điều trị kháng sinh **cho endocarditis**).  
Yếu tố 5i / 6a / 7a ghi trong admission **được** dùng dù ngoài IWP/SP SSI; **không** dùng để đặt DOE ENDO.

#### MED — Mediastinitis

Thỏa **ít nhất một**:

1. NCT từ mô/dịch trung thất.  
2. Đại thể/GPB viêm trung thất.  
3. ≥1: sốt >38,0°C, đau ngực*, xương ức không vững* **và** (a) mủ dẫn lưu trung thất **hoặc** (b) trung thất giãn trên imaging.

**Nhánh 4 (≤1 tuổi):** CDC có — **không dùng tại BV103.**

Khoang trung thất: dưới xương ức, trước cột sống (tim, mạch lớn, khí quản, thực quản, tuyến ức, hạch…).

#### VASC — Arterial or venous infection (loại nhiễm đường mạch **có** vi sinh trong máu thỏa LCBI)

Nếu đủ LCBI **và** VASC → báo **LCBI**, không VASC.

Thỏa **ít nhất một**:

1. NCT từ động/tĩnh mạch đã lấy ra.  
2. Đại thể/GPB nhiễm mạch.  
3. ≥1: sốt >38,0°C, đau*, đỏ*, nóng* tại chỗ mạch* **và** >15 khuẩn lạc đầu cannula (cấy bán định lượng).  
4. Mủ tại chỗ mạch.

**Nhánh 5 (≤1 tuổi):** CDC có — **không dùng tại BV103.**

**Báo cáo:** graft/shunt/fistula/cannula **không** có vi sinh máu → CVS-VASC. Organ/Space VASC là SSI (kể cả khi có Secondary BSI) — không LCBI. Nhiễm nội mạch có máu thỏa LCBI → BSI-LCBI.

Ngoại lệ “pus at vascular access site” (đánh Yes trên BSI khi khớp máu trong IWP BSI): catheter động mạch **trừ** ĐMP/động mạch chủ/rốn; AVF; AVG; HERO; IABP; CL **không** đặt/không dùng đợt này.

---

### 17.5. EENT — nhiễm khuẩn mắt, tai, mũi, họng, miệng

#### CONJ — Conjunctivitis

≥1: đau, đỏ, sưng kết mạc hoặc quanh mắt **và** một trong: (a) NCT từ cạo kết mạc hoặc mủ kết mạc/mô liền (mi, giác mạc, tuyến Meibomius, lệ); (b) WBC + vi sinh trên Gram dịch; (c) mủ; (d) tế bào khổng lồ đa nhân trên kính hiển vi; (e) IgM / IgG tăng 4 lần.

**Không** báo viêm kết mạc hóa chất (AgNO₃). **Không** báo CONJ riêng nếu là một phần bệnh virus khác (vd. UR). Nhiễm mắt khác → **EYE**.

#### EAR — Tai / xương chũm

**Otitis externa — một trong:**  
1. NCT mủ ống tai.  
2. ≥1: sốt >38,0°C, đau*, đỏ* **và** vi sinh trên Gram mủ ống tai.

**Otitis media — một trong:**  
3. NCT dịch tai giữa lấy khi thủ thuật (vd. chọc nhĩ).  
4. ≥2: sốt, đau*, viêm*, màng nhĩ rút/giảm di động*, dịch sau màng nhĩ*.

**Otitis interna — một trong:**  
5. NCT dịch tai trong lấy khi thủ thuật.  
6. Chẩn đoán của physician: nhiễm tai trong.

**Mastoiditis — một trong:**  
7. NCT dịch/mô xương chũm.  
8. ≥2: sốt, đau/tức*, sưng sau tai*, đỏ*, đau đầu*, liệt mặt* **và** (a) Gram dịch/mô chũm **hoặc** (b) imaging chắc chắn (vd. CT; mơ hồ → clinical correlation điều trị mastoid).

#### EYE — Mắt, không phải kết mạc

Thỏa **ít nhất một**:

1. NCT dịch tiền phòng / dịch kính / buồng sau.  
2. ≥2 không nguyên nhân khác: đau mắt*, rối loạn thị giác*, hypopyon* **và** physician **bắt đầu kháng sinh trong 2 ngày** kể từ khởi phát/nặng thêm.

#### ORAL — Khoang miệng (miệng, lưỡi, lợi)

Thỏa **ít nhất một**:

1. NCT mủ/áp xe mô khoang miệng.  
2. Áp xe hoặc bằng chứng nhiễm khi thủ thuật / đại thể / GPB.  
3. ≥1*: loét, mảng trắng trên niêm mạc viêm, hoặc mảng niêm mạc miệng **và** một trong: (a) NCT virus từ cạo/dịch; (b) tế bào khổng lồ đa nhân; (c) IgM / IgG tăng 4 lần; (d) nấm trên soi (Gram, KOH); (e) physician bắt đầu kháng sinh trong 2 ngày.

**Báo cáo:** herpes miệng **nguyên phát** liên quan chăm sóc y tế → ORAL; herpes **tái phát** không phải HAI.

#### SINU — Sinusitis

Thỏa **ít nhất một**:

1. NCT dịch/mô xoang lấy khi thủ thuật.  
2. ≥1: sốt >38,0°C, đau/tức trên xoang*, đau đầu*, mủ*, tắc mũi* **và** imaging viêm xoang (X-quang/CT).

#### UR — Upper respiratory tract (không phải UTI, không phải PNEU)

Thỏa **ít nhất một**:

1. ≥2: sốt >38,0°C, đỏ họng*, đau họng*, ho*, khàn*, thở nhanh*, chảy mũi*, mủ họng* **và** một trong: (a) NCT từ thanh quản / tỵ hầu / họng / nắp thanh môn — **loại đờm và hút khí quản**; (b) IgM / IgG tăng 4 lần; (c) physician chẩn đoán nhiễm đường hô hấp trên.  
2. Áp xe trên đại thể/GPB hoặc imaging.

**Nhánh 3 (≤1 tuổi):** CDC có — **không dùng tại BV103.**

---

### 17.6. GI — nhiễm khuẩn tiêu hóa

#### CDI

GI-CDI: nhiễm khuẩn *C. difficile* lâm sàng (*Clostridioides difficile* infection).

Thỏa **ít nhất một**:

1. Xét nghiệm **độc tố** *C. difficile* (+) trên **phân không thành khuôn** (đổ theo khuôn lọ). Khi nhiều bước xét nghiệm: lấy **kết quả cuối** ghi vào hồ sơ trong ngày.  
2. Đại thể (kể nội soi) hoặc GPB: viêm đại tràng giả mạc.

DOE nhánh 1 = **ngày lấy mẫu** phân, không phải ngày bắt đầu phân lỏng. Độc tố (+) **và** phân không khuôn là **một** yếu tố — phải đủ cả hai.

**Báo cáo:** nếu thêm vi sinh đường ruột và đủ GE hoặc GIT → báo **cả** CDI và GE/GIT. Mỗi GI-CDI mới theo **RIT HAI Ch.2**. Nhãn LabID (Incident/Recurrent, HO/CO/CO-HCFA) **không** áp cho GI-CDI.

#### GE — Gastroenteritis

Thỏa **ít nhất một**:

1. Tiêu chảy cấp (phân lỏng **>12 giờ**) **không** nguyên nhân không nhiễm (xét nghiệm chẩn đoán, phác đồ **không** phải kháng sinh, đợt cấp bệnh mạn, stress).  
2. ≥2: buồn nôn*, nôn*, đau bụng*, sốt >38,0°C, đau đầu* **và** một trong: (a) NCT phân/tăm trực tràng ra **enteric pathogen**; (b) soi phân thấy enteric pathogen; (c) IgM / IgG tăng 4 lần.

Enteric pathogen **không** phải flora thường: *Salmonella, Shigella, Yersinia, Campylobacter, Listeria, Vibrio*, EPEC/EHEC, *Giardia* (và tương đương lab NHSN).

**Báo cáo:** đủ cả GE và GIT → chỉ **GIT**, DOE = GIT.

#### GIT — Gastrointestinal tract (thực quản → trực tràng), loại trừ GE, viêm ruột thừa, CDI

Thỏa **ít nhất một**:

1. (a) Áp xe hoặc bằng chứng nhiễm ống tiêu hóa trên đại thể/GPB **hoặc**  
   (b) như (a) **và** NCT máu có ≥1 **MBI organism**. Nếu GPB đã định danh vi sinh thì máu phải **matching**.  
2. ≥2 dấu phù hợp tạng: sốt >38,0°C, buồn nôn*, nôn*, đau/tức*, nuốt đau*, nuốt khó* **và** một trong:  
   - (a) NCT dẫn lưu/mô khi thủ thuật hoặc dẫn lưu đặt vô khuẩn  
   - (b) Gram / KOH nấm / tế bào khổng lồ đa nhân trên mẫu đó  
   - (c) NCT máu có ≥1 MBI **và** imaging chắc chắn nhiễm ống tiêu hóa (nội soi/MRI/CT; mơ hồ → clinical correlation điều trị GIT)  
   - (d) imaging chắc chắn (cùng quy tắc)

Người >1 tuổi: **pneumatosis intestinalis** = imaging **mơ hồ**.

**Báo cáo:** GE + GIT → chỉ GIT.

#### IAB — Intraabdominal (không nêu nơi khác): túi mật, đường mật, gan (**loại viêm gan virus**), lách, tụy, phúc mạc, sau phúc mạc, dưới hoành, mô ổ bụng khác

Thỏa **ít nhất một**:

1. NCT từ áp xe hoặc mủ khoang bụng.  
2. (a) Áp xe/bằng chứng nhiễm ổ bụng đại thể/GPB **hoặc**  
   (b) như (a) **và** NCT máu có ≥1 MBI. Nếu GPB đã có vi sinh thì máu phải matching.  
3. ≥2: sốt >38,0°C, hạ huyết áp, buồn nôn*, nôn*, đau/tức bụng*, transaminase tăng*, vàng da* **và** một trong:  
   - (a) Gram và/hoặc NCT dịch/mô khi thủ thuật hoặc dẫn lưu vô khuẩn ổ bụng (hút kín, dẫn lưu hở, T-tube, dẫn lưu CT)  
   - (b) NCT máu có ≥1 MBI **và** imaging chắc chắn (siêu âm/CT/MRI/ERCP/xạ hình/X-quang bụng; mơ hồ → clinical correlation điều trị IAB)

**Báo cáo:** giãn đường mật = imaging **mơ hồ** cho viêm đường mật. **Không** báo viêm tụy (hội chứng men tụy) trừ khi **chứng minh nhiễm**.

---

### 17.7. LRI — nhiễm khuẩn đường hô hấp dưới, không phải viêm phổi

#### LUNG — Lower respiratory tract and pleural cavity (không PNEU)

Thỏa **ít nhất một**:

1. Gram mô phổi/dịch màng phổi **hoặc** NCT mô phổi / dịch màng phổi\* (dịch màng phổi: lấy khi chọc **hoặc** trong **24 giờ** đặt dẫn lưu ngực).  
2. Áp xe phổi hoặc bằng chứng nhiễm (vd. empyema) đại thể/GPB.  
3. Imaging áp xe/nhiễm (**loại** imaging viêm phổi); mơ hồ → clinical correlation điều trị LUNG.

**Báo cáo:** đủ LUNG và PNEU → chỉ **PNEU**, **trừ** khi LUNG là Organ/Space SSI thì báo **cả** PNEU và SSI-LUNG.

\* Dịch màng phổi sau **điều chỉnh vị trí** dẫn lưu hoặc sau 24 giờ đặt: **không** eligible LUNG 1. Điều chỉnh phải có ghi hồ sơ.

---

### 17.8. REPR — nhiễm khuẩn sinh dục

#### EMET — Endometritis

Thỏa **ít nhất một**:

1. NCT dịch/mô nội mạc tử cung.  
2. Nghi EMET **và** ≥2: sốt >38,0°C, đau/tức (tử cung hoặc bụng)*, mủ từ tử cung.

**Báo cáo:** không báo chorioamnionitis HAI như EMET (→ OREP). Không báo EMET sau đẻ **âm đạo** nếu nhập với POA chorioamnionitis (OREP). Nếu **mổ lấy thai** trên nền chorioamnionitis rồi EMET → Organ/Space **SSI-EMET**.

#### EPIS — Episiotomy

Thỏa **một**: (1) sau đẻ âm đạo: mủ vết cắt tầng sinh môn; (2) áp xe vết cắt tầng sinh môn.

Hiếm tại BV103 — vẫn thuộc từ điển; không bắt buộc form riêng.

#### OREP — Deep pelvic / sinh dục nam nữ (mào tinh, tinh hoàn, tiền liệt, âm đạo, buồng trứng, tử cung), gồm chorioamnionitis; **loại** viêm âm đạo, EMET, VCUF

Thỏa **ít nhất một**:

1. NCT mô/dịch site OREP (**loại nước tiểu và tăm âm đạo**).  
2. Áp xe hoặc bằng chứng nhiễm đại thể/GPB.  
3. Nghi OREP **và** ≥2: sốt >38,0°C, buồn nôn*, nôn*, đau/tức*, tiểu buốt* **và** (a) NCT máu **hoặc** (b) physician bắt đầu kháng sinh trong 2 ngày.

**Báo cáo:** nội mạc → EMET; cuff âm đạo → VCUF. Viêm mào tinh/tiền liệt/tinh hoàn đủ OREP **và** đủ UTI → chỉ **UTI**, **trừ** khi OREP là Organ/Space SSI thì chỉ **OREP**.

#### VCUF — Vaginal cuff (chỉ sau **HYST** và **VHYS**)

Thỏa **ít nhất một**: (1) mủ cuff trên đại thể; (2) áp xe/bằng chứng nhiễm cuff đại thể; (3) NCT dịch/mô cuff.

**Báo cáo:** SSI-VCUF.

#### BRST — Breast / mastitis

Thỏa **ít nhất một**:

1. NCT mô/dịch vú khi thủ thuật hoặc dẫn lưu vô khuẩn.  
2. Áp xe/bằng chứng nhiễm đại thể/GPB.  
3. Sốt >38,0°C **và** viêm tại chỗ vú **và** physician bắt đầu kháng sinh trong 2 ngày.

**Báo cáo SSI sau thủ thuật BRST:** dưới da → Superficial incisional; cơ/cân → Deep incisional. Nhánh **3 không** eligible Organ/Space SSI sau BRST.

---

### 17.9. SST — nhiễm khuẩn da–mô mềm

#### BURN — Burn infection

**Phải đủ:** thay đổi vết bỏng (bong hoại tử nhanh, hoặc hoại tử nâu/đen/tím) **và** NCT máu.

**Báo cáo:** bỏng nhiễm dưới **mảnh ghép/băng tạm** → BURN. Ghép da **vĩnh viễn** (autograft) trên bỏng → **SKIN** hoặc **ST**.

#### DECU — Decubitus / pressure injury (nông và sâu)

**Phải đủ:** ≥2: đỏ*, tức*, sưng bờ vết* **và** NCT từ chọc dịch hoặc sinh thiết **bờ** loét.

#### SKIN — Skin and/or subcutaneous (loại DECU, bỏng, VASC)

Thỏa **ít nhất một**:

1. ≥1: mủ; mụn mủ; bóng nước; nhọt (**loại mụn trứng cá**).  
2. ≥2: đau/tức*, sưng*, đỏ*, nóng* **và** một trong: (a) NCT hút/dẫn lưu — **không** dùng ≥2 commensal **không** có mầm bệnh nhận diện (diphtheroids trừ *C. diphtheriae*, *Bacillus* trừ *B. anthracis*, *Propionibacterium*, CoNS gồm *S. epidermidis*, VGS, *Aerococcus, Micrococcus, Rhodococcus*, … — NHSN Terminology Browser); (b) tế bào khổng lồ đa nhân; (c) IgM / IgG tăng 4 lần.

**Không** báo trứng cá là HAI. Ưu tiên mã chuyên: UMB/CIRC (không dùng BV103), DECU, BURN, BRST, VASC (nếu máu thỏa LCBI → LCBI).

#### ST — Soft tissue (cơ/cân: necrotizing fasciitis, gangrene nhiễm, cellulitis hoại tử, myositis nhiễm, lymphadenitis, lymphangitis, parotitis) — loại DECU, bỏng, VASC

Thỏa **ít nhất một**:

1. NCT mô/dẫn lưu.  
2. Mủ tại chỗ.  
3. Áp xe hoặc bằng chứng nhiễm đại thể/GPB.

Ưu tiên DECU, BURN, BRST, OREP, VASC/LCBI như SKIN.

---

### 17.10. USI

Nhiễm khuẩn hệ tiết niệu (thận, niệu quản, bàng quang, niệu đạo, quanh thận) — **loại trừ UTI Ch.7**. Bệnh phẩm **không phải nước tiểu**.

Thỏa **ít nhất một**:

1. NCT dịch (**không phải nước tiểu**) hoặc mô vị trí.  
2. Áp xe hoặc bằng chứng nhiễm đại thể / thủ thuật / GPB.  
3. Sốt >38,0°C **hoặc** đau/tức tại chỗ* **và** (a) mủ tại chỗ **hoặc** (b) NCT máu **và** imaging chắc chắn (siêu âm/CT/MRI/xạ hình; mơ hồ → clinical correlation điều trị USI).

**Nhánh 4 (<1 tuổi):** CDC có — **không dùng tại BV103.**

**Báo cáo:** nhiễm sau cắt bao quy đầu sơ sinh → SST-CIRC (không dùng BV103).

```mermaid
flowchart TD
  A[Nghi_tiet_nieu] --> B{Tieu_chuan_UTI_Ch7?}
  B -- Yes --> C[SUTI_ABUTI]
  B -- No --> D{Dich_mo_khong_phai_nuoc_tieu?}
  D -- Yes --> E[USI_Ch17]
  D -- No --> Z[Khong_UTI_khong_USI]
```

---

### 17.11. Đủ cho từ điển chưa?

**v3.1:** đủ nhánh tiêu chí người lớn. **v3.2:** từ điển = [Phụ lục E](#phụ-lục-e--từ-điển-nhsn-2025--ksnk-bv103).

App hiện: evaluate một phần BJ/CNS/CVS/GI/LRI/REPR; **chưa** EENT/SST/USI — lệch **phần mềm**, không phải thiếu domain.

---

## Phụ lục A — Lớp sản phẩm BV103

> Không phải chương CDC. Hợp đồng UI: `domain-specification.md`, `clinical-forms.md`, `ba-*`.

### A.1. Thực thể vận hành

| Thực thể | Ghi nhận |
|----------|----------|
| Bệnh án / ADT | `nkbv_fact_benh_an` |
| Kho vi sinh | `nkbv_fact_vi_sinh` |
| Mốc timeline BA | `nkbv_fact_ba_timeline` (không chứa Foley/máy/CVC) |
| Ngày–khoa / ngày–dụng cụ | `nkbv_fact_ba_ngay_khoa`, `nkbv_fact_ba_ngay_dung_cu`; đặt–rút = view `nkbv_v_ba_dung_cu_dat_rut` |
| Phiếu sự kiện | `nkbv_fact_su_kien` |
| Mẫu số ngày | `nkbv_fact_mau_so_daily` / `_phau_thuat` (nhập tay theo khoa — không suy từ lưới ca) |

**Luồng BA-centric:** [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md). Không API HIS/LIS; copy LIS/HIS hoặc gõ; không spawn phiếu từ ngày cấy.

### A.2. State phiếu (app)

`DANG_GHI_NHAN` → `CHO_XAC_MINH` → `CHO_DUYET` → `XAC_NHAN` / `LOAI_TRU` (bắt buộc lý do).

### A.3. Dashboard

CDC SIR/SUR chuẩn cần Location mapping + predicted model + in-plan — **ngoài domain HAI này**. App hiện: **tỷ lệ thô**, mẫu số nhập tay — **không** FacWide SIR.

Quy tắc khi **có** SIR chuẩn (tương lai): `numPred < 1` → không in SIR số; Secondary BSI không đếm CLABSI; PATOS loại khỏi SIR SSI khi baseline ≠ BS1.

---

## Phụ lục B — Chuẩn CDC vs phần mềm

Đánh giá **tại 2026-08-27**. Không sửa code trong đợt domain này.

| Ch. CDC | Domain v3.1 | Phần mềm (`giam-sat-nkbv`) | Mức |
|---------|-------------|------------------------------|-----|
| 1 Overview | Đủ (HAI lâm sàng) | Một module `/giam-sat-nkbv` | Đạt vận hành |
| 2 HAI windows | Đủ | `nkbv-shared-timeline` + Secondary BSI | Đạt pilot; Transfer/LOA còn P1 |
| 3 MRP | Đủ trên giấy | **Chưa** form kế hoạch tháng | Thiếu |
| 4 BSI/CLABSI | LCBI 1–2; LCBI-3 không dùng | `evaluateBsiClabsi`; MBI rút gọn | Đạt pilot; MBI P1 |
| 5 CLIP | **Ngoài domain** | `nkbv-clip` còn (lát cũ) | Không neo SSOT |
| 6 PNEU | Người lớn PNU1-A/2/3; không PedVAP | `evaluateVaeVap(..., PNEU)` | Đạt pilot |
| 7 UTI | SUTI 1a/1b, ABUTI; không SUTI-2 | `evaluateUtiCauti`; yeast: xem audit UTI | Đạt pilot; USI **chưa** |
| 8 Retired | — | — | — |
| 9 SSI | Đủ người lớn | `evaluateSsi`; PATOS P1 | Đạt pilot |
| 10 VAE | Đủ người lớn | `evaluateVaeVap(..., VAE)` | Đạt pilot; APRV/ECMO P1 |
| 11 PedVAE | **Không dùng** | Không engine (đúng) | Đúng phạm vi |
| 12 LabID | **Ngoài domain** | `nkbv-labid-engine` còn (lát cũ) | Không neo SSOT |
| 13 Retired | — | — | — |
| 14 AUR | **Ngoài domain** | **Chưa** | Không neo SSOT |
| 15 Location | **Ngoài domain** | Mã trên khoa (lát dashboard) | Không neo SSOT |
| 16 Key terms | Đủ HAI lâm sàng | Nằm rải comment/lib | Đạt tài liệu |
| 17 Sites | **Đủ tiêu chí người lớn** | 22 loại (BJ/CNS/CVS/GI/LRI/REPR); **thiếu EENT/SST/USI engine** | Domain đủ; app một phần |

**Đủ vận hành pilot:** Ch.2 (phần), 4, 6 người lớn, 7 (chưa USI), 9, 10.  
**Domain đủ, app chưa:** USI, EENT, SST.  
**Ngoài domain:** 5, 12, 14, 15. **Chưa app MRP:** 3.

Sửa engine/form = **chat riêng** sau khi PO duyệt [Phụ lục E §E.9](#e9-ba-câu-khóa-duyệt-po-trước-khi-sửa-phần-mềm). UI/engine phải dùng **cùng mã** Phụ lục E.

---

## Phụ lục C — Nhi khoa không dùng tại BV103

Không viết thuật toán cho:

- Ch.11 PedVAE (MAP/FiO₂, NICU/Pediatric location)
- PedVAP in-plan (Ch.6 khoa nhi)
- PNU1 nhánh B (≤1 tuổi) và C (>1–≤12)
- LCBI-3, SUTI-2, USI criterion 4 (<1 tuổi)
- UMB, NEC sơ sinh, CIRC newborn, bảng birthweight Ch.16

CDC **vẫn có** các mục trên trong sổ 2025 — BV103 **không triển khai**.

---

## Phụ lục D — Crosswalk v2.0 → v3.1

| v2.0 | v3.1 |
|------|------|
| §1 Schema / device days | Phụ lục A + Ch.2 §2.8 |
| §2 State machine | Phụ lục A.2 |
| §3 Timeline Ch.2 | **Ch.2** |
| §4 Secondary BSI | Ch.2 §2.7 |
| §5 Metrics / form | Phụ lục A + clinical-forms (không đổi) |
| §6 CLABSI | **Ch.4** |
| §7 CAUTI | **Ch.7** |
| §8 VAE | **Ch.10** |
| §9 PedVAE đầy đủ | **Ch.11 stub** (không dùng) |
| §10 PNEU/PedVAP | **Ch.6** (bỏ PedVAP) |
| §11 SSI | **Ch.9** |
| §12 IAB/BONE/PJI | **Ch.17** (đủ nhánh) |
| §13 ENDO | **Ch.17.4** |
| §14 LabID | **Ngoài domain** (Ch.12 stub) |
| §15 CLIP | **Ngoài domain** (Ch.5 stub) |
| §16 AU | **Ngoài domain** (Ch.14 stub) |
| §17 Location | **Ngoài domain** (Ch.15 stub) |
| §18 Dashboard SIR | Phụ lục A.3 (ngoài domain Location/SIR) |
| *(thiếu v2)* | **Ch.3 MRP, Ch.8/13 retired, Ch.16, Ch.17 đủ mã, USI, Phụ lục E** |

---

## Phụ lục E — Từ điển NHSN 2025 / KSNK BV103

> **Vai trò:** một nguồn chữ dùng trên phiếu, bảng phân tích, engine và báo cáo.  
> **Không** thay tiêu chí trong Ch.2–4, 6–7, 9–10, 16–17 — chỉ khóa **tên gọi**.  
> Định nghĩa = **giám sát NHSN**, không phải định nghĩa lâm sàng khoa điều trị.

### E.0. Nguyên tắc ngôn ngữ

1. Cột **Mã CDC** giữ nguyên tiếng Anh / viết tắt sổ 2025 — **không dịch**.  
2. Cột **KSNK BV103** là cách gọi khi nói chuyện / UI tiếng Việt — **không** dịch từng chữ.  
3. **NKBV** = tên **module phần mềm** (`/giam-sat-nkbv`). Tử số giám sát = sự kiện **HAI** (và site Ch.17), không đổi chữ CDC thành “NKBV”.  
4. Cột **BV103:** `Dùng` = người lớn, trong domain; `Không dùng` = nhi/sơ sinh; `Ngoài domain` = CDC có, SSOT này không vận hành.  
5. Tên site **Ch.17** tiếng Việt: luôn **nhiễm khuẩn + vị trí** (vd. nhiễm khuẩn khớp, nhiễm khuẩn mô mềm). Không rút thành “nhiễm khớp”, “nhiễm mô mềm”. Không dùng “viêm …” làm tên giám sát khi CDC gọi là *infection*.

**Giữ nguyên (không thay bằng tiếng Việt trên phiếu/engine):**  
HAI, IWP, DOE, POA, RIT, SBAP, LOA, CLABSI, LCBI, MBI-LCBI, CAUTI, SUTI, ABUTI, USI, VAE, VAC, IVAC, PVAP, PNEU, PNU, VAP, SSI, PATOS, Secondary BSI, NCT, ASC/AST, MRP, in-plan, off-plan, và mọi **mã site Ch.17**.

---

### E.1. Cửa sổ thời gian (Ch.2) — hay nhầm nhất

| Mã CDC | KSNK BV103 | Định nghĩa giám sát | Ch. | Cấm nhầm | BV103 |
|--------|------------|---------------------|-----|----------|-------|
| **Calendar day** | Ngày lịch | 00:00–23:59. Mọi “ngày” protocol = ngày lịch, không phải 24 giờ tròn từ giờ đặt. | 2, 16 | Không đếm “đủ 48 giờ” theo giờ đồng hồ trừ khi protocol nói rõ. | Dùng |
| **Index / first diagnostic test** | Xét nghiệm đặt IWP | Ngày mẫu/chẩn đoán **đầu** dùng làm yếu tố tiêu chí để **mở** IWP 7 ngày. | 2 | Sốt **không** đặt IWP (không khu trú). Không = DOE. | Dùng |
| **IWP** | IWP (cửa sổ nhiễm 7 ngày) | Index + 3 ngày trước + 3 ngày sau. Mọi yếu tố tiêu chí phải nằm trong IWP. | 2, 16 | **Không** áp SSI, VAE. ENDO = IWP 21 ngày. | Dùng |
| **DOE** | DOE (ngày sự kiện) | Ngày phần tử **đầu tiên** thỏa tiêu chí **lần đầu** trong IWP. | 2, 16 | SSI: DOE trong Surveillance Period. VAE: ngày đầu worsening. Không = ngày nhập / ngày cấy dương nếu yếu tố khác sớm hơn. | Dùng |
| **POA** | POA | DOE ∈ ngày nhập (ngày 1) **hoặc** 2 ngày trước nhập **hoặc** ngày sau nhập. DOE 2 ngày trước nhập → ghi DOE = ngày 1 cho RIT. | 2, 16 | **Không** = “bệnh mang từ nhà” theo cảm tính. Không áp SSI/VAE. | Dùng |
| **HAI** | HAI | DOE **từ ngày lịch thứ 3** của nằm nội trú (ngày nhập = ngày 1). | 2, 16 | **Không** đồng nghĩa “NKBV”. **Không** = mọi nhiễm trong khuôn viên viện. Không áp SSI/VAE. | Dùng |
| **RIT** | RIT (14 ngày) | Từ DOE = ngày 1; không báo ca **cùng loại**; thêm tác nhân vào ca cũ; không đổi DOE/LOA/gắn dụng cụ. | 2, 16 | Major type: BSI, UTI, PNEU mỗi loại một RIT. Site Ch.17 = specific type. Không áp SSI/VAE. | Dùng |
| **SBAP** | SBAP | Máu phải lấy trong khoảng này mới Secondary BSI. Ch.2: IWP ∪ RIT (14–17 ngày). SSI: cố định `[DOE−3, DOE+13]` = 17 ngày. ENDO: IWP 21 ngày ∪ hết admission. | 2, 9, 17 | VAE: **không** SBAP Ch.2 — chỉ PVAP + Event Period. | Dùng |
| **Secondary BSI** | Secondary BSI | Máu matching với site nguyên phát trong SBAP (hoặc Scenario 2: máu là yếu tố bắt buộc của site). **Không** đếm CLABSI. | 2 | Không gọi “nhiễm khuẩn huyết thứ phát” nếu hiểu là bệnh lý lâm sàng khác quy kết NHSN. Yeast máu **không** Secondary cho UTI. | Dùng |
| **Matching organism** | Matching organism | Cùng loài nếu cả hai có loài; nếu một mẫu chỉ chi thì khớp ở chi. Kháng sinh đồ **không** phải khớp. | 2, 17 | Không gộp “họ” lỏng (*Enterococcus faecium* ≠ *E. faecalis*). | Dùng |
| **LOA** | LOA (khoa quy kết) | Khoa BN đang nằm **vào DOE**, trừ Transfer Rule. | 2, 16 | Không = khoa lấy mẫu / khoa mổ (trừ SSI protocol). | Dùng |
| **Transfer Rule** | Transfer Rule | DOE = ngày chuyển khoa **hoặc** ngày sau chuyển → quy kết **khoa chuyển đi**. | 2, 10 | Không áp dụng cảm tính “khoa nằm lâu hơn”. | Dùng |
| **Device-associated** | Gắn dụng cụ | HAI + dụng cụ tại chỗ **>2 ngày lịch** vào DOE **và** còn DOE hoặc ngày trước DOE. | 2, 16 | “>2 ngày lịch” ≠ 48 giờ. | Dùng |
| **Device Day 1** | Device Day 1 | Ngày đặt (và ngày rút cũng 1 Device Day). CVC sẵn lúc nhập: ngày **access nội trú đầu**. Foley/máy sẵn trước nhập: ngày nhập nội trú đầu. | 2, 4, 7, 10 | Ngắt ≥1 ngày lịch đầy đủ → Device Day 1 mới (break rule). | Dùng |

---

### E.2. Bệnh phẩm, phân lập, hình ảnh (Ch.16 + hội chứng)

| Mã CDC | KSNK BV103 | Định nghĩa giám sát | Ch. | Cấm nhầm | BV103 |
|--------|------------|---------------------|-----|----------|-------|
| **NCT** | NCT | Cấy **hoặc** xét nghiệm vi sinh không cấy, **phục vụ chẩn đoán/điều trị**. | 4, 17 | **Không** phải ASC/AST. | Dùng |
| **ASC/AST** (surveillance) | Cấy/xét nghiệm sàng lọc mang | Tìm mang để cách ly hoặc theo dõi colonize (MRSA mũi, VRE trực tràng…). | 16 | **Không** dùng thỏa HAI/Ch.17. **Không** = kháng sinh đồ. | Dùng (nghĩa này) |
| **AST** (antimicrobial susceptibility testing) | Kháng sinh đồ | Kết quả nhạy/kháng trên isolate điều trị. | 4, 16 | CDC cũng viết AST cho sàng lọc — từ điển **tách hai nghĩa**. | Dùng |
| **Surveillance cultures** | Cấy giám sát | = ASC/AST. Mẫu vô khuẩn (kể máu) **không** phải cấy giám sát. | 16 | Máu (+) vẫn eligible HAI. | Dùng |
| **Aseptically obtained** | Lấy vô khuẩn | Lấy mẫu sao cho không đưa vi sinh từ mô xung quanh. | 16, 17 | Dẫn lưu đặt vô khuẩn ≠ swab vết bẩn. | Dùng |
| **Isolate** | Isolate / phân lập | Vi sinh định danh từ một mẫu. | 4 | Không = “chủng viện” cảm tính. | Dùng |
| **Recognized pathogen** | Recognized pathogen | Tác nhân **không** nằm list common commensal NHSN. | 4 | Dùng cho LCBI 1. | Dùng |
| **Common commensal** | Common commensal | Danh sách NHSN (CoNS, *Micrococcus*, *Bacillus* trừ anthracis, *Corynebacterium* trừ diphtheriae, VGS, *Aerococcus*, *Rhodococcus*, …). | 4, 17 | ≥2 commensal không mầm bệnh **không** đủ SKIN 2a. | Dùng |
| **MBI organism** | MBI organism | Giống trong NHSN Terminology Browser — dùng GIT/IAB + máu. | 17 | Không tự suy “vi khuẩn ruột”. | Dùng |
| **CFU** | CFU | Đơn vị hình thành khuẩn lạc (nước tiểu ≥10⁵ CFU/ml cho SUTI/ABUTI). | 7 | Không quy đổi cảm tính “nhiều/ít”. | Dùng |
| **Unformed stool** | Phân không thành khuôn | Phân đổ theo khuôn lọ — yếu tố **bắt buộc** cùng độc tố cho GI-CDI 1. | 17 | Không dùng phân khuôn. | Dùng |
| **Fever (NHSN)** | Sốt giám sát | **>38,0°C** (hoặc >100,4°F) ghi hồ sơ. Không quy đổi nguồn đo. | 16 | Sốt **không** bị loại vì “do nguyên nhân khác” ở SUTI. Sốt không đặt IWP. | Dùng |
| **Clinical correlation** | Clinical correlation | Bác sĩ ghi **điều trị kháng sinh cho đúng loại nhiễm** khi imaging **mơ hồ**. | 16 | Không = “bác sĩ nghĩ là nhiễm”. Không chốt PNEU chỉ bằng chẩn đoán. | Dùng |
| **Equivocal imaging** | Imaging mơ hồ | Ảnh **không chắc** nhiễm (vd. “tụ dịch”) — bắt buộc clinical correlation. | 16 | “Áp xe thấy rõ” = chắc chắn, không mơ hồ. Pneumatosis >1 tuổi = mơ hồ (GIT). Giãn đường mật = mơ hồ (IAB/cholangitis). | Dùng |
| **Gross anatomical exam** | Đại thể | Bằng chứng nhiễm thấy khi khám hoặc trong thủ thuật. | 16, 9 | Không = chỉ mô tả trên giấy không khám/thủ thuật. | Dùng |
| **Physician** | Physician / designee | Bác sĩ điều trị **hoặc** NP/PA được ủy quyền. | 16, 17 | Không = điều dưỡng ghi cảm tính. | Dùng |
| **Organism(s)** | Organism(s) | Gồm **virus**. | 17 | Loại *Blastomyces, Histoplasma, Coccidioides, Paracoccidioides, Cryptococcus, Pneumocystis* khỏi mọi định nghĩa NHSN. | Dùng |

---

### E.3. Hội chứng người lớn (Ch.4, 6, 7, 9, 10)

| Mã CDC | KSNK BV103 | Định nghĩa giám sát | Ch. | Cấm nhầm | BV103 |
|--------|------------|---------------------|-----|----------|-------|
| **BSI** | BSI | Nhiễm khuẩn huyết giám sát (LCBI ± Secondary). | 4 | Không = “nhiễm trùng huyết” lâm sàng Sepsis-3. | Dùng |
| **LCBI** | LCBI | Laboratory-Confirmed BSI. Primary khi **không** Secondary. | 4 | LCBI-3 nhi: không dùng. | Dùng (1–2) |
| **LCBI 1** | LCBI 1 | Recognized pathogen từ ≥1 máu (cấy hoặc NCT theo rule) + không Secondary. | 4 | Ưu tiên cấy nếu có trong NCT±1 ngày. | Dùng |
| **LCBI 2** | LCBI 2 | Sốt / rét run / hạ HA + cùng commensal ≥2 máu separate occasions. | 4 | Không đủ 1 máu commensal. | Dùng |
| **LCBI 3** | — | Nhánh ≤1 tuổi. | 4 | Không viết cây. | **Không dùng** |
| **MBI-LCBI** | MBI-LCBI | Sau LCBI: giảm bạch cầu/ANC + MBI-eligible + tổn thương hàng rào niêm mạc theo Ch.4. | 4 | Không tự gắn vì “BN ung thư”. | Dùng (app P1) |
| **Primary BSI** | Primary LCBI | LCBI không Secondary. | 4 | Có CVC eligible → nhãn **CLABSI**. | Dùng |
| **CLABSI** | CLABSI | LCBI + CVC gắn dụng cụ tại DOE. | 4 | Luôn Secondary **trước** khi gắn CLABSI. Secondary ≠ CLABSI. | Dùng |
| **Central line / CVC** | CVC / central line | Ống kết thúc gần tim hoặc mạch lớn, dùng theo định nghĩa Ch.4 (kể PICC, umbilical CDC — BV103 người lớn: PICC/CVC nội trú). | 4 | Không = mọi “đường truyền”. Peripheral IV ≠ central line. | Dùng |
| **UTI** | UTI | Nhiễm khuẩn tiết niệu **nước tiểu** (SUTI hoặc ABUTI). Luôn site nguyên phát. | 7 | **Không** = USI. **Không** = UR (hô hấp trên). | Dùng |
| **SUTI 1a** | SUTI 1a / CAUTI | IUC eligible >2 ngày + triệu chứng SUTI (không dùng rắt/buốt khi ống còn) + cấy ≤2 loài, ≥1 vi khuẩn ≥10⁵ CFU/ml. | 7 | Yeast/nấm **không** thỏa UTI. | Dùng |
| **SUTI 1b** | SUTI 1b / non-CAUTI | Không đủ IUC >2 ngày; triệu chứng + ≥10⁵; rắt/buốt **được** dùng. | 7 | Không gọi CAUTI. | Dùng |
| **SUTI 2** | — | Nhánh ≤1 tuổi. | 7 | — | **Không dùng** |
| **ABUTI** | ABUTI | Không triệu chứng SUTI + nước tiểu ≥10⁵ + **máu cùng khuẩn** (không yeast). | 7 | Máu phải ∈ IWP. | Dùng |
| **CAUTI** | CAUTI | = SUTI 1a (gắn IUC). | 7 | Không = mọi UTI có Foley cảm tính. | Dùng |
| **IUC / Foley** | IUC / Foley lưu | Ống thông **lưu** niệu đạo–bàng quang. | 7 | Không: condom, in-out, nephrostomy, trên xương mu đơn thuần. | Dùng |
| **USI** | USI | **Nhiễm khuẩn hệ tiết niệu** (thận, niệu quản, bàng quang, niệu đạo, quanh thận) — bệnh phẩm **không phải nước tiểu**. | 17 | **Không** = UTI/SUTI/ABUTI/CAUTI. Đủ UTI thì không chuyển USI. | Dùng (app chưa) |
| **PNEU** | PNEU | Viêm phổi giám sát PNU1/2/3. | 6 | Người lớn thở máy **in-plan** → **VAE**, không dùng PNEU thay. | Dùng |
| **PNU1 / PNU2 / PNU3** | PNU1-A / PNU2 / PNU3 | Nhánh lâm sàng / lab / suy giảm miễn dịch. BV103: PNU1 **nhánh A**. | 6 | PNU1 B (≤1 tuổi), C (>1–≤12): không dùng. | Dùng (A/2/3) |
| **VAP** | VAP | PNEU + thở máy xâm lấn eligible tại DOE. | 6 | **Không** = VAE. PedVAP in-plan: không dùng. | Dùng |
| **Non-ventilator PNEU (HAP)** | Non-VAP PNEU | PNEU không đủ vent eligible. | 6 | HAP lâm sàng ≠ tự chốt PNEU. | Dùng |
| **VAE** | VAE | Sự kiện gắn thở máy người lớn: VAC → IVAC → PVAP. Không IWP Ch.2. | 10 | Chỉ khoa người lớn. ≥4 vent days. | Dùng |
| **VAC** | VAC | Baseline 2 ngày + worsening 2 ngày PEEP/FiO₂. DOE = ngày đầu worsening. | 10 | Không = VAP. | Dùng |
| **IVAC** | IVAC | VAC + sốt/WBC + kháng sinh mới đủ QAD. | 10 | Không Secondary BSI. | Dùng |
| **PVAP** | PVAP | IVAC + lab nhóm protocol. **Chỉ PVAP** được Secondary BSI. | 10 | Cấm flora miệng / Candida / CoNS / Enterococcus từ đờm/ETA/BAL (trừ lung/pleural). | Dùng |
| **VAE Event Period** | Event Period 14 ngày | Khóa 14 ngày từ DOE VAE; không VAE mới chồng. | 10 | **Không** = RIT Ch.2. | Dùng |
| **QAD** | QAD | Qualifying Antimicrobial Days (≥4) trong cửa sổ VAE. | 10 | Không đếm mọi kháng sinh cảm tính. | Dùng |
| **SSI** | SSI | Nhiễm khuẩn vết mổ trong Surveillance Period 30/90 ngày. Không IWP/POA/RIT Ch.2. | 9 | DOE ≠ IWP. Superficial luôn 30 ngày. | Dùng |
| **Surveillance Period (SSI)** | SP 30/90 | Ngày mổ = ngày 1. 30 hoặc 90 ngày theo độ sâu + mã mổ. | 9, 16 | Reset nếu mổ NHSN mới cùng vết. | Dùng |
| **Superficial / Deep / Organ-Space** | Nông / sâu / tạng-khoang | Độ sâu SSI; **sâu nhất thắng**. Organ-Space cần ≥1 tiêu chí site Ch.17. | 9 | Stitch abscess, chân đinh, cellulitis đơn thuần **không** Superficial. | Dùng |
| **PATOS** | PATOS | Nhiễm khuẩn **cùng độ sâu** đã có lúc mổ (Operative Note). | 9 | Không = “BN bẩn trước mổ” cảm tính. | Dùng |
| **SSI-SBAP** | SBAP 17 ngày | `[DOE−3, DOE+13]`. | 9 | Không dùng IWP ∪ RIT Ch.2. | Dùng |

---

### E.4. Site Ch.17 — nhóm và mã (giữ nguyên)

Chi tiết nhánh tiêu chí: [Ch.17](#17-định-nghĩa-vị-trí-nhiễm-khuẩn-cụ-thể). Bảng này **chỉ tên**.

| Mã CDC | Nhóm | KSNK BV103 | Cấm nhầm | BV103 |
|--------|------|------------|----------|-------|
| **BJ** | — | Nhiễm khuẩn xương–khớp (nhóm) | Không = “viêm khớp” lâm sàng. | Dùng |
| **BONE** | BJ | Nhiễm khuẩn xương (osteomyelitis giám sát) | JNT/PJI + BONE → báo **BONE**. MED+BONE sau mổ tim → **MED**. | Dùng |
| **DISC** | BJ | Nhiễm khuẩn khoang đĩa đệm | Không = BONE nếu chỉ đĩa. | Dùng |
| **JNT** | BJ | Nhiễm khuẩn khớp / bursa | **Không** Organ/Space sau HPRO/KPRO (dùng PJI). | Dùng |
| **PJI** | BJ | Nhiễm khuẩn quanh khớp giả | Chỉ Organ/Space sau **HPRO/KPRO**. Cutoff CRP/ESR/WBC **chỉ** giám sát NHSN. | Dùng |
| **CNS** | — | Nhiễm khuẩn thần kinh trung ương (nhóm) | — | Dùng |
| **IC** | CNS | Nhiễm khuẩn nội sọ (áp xe / viêm não) | MEN+viêm não → **MEN**; MEN+áp xe sau mổ → **IC**. | Dùng |
| **MEN** | CNS | Nhiễm khuẩn màng não / não thất | Co giật ≠ dấu dây thần kinh sọ. Shunt >90 ngày: CNS-MEN, không SSI. | Dùng |
| **SA** | CNS | Nhiễm khuẩn tủy (áp xe / ngoài–dưới màng cứng) | MEN+SA sau mổ → **SA**. | Dùng |
| **CVS** | — | Nhiễm khuẩn tim mạch (nhóm) | — | Dùng |
| **CARD** | CVS | Nhiễm khuẩn cơ tim / màng ngoài tim | Không = ENDO. | Dùng |
| **ENDO** | CVS | Nhiễm khuẩn nội tâm mạc | IWP **21 ngày**; RIT/SBAP hết admission; Secondary chỉ matching. Không = “bác sĩ chẩn đoán IE”. | Dùng |
| **MED** | CVS | Nhiễm khuẩn trung thất | — | Dùng |
| **VASC** | CVS | Nhiễm khuẩn động/tĩnh mạch | Đủ LCBI → **LCBI**, không VASC. Pus + máu matching: ngoại lệ field BSI, không đổi thành VASC. | Dùng |
| **EENT** | — | Nhiễm khuẩn mắt–tai–mũi–họng–miệng (nhóm) | — | Dùng (app chưa) |
| **CONJ** | EENT | Nhiễm khuẩn kết mạc | Không hóa chất AgNO₃; không CONJ riêng trong bệnh virus (vd. UR). Mắt khác → **EYE**. | Dùng |
| **EAR** | EENT | Nhiễm khuẩn tai / xương chũm | Gồm externa, media, interna, mastoid — từng nhánh. | Dùng |
| **EYE** | EENT | Nhiễm khuẩn mắt (không kết mạc) | Không = CONJ. | Dùng |
| **ORAL** | EENT | Nhiễm khuẩn khoang miệng | Herpes **tái phát** không HAI. | Dùng |
| **SINU** | EENT | Nhiễm khuẩn xoang | Cần NCT khi thủ thuật **hoặc** triệu chứng + imaging. | Dùng |
| **UR** | EENT | Nhiễm khuẩn đường **hô hấp trên** | **Không** = nước tiểu / UTI. Loại đờm và hút khí quản. | Dùng |
| **GI** | — | Nhiễm khuẩn tiêu hóa (nhóm) | — | Dùng |
| **CDI** / **GI-CDI** | GI | Nhiễm khuẩn *C. difficile* **lâm sàng** (Ch.17) | **Không** = LabID CDI (Ch.12, ngoài domain). Không dùng nhãn HO/CO/Incident. | Dùng |
| **GE** | GI | Nhiễm khuẩn dạ dày–ruột (GE) | GE+GIT → chỉ **GIT**. | Dùng |
| **GIT** | GI | Nhiễm khuẩn ống tiêu hóa | Loại GE, ruột thừa, CDI. | Dùng |
| **IAB** | GI | Nhiễm khuẩn ổ bụng (không nêu nơi khác) | Loại viêm gan virus; không báo viêm tụy trừ khi nhiễm khuẩn. | Dùng |
| **LRI** | — | Nhiễm khuẩn hô hấp dưới không PNEU (nhóm) | — | Dùng |
| **LUNG** | LRI | Nhiễm khuẩn phổi / màng phổi (không PNEU) | LUNG+PNEU → PNEU, trừ SSI-LUNG thì báo cả hai. Dịch màng phổi >24 giờ dẫn lưu: không LUNG 1. | Dùng |
| **REPR** | — | Nhiễm khuẩn sinh dục (nhóm) | — | Dùng |
| **EMET** | REPR | Nhiễm khuẩn nội mạc tử cung | Chorioamnionitis → **OREP**, không EMET. | Dùng |
| **EPIS** | REPR | Nhiễm khuẩn vết cắt tầng sinh môn | Hiếm BV103 — vẫn trong từ điển. | Dùng |
| **OREP** | REPR | Nhiễm khuẩn sâu chậu / sinh dục | Loại nước tiểu và tăm âm đạo. Đủ UTI + OREP không SSI → chỉ UTI. | Dùng |
| **VCUF** | REPR | Nhiễm khuẩn cuff âm đạo | Chỉ sau **HYST/VHYS**; SSI-VCUF. | Dùng |
| **BRST** | REPR | Nhiễm khuẩn vú | Nhánh 3 không Organ/Space SSI sau thủ thuật BRST. | Dùng |
| **SST** | — | Nhiễm khuẩn da–mô mềm (nhóm) | — | Dùng (app chưa) |
| **BURN** | SST | Nhiễm khuẩn vết bỏng | Ghép tạm → BURN; autograft vĩnh viễn → SKIN/ST. | Dùng |
| **DECU** | SST | Nhiễm khuẩn loét tỳ đè | Không dùng SKIN/ST. | Dùng |
| **SKIN** | SST | Nhiễm khuẩn da / dưới da | Không trứng cá; không DECU/BURN/VASC. | Dùng |
| **ST** | SST | Nhiễm khuẩn mô mềm (cơ/cân) | Không = SKIN. Ưu tiên DECU/BURN/BRST/OREP/VASC. | Dùng |
| **UMB** | SST | Nhiễm khuẩn rốn (omphalitis) | Sơ sinh. | **Không dùng** |
| **NEC** | GI | Nhiễm khuẩn ruột hoại tử sơ sinh (NEC) | — | **Không dùng** |
| **CIRC** | SST | Nhiễm khuẩn chỗ cắt bao quy đầu sơ sinh | — | **Không dùng** |

---

### E.5. Mẫu số, kế hoạch tháng (trong domain)

| Mã CDC | KSNK BV103 | Định nghĩa giám sát | Ch. | Cấm nhầm | BV103 |
|--------|------------|---------------------|-----|----------|-------|
| **Patient days** | Patient days / ngày nằm khoa | Số BN tại khoa trong kỳ (đếm ngày hoặc sampling tuần). | 16 | **Không** = Days present (AUR). | Dùng (mẫu số thô) |
| **Device days** | Device days | Số BN **có dụng cụ** tại khoa trong kỳ. | 16 | Không = patient days. | Dùng |
| **In-plan** | In-plan | Cam kết làm **đủ** protocol đã khai MRP. | 3, 16 | App hiện **chưa** MRP — không tuyên bố FacWide in-plan. | Ghi nhận |
| **Off-plan** | Off-plan | Theo dõi nội bộ, không CMS/NHSN publications. | 3, 16 | Không = “làm tắt tiêu chí”. | Ghi nhận |
| **MRP** | MRP | Kế hoạch báo cáo tháng (form 57.106). | 3 | Chưa form app. | Ghi nhận |

---

### E.6. Ngoài domain — vẫn ghi để **cấm nhầm**

CDC vẫn có các mục dưới; **SSOT HAI lâm sàng không vận hành**. App có thể còn lát cũ — không neo file này.

| Mã CDC | KSNK BV103 | Một câu | Cấm nhầm |
|--------|------------|---------|----------|
| **CLIP** | — | Process tuân thủ **đặt** CVC (Ch.5). | Không phải ca HAI/CLABSI. |
| **LabID Event** | — | Sự kiện **chỉ lab** + onset/de-dup (Ch.12). Không IWP/DOE/RIT Ch.2. | **Không** = phiếu HAI (`nkbv_fact_su_kien`). **Không** = cờ cách ly `is_mdro`. |
| **Infection Surveillance (MDRO)** | — | HAI lâm sàng **và** phenotype MDRO. | Không = LabID. |
| **GI-CDI** | GI-CDI | Site Ch.17 — **trong domain**. | Không dán nhãn LabID (HO/CO/Incident/Recurrent). |
| **Days present** | — | Mẫu số **AUR** (Ch.14). | **Không** = patient days. |
| **AU / AR / SAAR** | — | Dùng / kháng kháng sinh; cấm nhập tay. | Không form DOT tay. |
| **CDC Location / 80% acuity / Virtual location** | — | Map khoa cho SIR (Ch.15). | Mã trên danh mục ≠ SIR chuẩn. |
| **SIR / SUR** | Tỷ lệ chuẩn hóa CDC | Observed / predicted. `numPred < 1` → không in SIR số. | Dashboard hiện = **tỷ lệ thô**, không SIR. |
| **FacWideIN** | — | Toàn viện nội trú (AUR/LabID/SIR). | Không tự suy từ tổng khoa. |

Ba sổ **không gộp:** phiếu HAI ≠ LabID Event ≠ cờ MDRO cách ly.

---

### E.7. Tường lửa module BV103

| Module | Việc | **Không** thuộc NKBV / HAI |
|--------|------|----------------------------|
| **NKBV** (`/giam-sat-nkbv`) | Phát hiện, phân loại, ghi nhận **HAI** (+ site Ch.17) | — |
| **VST** | 5 thời điểm WHO vệ sinh tay | Không phân loại CLABSI/CAUTI/SSI |
| **GSC** | Phiên bảng kiểm tuân thủ | Không engine HAI; không ghi `nkbv_fact_*` |
| **CSSD** | Dụng cụ / mẻ tiệt khuẩn | Chỉ **liên kết** QR bộ với SSI khi có mã quy trình |
| **QLCV** | Công việc / kanban | Không ca HAI |
| **Dashboard** | Đọc số đã chốt | Không tự suy SIR CDC |

---

### E.8. Nhi khoa / sơ sinh — không dùng tại BV103

PedVAE; PedVAP in-plan; LCBI-3; SUTI-2; PNU1 B/C; USI criterion 4; IC/MEN/CARD/MED/VASC/UR nhánh ≤1 tuổi; UMB; NEC sơ sinh; CIRC; birthweight NHSN; apnea sơ sinh Ch.16.

CDC **vẫn có** — BV103 **không triển khai**. Chi tiết: [Phụ lục C](#phụ-lục-c--nhi-khoa-không-dùng-tại-bv103).

---

### E.9. Ba câu khóa (duyệt PO trước khi sửa phần mềm)

Dùng đúng Phụ lục E:

1. **HAI** là sự kiện giám sát khi DOE ≥ ngày lịch 3; **NKBV** là tên module; **POA** là khung ngày nhập — không phải “bệnh từ nhà” cảm tính.  
2. Phiếu HAI ≠ LabID Event ≠ cờ cách ly MDRO. LabID **ngoài domain** này; GI-CDI Ch.17 **trong** domain.  
3. **UTI/SUTI/CAUTI** = nhiễm khuẩn tiết niệu (nước tiểu); **USI** = nhiễm khuẩn hệ tiết niệu (không phải nước tiểu); **UR** = nhiễm khuẩn đường hô hấp trên; **patient days** ≠ **Days present** (AUR, ngoài domain).

---

## Phụ lục F — Quy trình xác định ca và thu thập dữ liệu (BV103)

> **File đầy đủ (đọc file này, không phình SSOT):** [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md)

Tóm tắt khóa:

- Ba lớp: bệnh án ≠ kho vi sinh ≠ phiếu HAI.
- **LIS:** copy bảng/Excel. Đối chiếu `ma_benh_an`: **đã có → không bổ sung/không đè bệnh án**, chỉ gắn XN; **chưa có → tạo bệnh án từ LIS**.
- **HIS / gõ tay:** cổng hồ sơ bệnh án, cùng kiểu copy — không tạo trùng mã.
- Triệu chứng / CĐHA trên timeline = **thông tin bệnh án** (`nkbv_fact_ba_timeline`), máy kéo vào phiên phân tích.
- Ngày cấy ≠ DOE ≠ HAI. Máu: Secondary **trước** CLABSI. Đờm + thở máy eligible → VAE, không mặc định VAP.
- Không API HIS/LIS. Không spawn phiếu lúc copy.

---

*Hết Domain SSOT v3.3 — HAI lâm sàng CDC 2025 + Phụ lục E từ điển. Quy trình ca/dữ liệu: `hai-identification-data-flow-20260827.md`. Không API HIS/LIS. Không CLIP/LabID/AUR/Location. Không sửa phần mềm trong đợt này.*
