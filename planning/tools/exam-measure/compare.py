# © 2026 김용현
"""시험지 표본과 1.7.0 골든을 나란히 놓은 HTML → exam-samples/_work/compare.html"""
import html
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I(=-P) 는 스크립트 폴더를 넣지 않는다
from common import REPO, SAMPLES, WORK, utf8_stdout

SNAP = REPO / "test" / "core" / "__snapshots__"


def main():
    utf8_stdout()
    WORK.mkdir(parents=True, exist_ok=True)
    rows = []
    for d in sorted(p for p in SAMPLES.iterdir() if p.is_dir() and not p.name.startswith("_")):
        key = d.name.replace("-", "").lower()
        goldens = sorted(p for p in SNAP.glob("*.png") if p.stem.lower().startswith(key))
        samples = sorted(d.glob("*.png"))
        cells_s = "".join(f'<figure><img src="{p.as_uri()}"><figcaption>{html.escape(p.stem)}</figcaption></figure>' for p in samples)
        cells_g = "".join(f'<figure><img src="{p.as_uri()}"><figcaption>{html.escape(p.stem)}</figcaption></figure>' for p in goldens)
        rows.append(f"<section><h2>{d.name}</h2><div class=pair><div>{cells_s or '표본 없음'}</div><div>{cells_g}</div></div></section>")
    page = f"""<!doctype html><meta charset=utf-8><title>시험지 대조</title>
<style>body{{font:14px sans-serif;margin:16px;background:#fff}}.pair{{display:grid;grid-template-columns:1fr 1fr;gap:16px}}
img{{max-width:100%;border:1px solid #ccc}}figure{{margin:0 0 8px}}h2{{border-top:2px solid #333;padding-top:8px}}</style>
<h1>시험지 표본 (왼쪽) | csat-chart.js 1.7.0 (오른쪽)</h1>{''.join(rows)}"""
    out = WORK / "compare.html"
    out.write_text(page, encoding="utf-8")
    print("->", out)


if __name__ == "__main__":
    main()
