# 시험지 양식 1단계 — 실측 명세서 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 평가원 시험지 실물에서 17종 그래프의 글꼴·굵기·크기·선·점선·회색·범례·출처 규칙을 재서 `planning/specs/2026-10-07-exam-style-measurements.md` 로 적고, 사용자 검토를 받는다.

**Architecture:** 통사랑 PDF(읽기 전용)에서 그래프 그림을 꺼내는 Python 도구 셋(목록 → 잘라내기 → 재기)을 `planning/tools/exam-measure/` 에 둔다. 재는 함수는 합성 그림으로 단위 시험한다. 잰 값은 표본마다 JSON 으로 남기고, 명세서는 그 JSON 과 사람의 판정(글꼴 꼴 대조)으로 쓴다. 대조 시트 HTML 이 «시험지 | 1.7.0 골든» 을 나란히 보여 준다.

**Tech Stack:** Python 3.12 · PyMuPDF 1.27 · Pillow 12 · numpy 2 · `unittest`(pytest 없음)

설계: `planning/specs/2026-10-07-exam-style-design.md`. **2단계(구현) 계획은 이 계획의 Task 8 검토가 끝난 뒤 따로 쓴다** — 토큰 값이 실측에서 나오기 때문이다.

## 지켜야 할 것

- 통사랑 폴더 `C:\Users\김용현\Desktop\vibecoding\tongsarang\모의고사` 는 **읽기만** 한다. 쓰기·이동 금지.
- Python 은 늘 `python -I` 로, 출력 인코딩은 스크립트 안에서 `sys.stdout.reconfigure(encoding="utf-8")` (이 PC 콘솔은 cp949, `-I` 는 `PYTHONIOENCODING` 을 무시한다).
- PDF 글꼴 이름은 CP949 바이트가 latin-1 로 풀려 있다 → `s.encode("latin-1").decode("cp949")`.
- 한글 경로에서 Node 재귀 fs 가 깨진다 — 이 단계는 Python 만 쓴다.
- `git add -A` 금지. 파일을 이름으로 더한다.
- 커밋 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## 표본 범위

평가원 = 파일 이름 `YYYY_MM_code.pdf` 에서 MM 이 `06`·`09`·`11`, 학년도 2025~2027.
과목: `한국지리/korgeo`, `세계지리/wgeo`, `경제/econ`, `사회문화/socul` (모두 `작업완료/` 아래).
통합사회(`iss`·`iss2`)는 고1·고2 **학평**이라 뺀다. 2025_11_korgeo 는 없다. 합계 31개 PDF.

## 파일 구조

| 파일 | 할 일 |
|---|---|
| `planning/tools/exam-measure/common.py` | PDF 목록, 글꼴 이름 풀기, 출력 인코딩 |
| `planning/tools/exam-measure/inventory.py` | PDF 31개의 그림 목록 CSV + 쪽 썸네일(그림 번호 표시) |
| `planning/tools/exam-measure/crop.py` | `samples.csv` 에 고른 그림을 꺼내 `exam-samples/<type>/` 에 PNG + 메타 JSON |
| `planning/tools/exam-measure/measure.py` | 선 굵기·점선·회색 단계·글자 높이를 재는 함수 |
| `planning/tools/exam-measure/test_measure.py` | 위 함수의 합성 그림 시험 |
| `planning/tools/exam-measure/glyphs.py` | 같은 쪽 본문 벡터 글자를 표본 배율로 렌더 → 글꼴 대조판 |
| `planning/tools/exam-measure/compare.py` | 대조 시트 HTML |
| `planning/specs/exam-samples/samples.csv` | 사람이 고른 표본 목록(종류·PDF·쪽·xref·문항) |
| `planning/specs/exam-samples/<type>/*.png, *.json` | 꺼낸 표본과 잰 값 |
| `planning/specs/2026-10-07-exam-style-measurements.md` | 결과물 |

