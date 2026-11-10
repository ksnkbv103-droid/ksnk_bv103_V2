# Kế hoạch tối giản hóa giao diện (UI redesign) — BV103

> Trạng thái: **ĐỀ XUẤT, chờ PO duyệt** · Lập 2026-11-10 · Nhánh `claude/ui-design-minimal-professional-5142d5`
> File tiến độ của việc này (cập nhật tại đây, không tạo file khác). Đọc xong có thể `/clear`.
> Liên quan: [`page-chrome-contract-20260731.md`](../reference/architecture/page-chrome-contract-20260731.md) (luật khung trang đã có) · [`principles.md`](principles.md).

## 1. Vấn đề PO nêu (2026-11-10)

1. Giao diện rối, phức tạp, thiếu tương phản.
2. Kích thước ô/nút action không đều, không tương xứng.
3. Quá nhiều lớp (layer) lồng nhau.
4. Các trang thiếu đồng bộ trong toàn hệ thống.

## 2. Số đo hiện trạng (đo thật ngày 2026-11-10, localhost:3001, viewport 1440)

| Chỉ số | Giá trị | Ý nghĩa |
|---|---|---|
| `/giam-sat-vst`: phần tử có viền/bóng | 53/325 | hộp lồng hộp |
| `/giam-sat-vst`: số độ đậm chữ | 6 (400→900) | không có thứ bậc |
| `/giam-sat-vst`: cỡ chữ | 10, 12, 13, 14, 19px | có chữ 10px |
| Chiều cao control `/giam-sat-vst` | 13, 30, 40, 44px | token quy định 40 |
| Chiều cao control `/quan-ly-cong-viec` | 16, 20, 36, 40, 44px | lệch trang VST |
| Bo nút | VST: 4px+8px · QLCV: 0px+8px | không một thước |
| Lớp hộp lồng tối đa | VST: 3 · QLCV: 4 | luật ghi ≤ 3 |
| Tiêu đề trong `<main>` | VST: 14px/600 · QLCV: không có | token ghi 18px |

Đo toàn mã nguồn (grep):

| Chỉ số | Số lượng |
|---|---|
| `page.tsx` | 52 |
| File dùng `KsnkPageShell` / `KsnkPageChrome` | 9 / 9 (≈ 17%) |
| File dùng `Bv103AnalyticsPageFrame` | 6 |
| File có `<button` thô | 237 |
| File dùng `components/ui/button` | 2 |
| File import `bv103LayoutChrome` / `bv103DesignTokens` | 81 / 69 |
| `text-[11px]` (9/10px = 0, cổng `layout:typography-check` đang chặn) | 959 chỗ |
| `rounded-[...]` tự đặt | 317 chỗ |
| `h-[...]` / `min-h-[...]` tự đặt | 172 chỗ |
| Bo góc theo thước Tailwind: `md` / `lg` / `xl` / `2xl+` | 57 / 325 / 234 / 17 (4 thước lẫn lộn) |
| `font-bold/extrabold/black` · `shadow-lg/xl/2xl` | 189 · 17 |
| Trang dùng trực tiếp shell trong `page.tsx` | 3/52 |

> **Đính chính (Lát 0, 2026-11-10):** bảng trên là số chuẩn do `scripts/ui-audit.mjs` đếm (loại file token, in ấn, spec). Các số ở lần grep thô trước đó (989 / 345 / 85 / 237 file) lệch vì tính cả file token/spec. Chữ **9–10px trong mã nguồn là 0** (chỉ còn 1 chỗ `text-[0.625rem]`); chữ 10px thấy ở trang VST khi chạy là từ chỗ đó, không phải hàng trăm chỗ. Hai cổng cũ `layout:typography-check` và `layout:drift-check` đều đang **pass** — chúng không bắt được kiểu lệch này (cỡ control, thước bo, độ lồng lớp, trang không dùng shell).

### Đo runtime theo route (Lát 0 — `scripts/data/ui-audit-runtime-baseline.json`)

