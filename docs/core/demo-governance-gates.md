# Demo governance gates — runbook terminal (~2–3 phút)

> Runbook cho người trình bày **chứng minh bằng terminal** rằng pilot BV103 có rào kỹ thuật, không phải side project. Đọc trước: [`demo-script-skeptics-10min.md`](./demo-script-skeptics-10min.md) (phút 0–2), [`pilot-go-live-signoff-202606.md`](./pilot-go-live-signoff-202606.md) §A.

---

## 1. Khi nào show

| Bối cảnh | Cách dùng |
|----------|-----------|
| **Demo skeptic 10 phút** | Phút **0–2** — trước khi vào UI MDM/VST/GSC; khung tin cậy |
| **Review kỹ thuật độc lập** | Standalone **5 phút** — Tier 1 + Tier 2 (hoặc Tier 3 nếu có docker) |
| **Bonus sau demo UI** | 30 giây Tier 1 khi skeptic hỏi «UI có kiểm soát không?» |

**Thông điệp cốt lõi:** «Go-live W1 có gate tự động + checklist ký tay — không tự chấm trên slide.»

---

## 2. Chuẩn bị

| Hạng mục | Bắt buộc? | Ghi chú |
|----------|-----------|---------|
| Repo clone, `npm install` | Có | Thư mục làm việc: root `ksnk_bv103` |
| `.env.local` | Tier 2–3 linked | Tier 1 không cần |
| Docker + Supabase local | Tier 3 `:local` | `supabase start`; không có docker → dùng log pass đã lưu hoặc Tier 2 |
| Tab editor | Khuyến nghị | Mở sẵn [`pilot-go-live-signoff-202606.md`](./pilot-go-live-signoff-202606.md) §A (bảng gate IT) |
| Terminal full-screen | Khuyến nghị | Font ≥14px; tắt notification |

**Không cần:** badge CI giả, slide marketing, claim «100% RLS».

---

## 3. Ba tầng lệnh (nhanh → đầy đủ)

### Tier 1 — ~30 giây (UI discipline)

```bash
cd /path/to/ksnk_bv103
npm run layout:drift-check
npm run layout:typography-check
```

**SHOW:** Output terminal — số khớp drift hoặc «passed».

**SAY:**

> «UI không phải theme tự do. Mỗi module có design tokens và chrome riêng; CI quét drift layout và typography trước khi merge — cùng pipeline với engineering contract.»

> «Đây là **gate cảnh báo** trên một số nhánh — fail không chặn go-live W1, nhưng team biết và xử lý theo wave. Không che drift.»

---

### Tier 2 — ~1–2 phút (app ↔ DB contract)

```bash
npm run verify:engineering
```

**SHOW:** Dòng `[engineering:gate] PASSED`, `Legacy table guard passed`, `imports:master-crud OK`.

**SAY:**

> «Mọi Server Action đọc `fact_*` phải qua contract gate: không quét full bảng, có `verifyPermission`, cấm tên bảng legacy `dm_*`/`fact_*` không prefix. Đây là rào **strict** — exit ≠ 0 thì không ship action mới.»

> «Pilot W1 vẫn dùng RBAC app là lớp chính cho GSC/VST; RLS một số `gstt_fact_*` còn permissive — đã ghi trong architecture one-pager, không giấu.»

**Thành phần con (nếu bị hỏi):**

| Bước | Kiểm tra |
|------|----------|
| `engineering:baseline` | Thống kê action, `.limit()`, `.rpc()`, full-read |
| `engineering:contract:gate` | Contract action ↔ DB |
| `legacy:guard` | Cấm compat table name cũ trong app |
| `legacy:sql:guard` | SQL migration không pattern legacy |
| `imports:master-crud` | Import master CRUD đúng boundary |

---

### Tier 3 — ~3–5 phút, tuỳ chọn (full go-live gate)

```bash
npm run pilot:go-live:gate:local    # docker local
# hoặc linked staging/prod:
npm run pilot:go-live:gate
```

**SHOW song song:** Bảng §A trong [`pilot-go-live-signoff-202606.md`](./pilot-go-live-signoff-202606.md) — đối chiếu từng dòng khi terminal chạy.

**SAY:**

