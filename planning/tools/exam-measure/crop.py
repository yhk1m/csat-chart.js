# © 2026 김용현
"""samples.csv 의 그림을 꺼내 exam-samples/<type>/<exam>-q<N>[-k].png 와 메타 JSON 으로."""
import csv
import json
import sys
from pathlib import Path

import fitz
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I(=-P) 는 스크립트 폴더를 넣지 않는다
from common import ROOT, SAMPLES, SUBJECTS, utf8_stdout

CODE_TO_FOLDER = {v: k for k, v in SUBJECTS.items()}


def pdf_path(exam_id):
    code = exam_id.split("_")[2]
    return ROOT / CODE_TO_FOLDER[code] / "작업완료" / f"{exam_id}.pdf"


def main():
    utf8_stdout()
    rows = list(csv.DictReader(open(SAMPLES / "samples.csv", encoding="utf-8")))
    seen = {}
    for r in rows:
        if not r["xref"]:
            continue
        doc = fitz.open(pdf_path(r["exam"]))
        page = doc[int(r["page"]) - 1]
        xref = int(r["xref"])
        info = next(i for i in page.get_image_info(xrefs=True) if i["xref"] == xref)
        pix = fitz.Pixmap(doc, xref)
        if pix.alpha:
            pix = fitz.Pixmap(pix, 0)
        if pix.n > 3:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        img = Image.frombytes("L" if pix.n == 1 else "RGB", (pix.width, pix.height), pix.samples)
        if r["crop_px"]:
            img = img.crop(tuple(int(v) for v in r["crop_px"].split(",")))
        key = f'{r["exam"]}-q{r["question"]}'
        k = seen.get((r["type"], key), 0)
        seen[(r["type"], key)] = k + 1
        stem = key if k == 0 else f"{key}-{k}"
        out = SAMPLES / r["type"]
        out.mkdir(parents=True, exist_ok=True)
        img.convert("L").save(out / f"{stem}.png")
        bbox_w_pt = info["bbox"][2] - info["bbox"][0]
        meta = {
            "exam": r["exam"], "page": int(r["page"]), "xref": xref, "question": r["question"],
            "crop_px": r["crop_px"], "px_per_pt": info["width"] / bbox_w_pt,
            "bbox_pt": [round(v, 2) for v in info["bbox"]], "note": r["note"],
        }
        (out / f"{stem}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        print(out.name, stem, f'{meta["px_per_pt"]:.2f} px/pt')


if __name__ == "__main__":
    main()