| Route | Lớp hộp lồng | Chiều cao control (px) | Bo control (px) |
|---|---|---|---|
| `/giam-sat-vst` | 3 | 13, 30, 40, 44 | 0, 4, 8 |
| `/giam-sat-chung/tuan-thu` | 3 | 40, 48 | 8 |
| `/giam-sat-nkbv` | 3 | 13, 29, 36, 40, 44 | 0, 8, 12, pill |
| `/bao-cao-tong-hop` | 4 | 28, 36, 40, 44 | 0, 6, 8 |
| `/chat-thai-do-vai` | 4 | 30, 34, **56, 60** | 8 |
| `/quan-ly-cong-viec` | 4 | 16, 20, 36, 40, 44 | 0, 8 |
| `/quan-tri-he-thong/nhan-su` | 3 | 16, 32, 34, 36, 40 | 0, 8, 12 |

Đo bổ sung (cùng ngày, sau khi chờ trang tải đủ):

| Route | Lớp hộp lồng | Chiều cao control (px) | Bo control (px) |
|---|---|---|---|
| `/cssd-dung-cu` | 3 | 16, 20, 36, 40, 44, 48 | 0, 6, 8, 12 |
| `/cssd-su-co` | 1 | 32, 40, 44, 48, **86** | 0, 6, 8 |
| `/cssd-quy-trinh` (và `?tab=batch`) | 2 | 36, 40, 44, 45, 48 | 6, 8, 12 |
| `/cssd-thiet-bi` | 2 | 16, 36, 44, 48, **112** | 0, 6, 8, 12 |
| `/cssd-hoa-chat` | 1 | 27, 33, 34, 39, 43, 44, 54, **70** | 8 |
| `/thong-ke/vst` | **6** | 28, 36, 40 | 6, 8 |
| `/thong-ke/gsc` | **5** | 36, 44, 60, 64, 76, 128, **287** | 0, 4, 6, 8 |
| `/lich-su/vst`, `/lich-su/gsc` | 2 | 20, 36, 44, 48 | 0, 8, 12 |
| `/tai-khoan` | 2 | 44, 48 | 8 |

Nhận xét: mỗi trang một bộ chiều cao (tới 8 cỡ trong một trang, như `/cssd-hoa-chat`); chỉ giám sát chung gần chuẩn (40/48, bo 8). Độ lồng 3–4 lớp ở nhóm giám sát/quản lý; **Thống kê lồng 5–6 lớp, sâu nhất hệ thống** (đúng ưu tiên Lát 5); nhóm CSSD và Lịch sử nông hơn (1–3). Chiều cao control rất lớn (86–287px) là ô nhập nhiều dòng/biểu đồ lẫn trong tập `button,input,select,textarea`, cần lọc khi so sánh. Bo 6/8/12 cùng xuất hiện ở hầu hết trang.

**Nguyên nhân "rỗng" lần đo đầu:** đo quá sớm (chờ 8 giây) và một lần phiên đăng nhập/dev server hết hạn. Trang Thống kê và Lịch sử cần 20–30 giây mới tải xong (hiện "Đang tải số liệu…" trước đó) — quy tắc đo: chờ đến khi `<main>` có ≥ 25 phần tử.

**Chưa đo (đã cắt khỏi phạm vi Lát 0):** `/cssd-erp/report`, các trang con quản trị còn lại, `/dao-tao/*`, `/giam-sat`, `/qr`. `/thong-ke` chuyển hướng sang `/thong-ke/vst`; `/cssd-erp/batch` sang `/cssd-quy-trinh?tab=batch`. `/dao-tao` chỉ có 23 phần tử, 0 control. Danh sách ở `not_measured` trong file baseline; đo khi migrate từng trang ở các lát sau.

## 3. Nguyên nhân gốc

**Luật đã có, nhưng không bắt buộc.** `page-chrome-contract` ghi sẵn: một band chrome, `btnPrimary`/`btnSecondary`, `bv103-control-h`, cấm `h-16`/`shadow-lg` tùy hứng. Thực tế 237 file dùng `<button` thô, 345 `rounded-[]` tự đặt, 989 chữ ≤ 11px. Luật nằm ở văn xuôi, không có công cụ chặn → mỗi trang trôi theo hướng riêng. Sửa từng trang sẽ lại lệch; phải **sửa gốc (token) + bộ component dùng chung + lint chặn tụt lùi**.

## 4. Các đề xuất và lý do (phân tích)

