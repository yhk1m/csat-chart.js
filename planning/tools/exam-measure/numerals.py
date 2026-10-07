# © 2026 김용현
"""숫자 글꼴 후보 대조 — 본문 «한양신명조» 숫자와 후보 글꼴 숫자의 꼴을 견준다.
-> exam-samples/_work/numerals.png (줄마다 글꼴 하나, 이름표 붙음), numerals.csv (점수 순)

점수 = 숫자 10개의 평균 IoU(높이를 맞춘 잉크 겹침) − 0.5 × 평균 |폭/높이 비 차이|.
«잉크» = 높이를 맞춘 글자의 잉크/상자 넓이 — 획 굵기를 견주는 값(점수에는 넣지 않는다).
한글 글자가 있는 글꼴은 숫자 자리 앞에 둘 수 없으므로 «쓸 수 없음» 으로 표시한다.
점수만 믿지 않는다 — 시트를 눈으로 보고 고른다(실측 명세 «숫자 글꼴 대조»)."""
import csv
import sys
from pathlib import Path

import fitz
import numpy as np
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I(=-P) 는 스크립트 폴더를 넣지 않는다
from common import WORK, font_name, utf8_stdout
from crop import pdf_path

N = 64
DIGITS = "0123456789"
REF_EXAM = "2026_11_korgeo"
FONTS = Path(r"C:\Windows\Fonts")
LABEL_FONT = FONTS / "malgun.ttf"
# (이름, 파일, ttc 번호, Windows 기본 탑재 여부, 가변 글꼴 인스턴스). Office 가 깔아 주는 것은 False.
CANDIDATES = [
    ("Times New Roman", "times.ttf", 0, True, None),
    ("Georgia", "georgia.ttf", 0, True, None),
    ("Cambria", "cambria.ttc", 0, True, None),
    ("Constantia", "constan.ttf", 0, True, None),
    ("Palatino Linotype", "pala.ttf", 0, True, None),
    ("Sitka Text", "SitkaVF.ttf", 0, True, b"Text"),
    ("Sitka Small", "SitkaVF.ttf", 0, True, b"Small"),
    ("Book Antiqua", "BKANT.TTF", 0, False, None),
    ("Century", "CENTURY.TTF", 0, False, None),
    ("Century Schoolbook", "CENSCBK.TTF", 0, False, None),
    ("Bookman Old Style", "BOOKOS.TTF", 0, False, None),
    ("Garamond", "GARA.TTF", 0, False, None),
    ("Baskerville Old Face", "BASKVILL.TTF", 0, False, None),
    ("Goudy Old Style", "GOUDOS.TTF", 0, False, None),
    ("Perpetua", "PER_____.TTF", 0, False, None),
    ("Californian FB", "CALIFR.TTF", 0, False, None),
    ("High Tower Text", "HTOWERT.TTF", 0, False, None),
    ("Lucida Bright", "LBRITE.TTF", 0, False, None),
    ("Modern No. 20", "MOD20.TTF", 0, False, None),
    ("Bodoni MT", "BOD_R.TTF", 0, False, None),
    ("HY신명조", "H2MJSM.TTF", 0, False, None),  # 기준 — 실측 §4 에서 이미 탈락
]


def normalize(mask):
    """잉크 상자로 잘라 높이 N 에 맞추고 N×N 가운데 놓는다 (bool 배열)."""
    ys, xs = np.nonzero(mask)
    out = np.zeros((N, N), dtype=bool)
    if len(ys) == 0:
        return out
    m = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = m.shape
    nw = max(1, min(N, round(w * N / h)))
    img = Image.fromarray((m * 255).astype(np.uint8)).resize((nw, N), Image.BILINEAR)
    x0 = (N - nw) // 2
    out[:, x0:x0 + nw] = np.array(img) >= 128
    return out


def iou(a, b):
    u = np.logical_or(a, b).sum()
    return float(np.logical_and(a, b).sum() / u) if u else 0.0


def aspect(mask):
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        return 0.0
    return (xs.max() - xs.min() + 1) / (ys.max() - ys.min() + 1)


def ink(masks):
    """잉크 / 잉크 상자 넓이 평균 — 높이를 맞춘 글자의 획 굵기 대리값."""
    out = []
    for m in masks:
        ys, xs = np.nonzero(m)
        if len(ys):
            out.append(m.sum() / ((np.ptp(ys) + 1) * (np.ptp(xs) + 1)))
    return float(np.mean(out)) if out else 0.0


def reference_digits(zoom=12):
    """본문 벡터 글자에서 «한양신명조» 숫자 하나씩 (잉크 bool 배열)."""
    got = {}
    doc = fitz.open(pdf_path(REF_EXAM))
    for page in doc:
        for b in page.get_text("rawdict")["blocks"]:
            for l in b.get("lines", []):
                for s in l["spans"]:
                    if "한양신명조" not in font_name(s["font"]):
                        continue
                    for ch in s["chars"]:
                        c = ch["c"]
                        if c in DIGITS and c not in got:
                            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom),
                                                  clip=fitz.Rect(ch["bbox"]), colorspace=fitz.csGRAY)
                            a = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width)
                            got[c] = a < 128
        if len(got) == len(DIGITS):
            return got
    raise SystemExit(f"본문에서 못 찾은 숫자: {''.join(sorted(set(DIGITS) - set(got)))}")


