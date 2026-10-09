# /domain-slice — Rà, phản biện, chọn theo domain, sửa một lát

Dùng khi PO bảo rà soát, làm chuẩn, hoặc sửa cho bám yêu cầu đã chốt. Rule luôn bật: `05-domain-auto-slice.mdc`.

## Vòng

1. Đọc đúng dòng [`docs/ssot-map.md`](../../docs/ssot-map.md) và mục domain của lát. Không đọc `docs/data/`, không đọc CDC/NHSN thô.
2. Liệt kê chỗ code/SQL đang lệch câu đó. Không liệt kê cả repo.
3. Nếu câu SSOT hoặc mục «Đã chốt» dưới đây chọn được một cách: sửa một lát, không hỏi lại.
4. Nếu vẫn hai cách đọc lâm sàng: dừng, đưa hai cách, không code.
5. Phản biện diff: trần, nhãn ô, cửa KPI. Rồi verify đúng mức lát (test thuần hoặc lệnh trong DoD).

## Đã chốt (PO, phiên tới 2026-10-09)

Không thêm luật lâm sàng mới vào đây. Muốn đổi một dòng thì PO nói rõ.

| Việc | Chốt |
|------|------|
| VST thời điểm | Tuân thủ (rửa/chà) ≤2 chỉ định WHO phân biệt; bỏ sót ≤1; không bắt đủ 5 mốc trên một cơ hội. Phiên mới ≤3 người; phiên cũ giữ số người đã có. |
| VST form | Năm ô **một hàng**, thấp. Xuống dòng sau TRƯỚC/SAU. Mã: TXNB, TTVK, TXDCT, TXNB, TXXQNB. Hành động: RỬA TAY, CHÀ CỒN, BỎ SÓT. |
| VST chọn quá trần | Bỏ mốc chọn sớm nhất, giữ đủ trần. Không toast chặn. |
| VST ô đang chọn | Nền `var(--primary)`, chữ trắng. Không nền đen. |
| VST KPI | `fn_vst_is_valid_opportunity` cùng trần với form. |
| VST xóa phiên | `is_active=false` cho đến khi PO bảo xóa cứng. |
| Tài liệu | Một chủ đề một file (`ssot-map`). Không chép thân rule vào docs. |
| Schema | Không bảng summary im. Không migrate prod trừ lệnh PO trong task. |

Audit từng ghi «1–5 mọi hành động» đã thu hồi. Không làm theo câu đó.