### 4.1 Quy tắc lớp — PO ĐÃ ĐỒNG Ý
Tối đa 2 lớp thấy được: nền trang → panel trắng. Trong panel: nhóm tách bằng khoảng trắng hoặc đường kẻ mảnh, **không** hộp lồng.
- Lý do: luật Gestalt (nhóm gần nhau = một nhóm). Mỗi viền thêm một "ranh giới" mắt phải xử lý; 53 viền/trang là nhiễu.
- Thay đổi token: `bv103-layer-inset` (nền xám + viền) chuyển thành chỉ khoảng cách + đường kẻ; hộp lồng trong panel không còn viền/bóng.
- Ngoại lệ có chú thích: bảng dữ liệu, dialog (là lớp nổi riêng), vùng cảnh báo.
- Rủi ro: trang đang dựa vào hộp để nhóm (VST 3 cột nhân viên) cần nhóm lại bằng spacing/đường kẻ.

### 4.2 Ba cỡ control, một bo góc
`sm` 32px (thao tác trong bảng) · `md` 40px (mặc định) · `lg` 48px (nút chính, vùng chạm điện thoại 44–48). Bo 8px mọi control; chip/pill riêng.
- Lý do: vùng chạm tối thiểu ~44px (Apple HIG) cho điện thoại hiện trường; control cạnh nhau cùng cỡ → hàng gọn. Ba cỡ đủ cho mọi nhu cầu; nhiều hơn là tự đặt.
- Hiện token `--bv103-control-h` đã có (40/44) nhưng nhiều nơi bỏ qua; token mới thêm `sm`/`lg`.
- Cùng hàng thì cùng cỡ; checkbox/radio 16px, vùng chạm bằng cả nhãn.
- Phải giữ khóa PO: ô chọn VST `#026f17` chữ trắng, năm mốc một hàng. Không đổi.

### 4.3 Thang chữ: 3 cỡ, 3 độ đậm
Cỡ: 12 (nhãn/ghi chú), 14 (nội dung), 18 (tiêu đề), cộng số KPI. Đậm: 400/500/600. Bỏ chữ 9–11px và độ đậm 700–900.
- Lý do: 6 độ đậm và 5 cỡ = không có "cái gì quan trọng nhất". Chữ 10px khó đọc ở hiện trường.
- Chi phí: 989 chỗ `text-[9|10|11px]` — **không sửa hàng loạt một lần**. Đổi token để chữ mặc định đúng, rồi dùng ratchet (mục 4.6) để không tăng thêm và dọn dần theo trang khi chuyển trang.

### 4.4 Tương phản có chủ đích
Nền `#f1f5f9` (hơi đậm hơn hiện `#f8fafc`) để panel trắng nổi lên; panel dùng bóng nhẹ, bỏ viền; chữ chính `#0f172a`, chữ phụ `#475569`; không dùng màu chữ dưới 4,5:1.
- Số đo (xấp xỉ): `#94a3b8` trên trắng ≈ 2,6:1 (**không đạt** WCAG AA, đang dùng ở `bv103-type-note`); `#64748b` ≈ 4,8:1 (đạt nhưng ở 11px quá nhỏ); `#475569` ≈ 7,6:1.
- Kiểm bằng script tính tỉ số tương phản trên token (không bằng mắt).
- Rủi ro: chỉ đổi màu token — thấp; cần xem lại 5 màn chính để chắc không có chữ dính nền.

### 4.5 Màu mang nghĩa, một hành động chính
Xanh `#026f17` = hành động chính (đúng một nút nền xanh mỗi màn). Nút phụ = viền mảnh/ghost. Đỏ = lỗi/phá hủy. Vàng = cảnh báo. Lỗi hiện **sau khi chạm hoặc bấm lưu**, không hiện sẵn (VST đang lặp cảnh báo đỏ 3 lần).
- Lý do: Hick/Fitts — ít lựa chọn cạnh tranh sự chú ý thì quyết định nhanh hơn; người dùng bận (điều dưỡng) cần biết "bấm gì tiếp".