`inventory.csv`·썸네일은 크고 다시 만들 수 있으므로 커밋하지 않는다(`planning/specs/exam-samples/_work/` 에 두고 `.gitignore`).

---

### Task 1: 공통 모듈과 그림 목록

**Files:**
- Create: `planning/tools/exam-measure/common.py`
- Create: `planning/tools/exam-measure/inventory.py`
- Modify: `.gitignore` (끝에 한 줄)

- [ ] **Step 1: `common.py` 작성**

```python
# © 2026 김용현
"""시험지 실측 도구 공통 — 표본 PDF 목록과 글꼴 이름 풀기."""
import re
import sys
from pathlib import Path

ROOT = Path(r"C:\Users\김용현\Desktop\vibecoding\tongsarang\모의고사")
SUBJECTS = {"한국지리": "korgeo", "세계지리": "wgeo", "경제": "econ", "사회문화": "socul"}
YEARS = ("2025", "2026", "2027")
MONTHS = ("06", "09", "11")
REPO = Path(__file__).resolve().parents[3]
SAMPLES = REPO / "planning" / "specs" / "exam-samples"
WORK = SAMPLES / "_work"


def utf8_stdout():
    sys.stdout.reconfigure(encoding="utf-8")


def exam_pdfs():
    """평가원 시험 PDF 를 (exam_id, path) 로. exam_id 예: '2026_11_korgeo'."""
    out = []
    for folder, code in SUBJECTS.items():
        for p in sorted((ROOT / folder / "작업완료").glob(f"*_{code}.pdf")):
            m = re.fullmatch(rf"(\d{{4}})_(\d{{2}})_{code}", p.stem)
            if m and m.group(1) in YEARS and m.group(2) in MONTHS:
                out.append((p.stem, p))
    return out


def font_name(s: str) -> str:
    """PDF 글꼴 이름은 CP949 바이트가 latin-1 로 풀려 있다."""
    try:
        return s.encode("latin-1").decode("cp949")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s
```

- [ ] **Step 2: `inventory.py` 작성**

```python
# © 2026 김용현
"""표본 PDF 의 그림 목록(CSV)과 쪽 썸네일(그림 번호를 빨간 상자로)."""
import csv
import fitz
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
```

`draw_rect` 는 메모리 속 문서에만 그린다 — `doc.save` 를 부르지 않으므로 원본 PDF 는 그대로다.

- [ ] **Step 3: `.gitignore` 에 작업 폴더 추가**

끝에 덧붙인다:

```
# 시험지 실측 도구의 중간 산출물 (다시 만들 수 있다)
planning/specs/exam-samples/_work/
```

- [ ] **Step 4: 실행**

Run: `cd planning/tools/exam-measure && python -I inventory.py`
Expected: `NNN images from 31 PDFs -> …\_work` (NNN 은 수백). `_work/` 에 썸네일 약 250장.

`-I` 는 스크립트 폴더를 `sys.path` 에 넣으므로 `from common import` 가 된다.

- [ ] **Step 5: 원본이 그대로인지 확인**

Run: `cd /c/Users/김용현/Desktop/vibecoding/tongsarang && git status --short 모의고사 | head`
Expected: 출력 없음.

- [ ] **Step 6: Commit**

```bash
git add .gitignore planning/tools/exam-measure/common.py planning/tools/exam-measure/inventory.py
git commit -m "chore(measure): 평가원 표본 PDF 의 그림 목록을 뽑는 도구"
```

---

### Task 2: 표본 고르기 (판정 작업)

**Files:**
- Create: `planning/specs/exam-samples/samples.csv`

- [ ] **Step 1: 썸네일을 훑어 17종에 해당하는 그림을 고른다**

`_work/*.png` 를 Read 로 본다. 종류 판정 기준(`src/types.ts` 의 키):

