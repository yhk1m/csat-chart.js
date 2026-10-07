# © 2026 김용현
"""시험지 표본 | 2.0.0 exam 골든 | 1.7.0 classic 골든 을 나란히 → exam-samples/_work/compare.html
겹침 그림(overlay.py 결과)이 있으면 종류 아래에 함께 놓는다."""
import html
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I(=-P) 는 스크립트 폴더를 넣지 않는다
from common import REPO, SAMPLES, WORK, utf8_stdout

SNAP = REPO / "test" / "core" / "__snapshots__"
SNAP_EXAM = SNAP / "exam"
OVERLAY = WORK / "overlay"


def goldens_for(type_dir, snap_dir):
    """표본 폴더 이름(kebab)과 같은 머리로 시작하는 골든 PNG — 'deviation-a' → deviationA*"""
    key = type_dir.replace("-", "").lower()
    return sorted((p for p in Path(snap_dir).glob("*.png") if p.stem.lower().startswith(key)), key=lambda p: p.name)


def figs(paths):
    return "".join(f'<figure><img src="{p.as_uri()}"><figcaption>{html.escape(p.stem)}</figcaption></figure>' for p in paths)


def main():
    utf8_stdout()
    WORK.mkdir(parents=True, exist_ok=True)
    rows = []
    for d in sorted(p for p in SAMPLES.iterdir() if p.is_dir() and not p.name.startswith("_")):
        samples = sorted(d.glob("*.png"))
        overlays = sorted(OVERLAY.glob(f"{d.name}*.png")) if OVERLAY.exists() else []
        rows.append(
            f"<section><h2>{d.name}</h2><div class=row>"
            f"<div>{figs(samples) or '표본 없음'}</div>"
            f"<div>{figs(goldens_for(d.name, SNAP_EXAM)) or '—'}</div>"
            f"<div>{figs(goldens_for(d.name, SNAP)) or '—'}</div></div>"
            + (f"<h3>겹침</h3><div class=ov>{figs(overlays)}</div>" if overlays else "")
            + "</section>")
    page = f"""<!doctype html><meta charset=utf-8><title>시험지 대조</title>
<style>body{{font:14px sans-serif;margin:16px;background:#fff}}.row{{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}}
.ov{{display:grid;grid-template-columns:1fr 1fr;gap:16px}}img{{max-width:100%;border:1px solid #ccc}}figure{{margin:0 0 8px}}
h2{{border-top:2px solid #333;padding-top:8px}}</style>
<h1>시험지 표본 | 2.0.0 exam | 1.7.0 classic</h1>{''.join(rows)}"""
    out = WORK / "compare.html"
    out.write_text(page, encoding="utf-8")
    print("->", out)


if __name__ == "__main__":
    main()