### 4.6 Chống tụt lùi bằng script (ratchet), không bằng văn xuôi
Script đếm: `rounded-[`, `h-[`, `text-[9–11px]`, `<button` thô ngoài `Button`, class chiều cao tự đặt trên `button/input/select`. Lưu số baseline; **CI/verify fail nếu số tăng**, giảm thì cập nhật baseline. Gắn vào `verify:quick`.
- Lý do: luật có thể viết thành regex thì đặt ở lint (nguyên tắc cá nhân của PO). Đây là cơ chế duy nhất giữ đồng bộ lâu dài; không cần sửa 989 chỗ một lúc.

### 4.7 Bộ component dùng chung
`Panel`, `SectionHeader`, `Field` (nhãn + control + lỗi), `Button` (sm/md/lg, primary/secondary/ghost/danger), `Chip`, `StatTile`.
- Hiện: `components/ui/` chỉ có `button` (2 file dùng) và `dialog`; `Button` hiện chưa là chuẩn.
- Chúng chỉ **thêm mới**; trang cũ không đổi đến khi tới lượt chuyển. Mỗi component mỏng, dựa trên token đã có (`bv103LayoutChrome`/`DesignTokens`) — **không** thay bằng thư viện ngoài (tradeoff: thư viện như shadcn đầy đủ hơn nhưng kéo theo đổi lớn, rủi ro cho pilot; chọn bản mỏng tự viết).

## 5. Câu hỏi PO: "L0 dùng trang chung duy nhất có ảnh hưởng các trang khác không?"

Đã đổi tên để khỏi nhầm: trong contract hiện tại **"L0" = App Header**; việc "khung trang chung" của tôi gọi là **Lát 3 – Khung trang (shell)**.

**Trả lời: có ảnh hưởng, nhưng kiểm soát được, vì ba lẽ.**
1. **Khung trang chung đã tồn tại** (`KsnkPageShell`, `KsnkPageChrome`, contract). Việc cần làm là *bắt các trang còn lại dùng nó*, không phải tạo hệ mới. Hiện 9/52 trang dùng trực tiếp (layout module có thể bọc hộ một số trang — cần kiểm ở Lát 0).
2. **Chuyển từng trang, không đổi hàng loạt.** Component/shell mới thêm cạnh cái cũ; mỗi trang chuyển riêng, verify riêng, commit riêng. Trang chưa chuyển giữ nguyên.
3. **Shell chỉ chạm khung ngoài**: tiêu đề/tab/thanh công cụ/padding. Không chạm dữ liệu, quyền, route, action, RPC, logic lâm sàng.

**Những trang/phần phải để ngoại lệ (không ép vào shell chuẩn):**
- Workstation quét QR/hiện trường mobile (`engineering-guidelines` § mobile; đã có exception ghi sẵn trong contract).
- Bản in (`PrintLayout`), màn full-bleed của `NkbvBaMultiTimelineWorkspace`.
- Cơ chế cuộn mobile `[data-bv103-app-scroll]` (hotfix Android đơ khi body+main cùng cuộn): **không đổi**.
- `/thong-ke`: chrome sticky gộp tab module + bộ lọc theo contract — giữ.

**Rủi ro thật cần theo dõi:** trang dùng chiều cao cố định (`h-[calc(...)]`) phụ thuộc padding cũ có thể bị lệch cuộn; kiểm từng trang bằng ảnh trước/sau ở 3 khung (1440/768/375).

## 6. Lát công việc (tuần tự, mỗi lát verify + commit riêng khi PO đã duyệt kế hoạch)