| 키 | 시험지에서 생김새 |
|---|---|
| `absbar` | 세로 막대(묶음·누적 포함), 값 축 하나 |
| `stacked` | 100% 띠 그래프 / 원그래프 |
| `line` | 꺾은선 |
| `climate` | 기온 꺾은선 + 강수 막대(이중 축) |
| `hythergraph` | 기온–강수 산점 연결선 |
| `pyramid` | 인구 피라미드 |
| `ternary` | 삼각 도표 |
| `scatter` | 산점도·거품 |
| `econ-plane` | 경제 좌표평면(수요·공급 곡선) |
| `radar` | 방사형 |
| `treemap` | 사각 면적 그래프 |
| `data-table` | 수치 표 |
| `matrix-table` | 기호(○·×)·지명 행렬 표 |
| `deviation-a` / `deviation-b` | 평균 대비 편차 막대(가로/세로) |
| `category-dot` | 범주별 점 그래프 |
| `cube` | 입체 막대 |

종류마다 **다른 시험에서** 1~3개. 그림 한 장에 그래프와 지도가 붙어 있어도 된다(잘라낼 때 `crop_px` 로 그래프만 남긴다). 못 찾은 종류는 `xref` 칸을 비우고 `note` 에 `표본 없음` 이라 적는다.

- [ ] **Step 2: `samples.csv` 작성**

머리줄과 형식(값은 Step 1 에서 찾은 것으로 채운다; 아래 첫 줄은 이미 확인된 실례다):

```csv
type,exam,page,xref,question,crop_px,note
absbar,2026_11_korgeo,3,48,11,"0,0,1200,1017",누적 막대 + 우측 지도
```

`crop_px` 는 `x0,y0,x1,y1`(원본 그림 픽셀). 그림 전체면 비운다. 범례·출처가 그래프와 다른 그림(`xref`)으로 쪼개져 있으면(위 문항은 범례가 xref 49) 같은 `question` 으로 줄을 하나 더 둔다.

- [ ] **Step 3: 확인**

Run: `python -I -c "import csv;r=list(csv.DictReader(open('planning/specs/exam-samples/samples.csv',encoding='utf-8')));print(len(r), sorted({x['type'] for x in r}))"`
Expected: 17개 키가 모두 나온다(표본 없음 줄 포함).

- [ ] **Step 4: Commit**

```bash
git add planning/specs/exam-samples/samples.csv
git commit -m "docs(measure): 17종 평가원 표본 목록"
```

---

### Task 3: 표본 꺼내기

**Files:**
- Create: `planning/tools/exam-measure/crop.py`

- [ ] **Step 1: `crop.py` 작성**

```python
# © 2026 김용현
"""samples.csv 의 그림을 꺼내 exam-samples/<type>/<exam>-q<N>[-k].png 와 메타 JSON 으로."""
import csv
import json
import fitz
from PIL import Image
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
        if pix.n - pix.alpha > 3:
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
```

- [ ] **Step 2: 실행**

Run: `cd planning/tools/exam-measure && python -I crop.py`
Expected: 표본마다 한 줄, `px/pt` 가 대략 8.3(≈600dpi). 1.0~4 처럼 낮으면 그 표본은 저해상도라 메모에 적는다.

- [ ] **Step 3: 꺼낸 그림 두세 장을 Read 로 열어 그래프가 잘렸는지 본다.** 잘렸으면 `samples.csv` 의 `crop_px` 를 고치고 Step 2 다시.

- [ ] **Step 4: Commit**

```bash
git add planning/tools/exam-measure/crop.py planning/specs/exam-samples/
git status --short   # _work 가 안 들어갔는지 확인
git commit -m "docs(measure): 평가원 표본 그림을 꺼낸다"
```

---

### Task 4: 재는 함수 (TDD)

**Files:**
- Create: `planning/tools/exam-measure/measure.py`
- Test: `planning/tools/exam-measure/test_measure.py`

재는 대상은 회색조 numpy 배열(0=검정, 255=흰색). 모든 결과는 **픽셀**로 돌려주고, pt 환산은 부르는 쪽이 `px_per_pt` 로 나눈다.

- [ ] **Step 1: 실패하는 시험 작성**

