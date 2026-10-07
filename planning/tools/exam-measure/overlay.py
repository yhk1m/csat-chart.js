# © 2026 김용현
"""시험지 표본 위에 다시 그린 그림을 겹친다 → exam-samples/_work/overlay/<type>-<sample>.png
두 그림의 축 틀(가장 긴 가로선 = 가로축, 그 왼쪽 끝에서 위로 = 세로축)을 찾아 맞춘다.
표본 = 빨강, 다시 그린 것 = 파랑, 겹친 잉크 = 검정."""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I(=-P) 는 스크립트 폴더를 넣지 않는다
from common import SAMPLES, WORK, utf8_stdout

INK = 128
# 세로축 잉크를 따라 올라갈 때 건너뛸 수 있는 빈칸 (빈 기호 지름쯤)
GAP = 12
# (표본 폴더, 위에서 아래로 이어 붙일 표본 이름들, 가로로 잘라 쓸 비율) — exam-overlay-cases.ts 와 같다
PAIRS = [
    ("absbar", ["2026_11_korgeo-q11"], None),
    ("line", ["2026_11_wgeo-q10"], (0.0, 0.5)),                           # 패널 둘 중 왼쪽
    ("stacked", ["2027_09_korgeo-q14"], None),
    ("pyramid", ["2026_09_wgeo-q10", "2026_09_wgeo-q10-1"], (0.0, 0.34)),  # 가로축이 둘째 그림에 있다 · 패널 셋 중 첫째
]


def longest_run(row):
    """한 줄에서 가장 긴 잉크 연속 구간 (시작, 끝) — 없으면 None"""
    xs = np.nonzero(row)[0]
    if xs.size == 0:
        return None
    breaks = np.nonzero(np.diff(xs) > 1)[0]
    starts = np.concatenate(([0], breaks + 1))
    ends = np.concatenate((breaks, [xs.size - 1]))
    k = int(np.argmax(ends - starts))
    return int(xs[starts[k]]), int(xs[ends[k]])


def axis_frame(a):
    """(x0, x1, y_top, y_base) — 가로축 선의 시작·끝 x, 세로축 맨 위 y, 가로축 맨 아래 줄 y.

    줄마다 **이어진** 잉크 가장 긴 토막을 선으로 본다 — 줄 전체 잉크 수로 고르면 축 왼쪽의
    눈금 숫자 「0」 이 선 시작으로 잡힌다. 길이가 가로축만 한 선(닫힌 틀의 윗변, 범례 상자의 변)이
    여럿일 수 있다 — 그 왼쪽 끝(축 굵기·바깥 눈금만큼 9칸)에서 위로 이어진 잉크(세로축)가 가장 긴 선을
    가로축으로 친다."""
    ink = a < INK
    runs = [longest_run(ink[y]) for y in range(ink.shape[0])]
    lens = np.array([0 if r is None else r[1] - r[0] + 1 for r in runs])
    best = None
    for y in np.nonzero(lens >= lens.max() * 0.8)[0]:
        x0, x1 = runs[y]
        top = int(y)
        for x in range(x0, min(x0 + 9, ink.shape[1])):
            t, gap = int(y), 0
            # 축 위에 얹힌 빈 기호(흰 속)가 축을 몇 px 끊는다 — GAP 까지는 건너뛴다
            for yy in range(int(y) - 1, -1, -1):
                if ink[yy, x]:
                    t, gap = yy, 0
                else:
                    gap += 1
                    if gap > GAP:
                        break
            top = min(top, t)
        run = int(y) - top
        if best is None or run > best[0] or (run == best[0] and y > best[1]):
            best = (run, int(y), x0, x1, top)
    _, y_base, x0, x1, y_top = best
    return x0, x1, y_top, y_base


def load_sample(d, names, xfrac):
    """표본 조각들을 위아래로 이어 붙이고(같은 폭으로), 필요하면 가로로 잘라 낸다."""
    parts = [gray(SAMPLES / d / f"{n}.png") for n in names]
    w = min(p.shape[1] for p in parts)
    a = np.vstack([p[:, :w] for p in parts])
    if xfrac:
        a = a[:, int(w * xfrac[0]): int(w * xfrac[1])]
    return a


def gray(path):
    return np.array(Image.open(path).convert("L"))


def overlay(s, rendered_png, out_png):
    r = gray(rendered_png)
    sx0, sx1, sy0, sy1 = axis_frame(s)
    rx0, rx1, ry0, ry1 = axis_frame(r)
    kx = (sx1 - sx0) / max(1, rx1 - rx0)
    ky = (sy1 - sy0) / max(1, ry1 - ry0)
    r2 = Image.fromarray(r).resize((max(1, round(r.shape[1] * kx)), max(1, round(r.shape[0] * ky))), Image.BILINEAR)
    canvas = Image.new("L", (s.shape[1], s.shape[0]), 255)
    canvas.paste(r2, (round(sx0 - rx0 * kx), round(sy0 - ry0 * ky)))
    rr = np.array(canvas)
    out = np.full(s.shape + (3,), 255, np.uint8)
    si, ri = s < INK, rr < INK
    out[si & ~ri] = (220, 0, 0)
    out[ri & ~si] = (0, 90, 255)
    out[si & ri] = (0, 0, 0)
    Image.fromarray(out).save(out_png)
    return kx, ky


def main(rendered_dir):
    utf8_stdout()
    out_dir = WORK / "overlay"
    out_dir.mkdir(parents=True, exist_ok=True)
    for d, names, xfrac in PAIRS:
        name = names[0]
        rendered = Path(rendered_dir) / f"{d}-{name}.png"
        kx, ky = overlay(load_sample(d, names, xfrac), rendered, out_dir / f"{d}-{name}.png")
        print(f"{d:8s} {name}: 배율 가로 {kx:.3f} 세로 {ky:.3f}")
    print("->", out_dir)


if __name__ == "__main__":
    main(sys.argv[1])