| Lát | Nội dung | File dự kiến (≤ 8) | Verify | Ảnh hưởng |
|---|---|---|---|---|
| 0 | **Baseline**: script đo mọi route (chiều cao control, bo góc, độ lồng, cỡ chữ) + ảnh chụp 5 màn chính ở 3 khung; ghi baseline ratchet | `scripts/ui-audit.mjs` (mới), `docs/ux/ui-redesign-plan.md` | chạy script, lưu số | Không đổi UI |
| 1 | **Token**: màu, thang chữ, 3 cỡ control, bo, bóng, quy tắc lớp; sửa màu note | `globals.css`, `bv103-design-tokens.ts`, `bv103-layout-chrome.ts` | `verify:quick` + ảnh 5 màn | **Lan toàn app** (81+69 file import) qua 3 file; xem lại 5 màn |
| 2 | **Component dùng chung** (`Panel`, `Button`, `Field`, `Chip`, `StatTile`, `SectionHeader`) | `components/ui/*` (mới) | `verify:quick` | Chỉ thêm, chưa trang nào dùng |
| 3 | **Khung trang + Header/Sidebar**: menu avatar gom email/đổi mật khẩu/đăng xuất; nhãn nhóm sidebar; tab gạch chân; cập nhật contract | `Header.tsx`, `Sidebar.tsx`, `KsnkPageChrome.tsx`, `KsnkPageShell.tsx`, `page-chrome-contract-…md` | `verify:quick` + test tay đăng xuất/đổi MK/menu mobile | Toàn app (chrome), nhưng chỉ khung ngoài |
| 4 | **VST/GSC form** (đang dùng thật): phẳng hóa 3 lớp, một nút lưu chính, lỗi hiện đúng lúc | form giám sát (≈ 5–6 file) | `verify:quick`, ≥ 3 kịch bản tay (nhập, ghi nhận, lỗi) | Chỉ VST/GSC; giữ khóa PO |
| 5 | **Thống kê**: KPI lớn, bảng bớt viền, biểu đồ ít màu | `thong-ke`, `charts` | `verify:quick` | Chỉ thống kê |
| 6 | **Ratchet lint** vào `verify:quick` | script + `package.json` | script fail khi tăng | Chặn tụt lùi |
| 7+ | Chuyển dần module khác (CSSD, NKBV, QLCV, Đào tạo) theo roadmap khi module có người dùng | theo trang | theo trang | Từng module |

Lưu ý: thứ tự 1→2→3 vì tokens là gốc, component dựa token, shell dùng component. Không song song (nhiều lát ghi cùng file token/shell).

## 7. Ngoài phạm vi (không đụng)

Logic lâm sàng, engine VST, DB/RPC/RLS, quyền, route, nội dung chữ nghiệp vụ, bản in. Không đổi khóa PO 2026-10-09 (VST: ô chọn `#026f17` chữ trắng, năm mốc một hàng, quá trần bỏ mốc cũ nhất không toast).

## 8. Câu hỏi còn mở (PO trả lời một lần)

1. Phạm vi vòng đầu: Lát 0→4 (token, component, shell, VST/GSC), rồi Thống kê? (khuyến nghị: có)
2. Dựng **mock HTML trước/sau** một trang trước khi sửa code? (khuyến nghị: có — rẻ hơn hoàn tác)
3. Sidebar: giữ sáng (khuyến nghị: giữ, đỡ đổi nhiều) hay chuyển tối?

## 9. Tiến độ