```python
# © 2026 김용현
import unittest
import numpy as np
from measure import run_lengths, stroke_width, dash_pattern, gray_levels, ink_height


def blank(h=100, w=200):
    return np.full((h, w), 255, dtype=np.uint8)


class RunLengths(unittest.TestCase):
    def test_runs(self):
        line = np.array([255, 0, 0, 255, 255, 0, 255], dtype=np.uint8)
        self.assertEqual(run_lengths(line), [(1, 2), (5, 1)])


class StrokeWidth(unittest.TestCase):
    def test_horizontal_line_4px(self):
        a = blank()
        a[40:44, 20:180] = 0
        self.assertEqual(stroke_width(a, axis="h", at=100), 4)

    def test_vertical_line_3px(self):
        a = blank()
        a[10:90, 50:53] = 0
        self.assertEqual(stroke_width(a, axis="v", at=50), 3)

    def test_antialiased_edge_counts_half(self):
        a = blank()
        a[40:43, :] = 0
        a[43, :] = 128  # 반쯤 칠한 가장자리
        self.assertAlmostEqual(stroke_width(a, axis="h", at=100), 3.5, places=1)


class DashPattern(unittest.TestCase):
    def test_dash_and_gap(self):
        a = blank(20, 300)
        for x in range(0, 300, 15):
            a[10, x:x + 9] = 0  # 9 칠하고 6 비움
        dash, gap = dash_pattern(a, axis="h", at=10)
        self.assertEqual((dash, gap), (9, 6))


class GrayLevels(unittest.TestCase):
    def test_finds_fill_levels(self):
        a = blank()
        a[:, 0:60] = 217
        a[:, 60:120] = 128
        levels = gray_levels(a, min_share=0.05)
        self.assertEqual(levels, [128, 217, 255])


class InkHeight(unittest.TestCase):
    def test_cap_height_of_box(self):
        a = blank()
        a[30:62, 10:30] = 0  # 32px 높이 글자 덩어리
        self.assertEqual(ink_height(a), 32)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: 실패 확인**

Run: `cd planning/tools/exam-measure && python -I -m unittest test_measure -v`
Expected: `ModuleNotFoundError: No module named 'measure'`

- [ ] **Step 3: `measure.py` 구현**

```python
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
```

- [ ] **Step 4: 통과 확인**

Run: `python -I -m unittest test_measure -v`
Expected: `Ran 7 tests … OK`

- [ ] **Step 5: Commit**

```bash
git add planning/tools/exam-measure/measure.py planning/tools/exam-measure/test_measure.py
git commit -m "chore(measure): 선 굵기·점선·회색·글자 높이를 재는 함수"
```

---

### Task 5: 글꼴 대조판

**Files:**
- Create: `planning/tools/exam-measure/glyphs.py`

같은 쪽의 **벡터 본문 글자**(글꼴 이름을 아는 글자)를 표본 그림과 같은 배율로 렌더해, 표본의 글자 조각과 나란히 놓는다.

- [ ] **Step 1: `glyphs.py` 작성**

```python
# © 2026 김용현
"""표본 쪽의 벡터 글자를 글꼴별로 한 줄씩 렌더 → exam-samples/_work/glyphs_<exam>_p<N>.png
같은 배율(px_per_pt)로 그리므로 표본 그림 속 글자와 크기·꼴을 바로 견줄 수 있다."""
import json
import sys
import fitz
from PIL import Image
from common import SAMPLES, WORK, font_name, utf8_stdout
from crop import pdf_path


