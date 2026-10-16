import re, json, sys
sys.path.insert(0, ".")
from tr import T, COMMON, STOP, NAME, PREFIX, SENDER
NEUTRES = {"–","·","💡","iPhone","Android","bonjour@spotszen.fr","Spots Zen ·",".","&nbsp;"}
FOOT = 'Spots Zen · <a href="mailto:bonjour@spotszen.fr"'
manq = []
out = {}
for tid, spec in T.items():
    fr = open(f"fr-{tid}.html").read()
    for lang in ["en","de","nl","es"]:
        dico = {**COMMON[lang], **{k: v[lang] for k, v in T[4]["nodes"].items() if k.startswith(": gardez")}, **{k: v[lang] for k, v in spec["nodes"].items()}}
        parts = re.split(r"(<[^>]+>)", fr)
        for i, p in enumerate(parts):
            if p.startswith("<") or not p.strip(): continue
            s = p.strip()
            if s in dico:
                lead = p[: len(p) - len(p.lstrip())]; trail = p[len(p.rstrip()):]
                t = dico[s]
                if t.startswith("^"): lead, t = "", t[1:]
                elif t.startswith((":", ",")): lead = ""
                parts[i] = lead + t + trail
            elif s in NEUTRES or re.fullmatch(r"(\{[{%][^}]*[}%]\}\s*)+", s):
                pass
            else:
                manq.append((tid, lang, s))
        h = "".join(parts).replace('<html lang="fr">', f'<html lang="{lang}">')
        if tid in (7, 8, 9, 10):
            h = h.replace(FOOT, STOP[lang] + "<br>" + FOOT, 1)
        out[f"{tid}-{lang}"] = dict(html=h, subject=spec["subject"][lang], name=f"{PREFIX[tid]} — {NAME[tid]} ({lang.upper()})", sender=SENDER[lang])
        open(f"out-{tid}-{lang}.html", "w").write(h)
# Versions françaises avec la ligne STOP (7 à 10)
for tid in (7, 8, 9, 10):
    fr = open(f"fr-{tid}.html").read()
    assert FOOT in fr
    open(f"out-{tid}-fr.html", "w").write(fr.replace(FOOT, STOP["fr"] + "<br>" + FOOT, 1))
json.dump({k: {x: v[x] for x in ("subject","name","sender")} for k, v in out.items()}, open("out-meta.json","w"), ensure_ascii=False, indent=1)
print("non traduits:", manq)
print(len(out), "modèles")
