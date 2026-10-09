---
name: giam-sat-spec
description: Sửa VST/GSC: src/modules/giam-sat-vst hoặc giam-sat-chung. Không dùng cho NKBV.
---

# Giám sát — ngữ cảnh spec

Trước khi sửa form, phiên quan sát, điểm số, import/export:

1. [`domain-specification.md`](../../../docs/core/domain-specification.md)
2. [`implementation-mapping.md`](../../../docs/core/implementation-mapping.md)
3. [`read-minimum.md`](../../../docs/core/read-minimum.md)
4. [`engineering-guidelines.md`](../../../docs/core/engineering-guidelines.md) § UI mobile khi đụng form hiện trường

**Nhắc domain:** VST tối đa **3 đối tượng** một phiên (trừ khi có yêu cầu mới). Fact: ưu tiên đính chính + soft-delete khi phù hợp.