def main(sample_json):
    utf8_stdout()
    meta = json.loads(open(sample_json, encoding="utf-8").read())
    doc = fitz.open(pdf_path(meta["exam"]))
    page = doc[meta["page"] - 1]
    zoom = meta["px_per_pt"]
    picked = {}
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                name = font_name(s["font"])
                if name not in picked and len(s["text"].strip()) >= 4:
                    picked[name] = s
    strips = []
    for name, s in sorted(picked.items()):
        r = fitz.Rect(s["bbox"])
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=r, colorspace=fitz.csGRAY)
        strips.append((name, s["size"], Image.frombytes("L", (pix.width, pix.height), pix.samples)))
        print(f"{name:16s} {s['size']:5.2f}pt  {s['text'][:30]!r}")
    W = max(im.width for _, _, im in strips)
    H = sum(im.height + 10 for _, _, im in strips)
    sheet = Image.new("L", (W, H), 255)
    y = 0
    for _, _, im in strips:
        sheet.paste(im, (0, y))
        y += im.height + 10
    WORK.mkdir(parents=True, exist_ok=True)
    out = WORK / f'glyphs_{meta["exam"]}_p{meta["page"]}.png'
    sheet.save(out)
    print("->", out)


if __name__ == "__main__":
    main(sys.argv[1])
