
from pathlib import Path

ag = Path("AGENTS.md")
t = ag.read_text()
sec = Path("docs/archive/agent-notes/202609/_agents-grok-raci-section.md").read_text().strip() + "\n"
start = t.find("## Grok Lead")
if start < 0:
    t = t.rstrip() + "\n\n" + sec
else:
    rest = t[start+2:]
    nxt = rest.find("\n## ")
    if nxt < 0:
        t = t[:start] + sec
    else:
        end = start + 2 + nxt
        t = t[:start] + sec + t[end:]
ag.write_text(t)
print("AGENTS merged")

sc = Path("docs/core/skills-catalog.md")
st = sc.read_text()
blurb = Path("docs/archive/agent-notes/202609/_skills-catalog-raci-blurb.md").read_text().strip() + "\n\n"
if "## RACI Grok" in st:
    i = st.find("## RACI Grok")
    j = st.find("\n## ", i+1)
    st = st[:i] + blurb + (st[j+1:] if j >= 0 else "")
else:
    marker = "## Cursor rules"
    if marker in st:
        st = st.replace(marker, blurb + marker, 1)
    else:
        st = st.rstrip() + "\n\n" + blurb
sc.write_text(st)
print("skills-catalog updated")

p01 = Path(".cursor/rules/01-agent-discipline.mdc")
t01 = p01.read_text()
line = "- **RACI:** Grok đọc CDC/SSOT + sửa local mặc định; Cursor chỉ /grok-handoff khi PO dán — cấm đọc CDC thô.\n"
if "**RACI:**" not in t01:
    if "## Token hygiene" in t01:
        t01 = t01.replace("## Token hygiene (always)", "## Token hygiene (always)\n\n" + line)
    else:
        t01 = t01.rstrip() + "\n" + line
    p01.write_text(t01)
    print("01 patched")
else:
    print("01 has RACI")

pi = Path(".cursor/commands/implement.md")
ti = pi.read_text()
if "RACI" not in ti:
    add = (
        "\n\n## RACI\n\n"
        "Ưu tiên task từ Grok qua " + chr(96) + "/grok-handoff" + chr(96) + ". "
        "Cấm đọc CDC thô. PO UAT localhost; Grok review sau "
        + chr(96) + "LÁT … xong" + chr(96) + ".\n"
    )
    pi.write_text(ti.rstrip() + add)
    print("implement patched")
else:
    print("implement ok")

c00 = Path(".cursor/rules/00-core-ksnk-rules.mdc").read_text()
needle = "[" + chr(96) + "AGENTS.md" + chr(96) + "]"
assert needle in c00, "00 still broken: " + repr(c00[0:200])
print("00 verified ok")
