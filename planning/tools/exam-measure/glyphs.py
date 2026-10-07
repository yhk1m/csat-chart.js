# © 2026 김용현
"""표본 쪽의 벡터 글자를 글꼴별로 한 줄씩 렌더 → exam-samples/_work/glyphs_<exam>_p<N>.png
같은 배율(px_per_pt)로 그리므로 표본 그림 속 글자와 크기·꼴을 바로 견줄 수 있다."""
import json
import sys
from pathlib import Path

import fitz
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I(=-P) 는 스크립트 폴더를 넣지 않는다
from common import WORK, font_name, utf8_stdout
from crop import pdf_path


def main(sample_json, page_no=None):
    utf8_stdout()
    meta = json.loads(open(sample_json, encoding="utf-8").read())
    exam = meta["exam"]
    page_no = int(page_no or meta["page"])
    doc = fitz.open(pdf_path(exam))
    page = doc[page_no - 1]
    zoom = meta["px_per_pt"]
    picked = {}
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                name = font_name(s["font"])
                n = len(s["text"].strip())
                # 4글자 이상을 먼저, 없으면 가장 긴 것(숫자 글꼴은 짧은 조각뿐이다)
                if n and (name not in picked or (len(picked[name]["text"].strip()) < 4 and n > len(picked[name]["text"].strip()))):
                    picked[name] = s
    strips = []
    for name, s in sorted(picked.items()):
        r = fitz.Rect(s["bbox"])
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=r, colorspace=fitz.csGRAY)
        strips.append((name, s["size"], Image.frombytes("L", (pix.width, pix.height), pix.samples)))
        print(f"{name:16s} {s['size']:5.2f}pt  {s['text'][:30]!r}")
    if not strips:
        print("벡터 글자 없음 — 다른 쪽(두 번째 인자)을 고른다")
        return
    W = max(im.width for _, _, im in strips)
    H = sum(im.height + 10 for _, _, im in strips)
    sheet = Image.new("L", (W, H), 255)
    y = 0
    for _, _, im in strips:
        sheet.paste(im, (0, y))
        y += im.height + 10
    WORK.mkdir(parents=True, exist_ok=True)
    out = WORK / f"glyphs_{exam}_p{page_no}.png"
    sheet.save(out)
    print("->", out)


if __name__ == "__main__":
    main(*sys.argv[1:3])