```

- [ ] **Step 2: 실행(실례 표본)**

Run: `cd planning/tools/exam-measure && python -I glyphs.py ../../specs/exam-samples/absbar/2026_11_korgeo-q11.json`
Expected: `*신명-중명조`, `*신명-중고딕`, `*한양신명조` 등 줄 목록과 `-> …glyphs_2026_11_korgeo_p3.png`.

- [ ] **Step 3: 대조판과 표본을 Read 로 함께 열어 판정.** 판정 요령: 숫자 `2`·`3`·`7` 의 꼬리, 한글 `ㅇ` 의 꼭지, `ㅁ` 모서리 세리프 유무, 괄호 굵기 대비. 같은 크기에서 글자 높이(`ink_height`)도 비교.

- [ ] **Step 4: Commit**

```bash
git add planning/tools/exam-measure/glyphs.py
git commit -m "chore(measure): 본문 벡터 글자로 만드는 글꼴 대조판"
```

---

### Task 6: 종류별 실측과 명세서

**Files:**
- Create: `planning/specs/2026-10-07-exam-style-measurements.md`
- Modify: `planning/specs/exam-samples/<type>/*.json` (잰 값 `measured` 칸 추가)

- [ ] **Step 1: 명세서 뼈대 작성** — 아래 머리와 공통 표를 먼저 둔다. 칸은 Step 2~3 이 채운다.

```markdown
# 시험지 양식 실측 명세

작성일: 2026-10-07 · 설계: `2026-10-07-exam-style-design.md` · 표본: `exam-samples/samples.csv`

모든 길이는 **시험지 pt**(1pt = 1/72in). 그림 픽셀 ÷ `px_per_pt`.
판정 표시: ✔ 잰 값 · ≈ 추정(꼴 대조만) · — 해당 없음.

## 1. 공통

| 자리 | 글꼴 | 굵기 | 크기(pt) | 근거 표본 |
|---|---|---|---|---|
| 눈금 숫자 | | | | |
| 축 이름·단위 | | | | |
| 항목 이름 (가)·A | | | | |
| 지명 | | | | |
| 범례 글자 | | | | |
| 자료값 라벨 | | | | |
| 각주 `*` | | | | |
| 출처 `(통계청)` | | | | |
| 연도 `(2023)` | | | | |
| 제목 | | | | |

| 선 | 굵기(pt) | 무늬 | 색(회색 0~255) | 근거 |
|---|---|---|---|---|
| 축 | | | | |
| 격자 | | | | |
| 막대·면 테두리 | | | | |
| 계열 선 | | | | |
| 눈금 표시 | 길이 / 안·밖 | | | |

| 면 | 값 |
|---|---|
| 회색 단계 | |
| 빗금 각도·간격·굵기 | |
| 범례 상자 테두리·여백 | |
| 범례 견본 크기 | |

## 2. 종류별

### absbar
…(종류마다 같은 꼴: 표본 목록, 공통과 다른 점, 1.7.0 과 다른 점)

## 3. 1.7.0 과 달라지는 것 (2단계 할 일 목록)

| # | 종류 | 자리 | 1.7.0 | 시험지 |
|---|---|---|---|---|
```

- [ ] **Step 2: 표본마다 잰다.** 표본 하나에 대해 Python 대화형 한 번:

```bash
cd planning/tools/exam-measure && python -I -c "
import json,sys; import numpy as np; from PIL import Image; from measure import *
p='../../specs/exam-samples/absbar/2026_11_korgeo-q11'
a=np.array(Image.open(p+'.png')); m=json.load(open(p+'.json',encoding='utf-8')); k=m['px_per_pt']
print('axis-x', stroke_width(a,'h',600)/k, 'pt')
print('grid dash', [v/k for v in dash_pattern(a,'h',222)], 'pt')
print('grays', gray_levels(a, 0.01))
"
```

`at`(행·열 번호)은 표본을 Read 로 보고 고른다 — 축은 축 위 한 점, 격자는 점선 위 한 행. 결과를 그 표본 JSON 에 `"measured": {...}` 로 덧붙인다(값은 pt, 소수 둘째 자리).

- [ ] **Step 3: 공통 표를 채운다** — 같은 자리 값이 표본 사이에서 ±0.1pt 안이면 중앙값을 적고 ✔, 갈리면 갈린 값을 모두 적고 근거 표본을 단다. 글꼴은 Task 5 대조판으로 ≈/✔.

- [ ] **Step 4: 종류별 절을 쓴다** — 공통과 다른 것만. `표본 없음` 종류는 «가장 가까운 종류(이름)를 따른다» 한 줄.

- [ ] **Step 5: 1.7.0 값과 견준다** — 1.7.0 값은 코드에서 읽는다(`src/core/canvas/renderer.ts`·`axes.ts`·`legend.ts`·각 렌더러의 `lineWidth`·`setLineDash`·`'bold'`). 차이를 §3 표에 한 줄씩. 1.7.0 은 800×600 캔버스 px 단위이므로 시험지 pt 와 견줄 때는 표본 그래프 폭 비율로 환산하고, 환산식을 표 위에 적는다.

- [ ] **Step 6: Commit**

```bash
git add planning/specs/2026-10-07-exam-style-measurements.md planning/specs/exam-samples/
git commit -m "docs(measure): 17종 평가원 실측 명세"
```

---

### Task 7: 대조 시트

**Files:**
- Create: `planning/tools/exam-measure/compare.py`

- [ ] **Step 1: `compare.py` 작성** — 종류마다 «시험지 표본 | 1.7.0 골든» 한 줄. 골든은 `test/core/__snapshots__/` 에서 이름이 종류와 맞는 것(`absbar`→`absbar*.png`, `category-dot`→`categorydot*.png` 처럼 하이픈을 빼고 소문자 비교).

```python
# © 2026 김용현
"""시험지 표본과 1.7.0 골든을 나란히 놓은 HTML → exam-samples/_work/compare.html"""
import html
from common import REPO, SAMPLES, WORK

SNAP = REPO / "test" / "core" / "__snapshots__"


def main():
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
```

- [ ] **Step 2: 실행**

Run: `cd planning/tools/exam-measure && python -I compare.py`
Expected: `-> …\_work\compare.html`

- [ ] **Step 3: Commit**

```bash
git add planning/tools/exam-measure/compare.py
git commit -m "chore(measure): 시험지와 1.7.0 을 나란히 놓는 대조 시트"
```

---

### Task 8: 사용자 검토 (게이트)

- [ ] **Step 1:** `compare.html` 과 명세서를 연다 (`Invoke-Item`).
- [ ] **Step 2:** 사용자에게 «≈(추정) 항목»과 «표본 사이에서 값이 갈린 항목»을 따로 짚어 묻는다.
- [ ] **Step 3:** 고친 것을 반영하고 커밋. 승인되면 이 계획은 끝 — 2단계 계획(`planning/plans/2026-10-xx-exam-style-phase2-implement.md`)을 writing-plans 로 쓴다.