def has_hangul(path, index):
    font = TTFont(str(path), fontNumber=index, lazy=True)
    return 0xAC00 in font.getBestCmap()


def load_font(path, index, size, instance=None):
    f = ImageFont.truetype(str(path), size, index=index)
    if instance:
        f.set_variation_by_name(instance)
    return f


def render_digit(path, index, c, size=200, instance=None):
    f = load_font(path, index, size, instance)
    im = Image.new("L", (size * 2, size * 2), 255)
    ImageDraw.Draw(im).text((size // 2, size // 4), c, font=f, fill=0)
    return np.array(im) < 128


def draw_sheet(strips, out, label_w=330):
    """줄마다 [이름표 | 숫자 10칸(높이 맞춤, 폭 비는 그대로)]. 읽기 좋게 칸을 N 그대로 둔다."""
    gap = 8
    lf = ImageFont.truetype(str(LABEL_FONT), 18)
    sheet = Image.new("L", (label_w + (N + gap) * len(DIGITS), (N + gap) * len(strips) + gap), 255)
    d = ImageDraw.Draw(sheet)
    for k, (label, gs) in enumerate(strips):
        y = gap + k * (N + gap)
        d.text((6, y + N // 2 - 22), label, font=lf, fill=0)
        for j, g in enumerate(gs):
            sheet.paste(Image.fromarray(np.where(g, 0, 255).astype(np.uint8)), (label_w + j * (N + gap), y))
        d.line([(0, y + N + gap // 2), (sheet.width, y + N + gap // 2)], fill=200)
    sheet.save(out)


def main():
    utf8_stdout()
    ref = {c: normalize(m) for c, m in reference_digits().items()}
    ref_aspect = {c: aspect(m) for c, m in ref.items()}
    rows, glyph_of = [], {}
    for name, file, index, stock, instance in CANDIDATES:
        path = FONTS / file
        if not path.exists():
            print(f"{name:20s} 없음 ({file})")
            continue
        glyphs = {c: normalize(render_digit(path, index, c, instance=instance)) for c in DIGITS}
        ious = [iou(ref[c], glyphs[c]) for c in DIGITS]
        adiff = [abs(aspect(glyphs[c]) - ref_aspect[c]) for c in DIGITS]
        score = float(np.mean(ious) - 0.5 * np.mean(adiff))
        usable = not has_hangul(path, index)
        rows.append({"font": name, "file": file, "stock_windows": stock, "usable": usable,
                     "score": round(score, 4), "iou": round(float(np.mean(ious)), 4),
                     "aspect_diff": round(float(np.mean(adiff)), 4),
                     "mean_aspect": round(float(np.mean([aspect(glyphs[c]) for c in DIGITS])), 4),
                     "ink": round(ink(glyphs.values()), 4)})
        glyph_of[name] = [glyphs[c] for c in DIGITS]
    rows.sort(key=lambda r: (not r["usable"], -r["score"]))
    WORK.mkdir(parents=True, exist_ok=True)
    with open(WORK / "numerals.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    ref_mean = float(np.mean(list(ref_aspect.values())))
    ref_ink = ink(ref.values())
    print(f"{'본문 한양신명조':20s} 평균 폭/높이 {ref_mean:.4f}  잉크 {ref_ink:.4f}")
    for r in rows:
        print(f"{r['font']:20s} 점수 {r['score']:.4f}  IoU {r['iou']:.4f}  비 차이 {r['aspect_diff']:.4f}"
              f"  폭/높이 {r['mean_aspect']:.4f}  잉크 {r['ink']:.4f}"
              f"  {'Windows 기본' if r['stock_windows'] else '        '}  {'' if r['usable'] else '한글 있음 — 쓸 수 없음'}")
    # 시트는 점수 순. 본문 줄을 맨 위와 여섯 줄마다 다시 넣어 눈으로 견주기 쉽게 한다.
    strips = []
    for i, r in enumerate(rows):
        if i % 6 == 0:
            strips.append((f"본문 한양신명조 ({ref_mean:.2f} · {ref_ink:.2f})", [ref[c] for c in DIGITS]))
        strips.append((f"{i + 1}. {r['font']} ({r['mean_aspect']:.2f} · {r['ink']:.2f})", glyph_of[r["font"]]))
    draw_sheet(strips, WORK / "numerals.png")
    print("->", WORK / "numerals.png", "(점수 순, 이름 옆 = 폭/높이 · 잉크, 본문 줄을 여섯 줄마다 다시 넣었다)")


if __name__ == "__main__":
    main()