> «Đây là chuỗi gate trước ký go-live W1. Automated pass ≠ go-live — NV KSNK vẫn ký ≥5/6 kịch bản tay mỗi khối ở §B.»

**Thứ tự & ý nghĩa:**

| Bước | Lệnh | Pass khi |
|------|------|----------|
| 1 | `pilot:go-live:precheck` / `:local` | DB + auth precheck (local cần docker) |
| 2 | `verify:engineering` | Exit 0 |
| 3 | `verify:cssd` | Exit 0 (W2 CSSD; vẫn trong gate đầy đủ) |
| 4 | `test:pilot` | Unit pilot GSC/VST/QLCV |
| 5 | `smoke:gsc-vst` / `:local` | RPC smoke trên DB thật |
| 6 | `pilot-go-live-gate.mjs` | In checklist sign-off + bước tiếp |

**SAY khi kết thúc:**

> «Automated portion OK — bước tiếp là ký §B và chọn wave env `KSNK_PILOT_CORE_MODULES`. Prod W1 chỉ MDM + GSC/VST + QLCV.»

---

## 4. Kịch bản nói mẫu (counter-demo A)

Dùng câu này khi skeptic nói «pilot không có gate»:

> «Go-live W1 yêu cầu `npm run pilot:go-live:gate` pass và NV KSNK ký checklist. File ký: `pilot-go-live-signoff-202606.md`. Nếu gate đỏ, chúng tôi không lên prod — đây là rào kỹ thuật, không phải slide. Chi tiết terminal: [`demo-governance-gates.md`](./demo-governance-gates.md).»

---

## 5. Kết quả mong đợi (thành thật)

| Lệnh | Strict? | Trạng thái hiện tại (2026-06) |
|------|---------|-------------------------------|
| `layout:drift-check` | Warn / CI | **Có thể fail** — drift ở `BangKiemTable`, `bang-kiem-ap-dung-*`, `GscBangKiemToiPhaiTgsPanel` (label/panel title) |
| `layout:typography-check` | Warn / CI | **Có thể fail** — `BangKiemTable.tsx` còn `text-[9px]` (2 khớp); codemod: `node scripts/codemod-typography-min-label.mjs` |
| `verify:engineering` | **Strict** | Pass khi contract + legacy guard OK |
| `pilot:go-live:gate:local` | **Strict** | Cần docker Supabase local + `.env.local`; pass khi precheck + smoke OK |

**Nếu Tier 1 fail live:** Nói thẳng «đang trong wave bảng kiểm TGS — drift typography đã biết, không chặn W1 nhưng có ticket». Chuyển Tier 2 để show gate strict.

**Nếu Tier 3 fail (không docker):** Không bào chữa; show log pass đã lưu + mở sign-off §A; hẹn chạy lại sau.

**Không nói:** «100% RLS», «pentest-ready», badge CI không gắn repo thật.

---

## 6. Tránh

| Tránh | Vì sao |
|-------|--------|
| Claim gate = production hoàn chỉnh | W1 pilot; CSSD/NKBV wave 2–3 |
| Chạy gate live khi mạng/docker không ổn | Mất uy tín — dùng log + sign-off |
| Fake pass / sửa output terminal | Skeptic IT sẽ kiểm tra lại |
| Bỏ qua §B sign-off | Automated ≠ go-live |

---

## 7. Liên kết

| Tài liệu | Đường dẫn |
|----------|-----------|
| Demo 10 phút skeptic | [`demo-script-skeptics-10min.md`](./demo-script-skeptics-10min.md) |
| Sign-off go-live | [`pilot-go-live-signoff-202606.md`](./pilot-go-live-signoff-202606.md) |
| Pipeline schema & ship | [`governance-pipeline.md`](./governance-pipeline.md) |
| Ánh xạ spec ↔ DB | [`implementation-mapping.md`](./implementation-mapping.md) |
| Agent / verify workflow | [`../../AGENTS.md`](../../AGENTS.md) |
| Kiến trúc one-pager §6 | [`architecture-one-pager.md`](./architecture-one-pager.md) |

---

*Runbook này bám script trong `package.json` — cập nhật khi đổi tên gate hoặc thêm bước `pilot:go-live:gate`.*
