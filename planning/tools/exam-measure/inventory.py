# © 2026 김용현
"""표본 PDF 의 그림 목록(CSV)과 쪽 썸네일(그림 번호를 빨간 상자로)."""
import csv
import sys
from pathlib import Path

import fitz

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I(=-P) 는 스크립트 폴더를 넣지 않는다
from common import WORK, exam_pdfs, utf8_stdout

MIN_W_PT = 60  # 이보다 좁은 그림(로고·기호)은 뺀다


def main():
    utf8_stdout()
    WORK.mkdir(parents=True, exist_ok=True)
    rows = []
    for exam_id, path in exam_pdfs():
        doc = fitz.open(path)
        for pno, page in enumerate(doc, start=1):
            boxes = []
            for info in page.get_image_info(xrefs=True):
                x0, y0, x1, y1 = info["bbox"]
                w_pt = x1 - x0
                if w_pt < MIN_W_PT:
                    continue
                n = len(rows)
                rows.append({
                    "id": n, "exam": exam_id, "page": pno, "xref": info["xref"],
                    "x0": round(x0, 1), "y0": round(y0, 1), "x1": round(x1, 1), "y1": round(y1, 1),
                    "px_w": info["width"], "px_h": info["height"],
                    "dpi": round(info["width"] / (w_pt / 72), 1),
                })
                boxes.append((n, fitz.Rect(info["bbox"])))
            for n, r in boxes:
                page.draw_rect(r, color=(1, 0, 0), width=1.2)
                page.insert_text((r.x0 + 2, r.y0 + 12), str(n), fontsize=12, color=(1, 0, 0))
            page.get_pixmap(dpi=80).save(WORK / f"{exam_id}_p{pno}.png")
    with open(WORK / "inventory.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} images from {len(exam_pdfs())} PDFs -> {WORK}")


if __name__ == "__main__":
    main()
