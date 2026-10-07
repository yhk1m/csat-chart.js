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
