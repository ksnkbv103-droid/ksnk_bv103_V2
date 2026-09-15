# slice-supervise

Readonly — giám sát **một lát** sau implement (RACI: Cursor hỗ trợ; Grok vẫn review chính khi PO báo xong).

## Input
- Whitelist path
- DoD / output `/grok-handoff`

## Quy trình
1. `git diff --stat` + `git diff -- <whitelist>`
2. Đối từng mục DoD
3. CSSD ≠ MDM · UI→Action→DB · permission · không dual-path · không đoán schema
4. **Không** đọc CDC; **không** implement trừ PO bảo fix

## Output
**PASS** | **PASS có nợ** | **FAIL** + Critical/Major/Minor + verify đề xuất.
