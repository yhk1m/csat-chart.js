# © 2026 김용현
"""회색조 그림(0=검정)에서 선 굵기·점선·회색 단계·글자 높이를 픽셀로 잰다."""
import numpy as np

INK = 128  # 이보다 어두우면 잉크


def run_lengths(line, thresh=INK):
    """1차원 배열에서 잉크 구간을 (시작, 길이) 목록으로."""
    ink = np.asarray(line) < thresh
    runs, start = [], None
    for i, v in enumerate(ink):
        if v and start is None:
            start = i
        elif not v and start is not None:
            runs.append((start, i - start))
            start = None
    if start is not None:
        runs.append((start, len(ink) - start))
    return runs


def stroke_width(a, axis, at):
    """axis='h' 면 at 열을 세로로 훑어 가로선 굵기, 'v' 면 at 행을 가로로 훑어 세로선 굵기.
    가장 굵은 잉크 덩어리의 «잉크 양»(1 - 밝기/255 합)이라 안티앨리어싱 가장자리를 반영한다."""
    prof = a[:, at] if axis == "h" else a[at, :]
    prof = prof.astype(float)
    dark = prof < 250
    best, cur = 0.0, 0.0
    for v, d in zip(prof, dark):
        if d:
            cur += 1 - v / 255
        else:
            best, cur = max(best, cur), 0.0
    best = max(best, cur)
    return round(best * 2) / 2


def dash_pattern(a, axis, at):
    """점선 위를 따라 훑어 (칠한 길이, 빈 길이) 최빈값."""
    prof = a[at, :] if axis == "h" else a[:, at]
    runs = run_lengths(prof)
    if len(runs) < 3:
        return None
    dashes = [l for _, l in runs[1:-1]]
    gaps = [runs[i + 1][0] - (runs[i][0] + runs[i][1]) for i in range(len(runs) - 1)]
    return int(np.median(dashes)), int(np.median(gaps))


def gray_levels(a, min_share=0.01):
    """넓게 칠해진 밝기 값들(면적 비율 min_share 이상)."""
    vals, counts = np.unique(a, return_counts=True)
    share = counts / a.size
    return sorted(int(v) for v, s in zip(vals, share) if s >= min_share)


def ink_height(a, thresh=INK):
    """잉크가 있는 행의 위아래 폭 — 글자 하나를 잘라 넣으면 글자 높이."""
    rows = np.where((a < thresh).any(axis=1))[0]
    return 0 if rows.size == 0 else int(rows[-1] - rows[0] + 1)