- [x] Khảo sát + đo hiện trạng (2026-11-10)
- [x] Viết kế hoạch này
- [x] PO duyệt kế hoạch (2026-11-10: «Duyệt, làm Lát 0»). Mục 8 chưa trả lời riêng → mặc định theo khuyến nghị (L0→4, có mock, giữ sidebar sáng) cho tới khi PO đổi.
- [x] **Lát 0 (phần chính xong, 2026-11-10):** `scripts/ui-audit.mjs` (đếm tĩnh + `--check` ratchet) · `scripts/data/ui-audit-baseline.json` · `scripts/ui-audit-runtime.snippet.js` · `scripts/data/ui-audit-runtime-baseline.json` (8 route). `node scripts/ui-audit.mjs --check` → OK. Đã đo thêm 10 route (tổng 18 route có số); còn thiếu 5 route nhỏ (mục 2) và ảnh baseline 5 màn × 3 khung (ảnh chụp trong phiên không lưu bền; cần chụp lại trước Lát 1 và lưu vào thư mục ngoài repo hoặc PO tự giữ). Chưa nối ratchet vào `verify:quick` (việc của Lát 6).
- [x] Lát 1 Token (2026-11-10, chỉ sửa `globals.css`): nền trang `#f1f5f9`; `--text-secondary` `#475569`; nhãn 11→12px; `bv103-type-note` `#94a3b8`→`--text-muted`; thêm `--bv103-control-h-sm/md/lg` 32/40/48; `bv103-layer-panel` bỏ viền; `bv103-layer-inset` = vạch mảnh trên, không nền/khung. `ui-audit --check` OK (không đổi số), typography/drift-check OK, `tsc --noEmit` OK. **Chưa xác minh**: `verify:quick` build lỗi do worktree thiếu `.env.local` (không phải do CSS); chưa xem 5 màn hình bằng mắt; chưa có script đo tương phản.
- [x] Lát 2 Component dùng chung (2026-11-10): thêm `src/components/ui/bv103/` (`Bv103Button` sm/md/lg × primary/secondary/ghost/danger, `Bv103Panel`/`PanelDivider`/`SectionHeader`, `Bv103Field`/`Input`, `Bv103Chip`/`StatTile`). `button.tsx` cũ giữ nguyên (2 file dùng). Chưa trang nào dùng. `scripts/ui-audit.mjs` bỏ qua thư mục này (nơi định nghĩa). tsc, eslint (thư mục mới), ui-audit, typography/drift-check đều OK. Đã xem VST sau Lát 1: nền mới, nhãn 12px, không vỡ layout (chỉ 1 màn hình).
- [x] Lát 3 Khung trang (2026-11-10): `Header.tsx` gom email/Đổi mật khẩu/Đăng xuất vào một menu avatar (Esc + bấm ngoài để đóng), bỏ viền dưới header (chỉ còn `--shadow-app-header`); `Sidebar.tsx` chữ ≥12px, màu `--text-secondary/--text-muted`, mục active bỏ bóng, logo bỏ drop-shadow; `.section-label` 12px `--text-muted`; contract thêm luật 6 (tài khoản/sidebar). `ui-audit --check` OK, `tsc --noEmit` OK, eslint 2 file OK. **Chưa làm**: tab gạch chân (tab nằm ở các ModeNav ngoài 4 file shell → để Lát 4 khi chuyển trang). **Chưa xác minh**: `verify:changed` build vẫn lỗi thiếu `.env.local` trong worktree (không do code); chưa test tay đăng xuất/đổi MK/menu mobile.
- [x] Lát 4 VST/GSC form (2026-11-10, **chưa test tay**): VST bỏ viền cột nhân viên, thẻ cơ hội mở, khung đánh giá (còn: panel → ô chọn; ngăn cột bằng đường kẻ mảnh; cơ hội thu gọn là hàng gạch chân); gộp 3 banner vàng + bỏ banner xanh «chưa lưu» thành một dải; bỏ dòng «Chọn khoa trước» (đã có placeholder); «Ghi nhận cơ hội» thành secondary → chỉ «Lưu phiên giám sát» là nút xanh. GSC: thanh đáy cố định (thay cụm nút nổi) — một primary «Lưu kết quả», In/In mẫu trống là secondary (đã xem trên dev-local; chưa test điện thoại). Đã có: `tsc`, eslint, ui-audit; test tay trên dev-local :3001 (Claude chạy, 2026-11-10): VST lưu trống → toast lỗi khoa/khu vực/vị trí đúng lúc bấm; ghi nhận cơ hội → hàng thu gọn + toast; GSC lưu trống → toast. **Chưa**: build (thiếu `.env.local` worktree), lưu phiên VST thành công (khu vực KHQS bị server từ chối, lỗi dữ liệu không phải UI), GSC chấm điểm + lưu thật, màn 3 cột ≥1280px, điện thoại, GSC `ChecklistItem` (border-l-4 mỗi tiêu chí) và tab mobile chưa đụng.
- [ ] **Đổi hướng (PO 2026-11-11): «chuyên nghiệp, không tối giản»** — mẫu chờ duyệt ở canvas https://claude.ai/artifact/JB6sGEAgEjD3apaX1t3ePW (VST desktop, VST điện thoại, Thống kê). Chốt trong mẫu: nhãn nổi trong ô (floating label) thay hàng nhãn; 5 thời điểm WHO là 5 ô bằng nhau xếp dọc, ghi đủ chữ, bỏ chú giải; thẻ có dải đầu nhạt + bóng mềm; control 48–52px; một nút xanh đặc mỗi màn; dưới ngưỡng 80% tô hổ phách. Duyệt xong → áp cho VST → GSC → Thống kê → các module còn lại, verify + commit mỗi lát.
  - [x] PO duyệt mẫu («Duyệt, áp code»). Thang thống nhất: mọi control 48px qua `--bv103-control-h` (không `!h-[…]` riêng), hàng thời điểm 56px; khoảng 4/8/12/16/24; bo 10 control / 16 thẻ; chữ 12/14/16/20/28.
  - [x] VST — commit `a0f60d2d`: `FloatingInput`, `FloatingLabelContent`, `label` cho `SearchableSelect`/`RegistrySelect`, `.bv103-card`, 5 thời điểm dọc đủ chữ, bỏ chú giải WHO, thanh đáy có tóm tắt. Test tay :3001: control 48px (23), thời điểm 56px (15), trần 2 bỏ mốc cũ nhất, ô chọn `#026f17` chữ trắng. tsc, ui-audit, layout-drift, typography OK.
  - [x] Canvas Thống kê cân đối lại (v5): KPI 4 ô cao bằng nhau, hai biểu đồ cùng hàng 64px + thanh 10px + ngưỡng 80%, bảng hàng 48px, chữ chỉ 12/14/16/28.
  - [x] GSC `fa2dfd06` (2026-11-11): thẻ tiêu chí `bv103-card`, cụm nút đều cột (146×48 khi 4 nút, 115×48 khi 5), khung «Nhận xét / Kiến nghị» có đầu thẻ, tóm tắt «Đã đánh giá x/y» trên thanh đáy. Test tay :3001 bảng VSMT 19 tiêu chí; tsc, eslint, ui-audit OK.
  - [x] Rà toàn project (PO 2026-11-11 «tự rà và sửa hết», 2026-11-11): `scripts/ui-codemod-type-scale.mjs` đổi `text-[11px]`→`text-xs` mọi module (Lịch sử, Thống kê, CSSD, NKBV, QLCV, Đào tạo, Dashboard, Chất thải, Quản trị, dùng chung) — còn 0 file ngoài danh sách loại trừ (`text11px` ui-audit = 28, chỉ in ấn/lưới ngày/timeline). Thống kê theo canvas v5 (KPI `bv103-card` cao bằng nhau, thanh thời điểm hàng 64px, thẻ phủ có đầu thẻ); nút Excel 48px; cột thao tác Bộ/Loại dụng cụ dùng `tableActionBtn`. Đo tràn chữ ở 1440px = 0 trên: thống kê VST/GSC, CSSD (dụng cụ, quy trình, sự cố, thiết bị), NKBV, Đào tạo, Chất thải, Báo cáo tổng hợp, QLCV, Quản trị (nhân sự, bảng kiểm, tài khoản, phân quyền). Mỗi lát: tsc, eslint, layout drift/typography, ui-audit OK.
  - [ ] Còn lại: (1) cảnh báo ESLint sẵn có ở NKBV/Dashboard/Chất thải (biến thừa trong logic lâm sàng — commit codemod với `MAXW`, chưa dọn); (2) file in ấn/lưới ngày giữ 11px có chủ ý; (3) nhãn rời: ngày/giờ camera, ô người giám sát trong `GiamSatHeaderFields`; (4) điện thoại chưa rà: /thong-ke/gsc, /lich-su/gsc, /bao-cao-tong-hop, /cssd-thiet-bi.
  - [x] Rà điện thoại 375px (2026-11-11, `544bf57e`): CSSD/NKBV/QLCV/Chất thải/Đào tạo/Quản trị không cuộn ngang, không tràn chữ; vùng bấm nhỏ đã nâng ≥40px (`linkQuiet`, nút Bộ/Loại CSSD, nút thu gọn kỳ QLCV). Giữ có chủ ý: link «Hỏng/Mất» nằm trong đoạn chữ.
- [ ] Lát 5 → 7 (đánh dấu khi xong)

## 10. Để tiếp tục sau `/clear`

Mở phiên mới (Sonnet), nói: «Đọc `docs/ux/ui-redesign-plan.md` rồi làm lát đầu chưa tick (Lát 4 – VST/GSC form)». Đọc thêm khi cần: `page-chrome-contract-20260731.md`, `src/lib/bv103-layout-chrome.ts`, `src/lib/bv103-design-tokens.ts`, `src/app/globals.css`. Lệnh verify UI thuần: `npm run verify:quick` (xem `npm run verify:changed -- --dry`). Giả định chưa kiểm: các layout module có bọc `KsnkPageShell` hộ trang con hay không (Lát 0 kiểm).
