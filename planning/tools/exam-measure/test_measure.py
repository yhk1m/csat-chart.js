# © 2026 김용현
import unittest
import numpy as np
from measure import run_lengths, stroke_width, dash_pattern, gray_levels, ink_height
from numerals import normalize, iou, aspect, N


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



class Numerals(unittest.TestCase):
    def test_normalize_fits_height(self):
        m = np.zeros((40, 100), dtype=bool)
        m[10:30, 20:30] = True              # 20 높이 × 10 폭
        out = normalize(m)
        self.assertEqual(out.shape, (N, N))
        ys, xs = np.nonzero(out)
        self.assertEqual(ys.max() - ys.min() + 1, N)
        self.assertAlmostEqual((xs.max() - xs.min() + 1) / N, 0.5, delta=0.05)

    def test_iou_same_and_disjoint(self):
        a = np.zeros((N, N), dtype=bool); a[:, :10] = True
        b = np.zeros((N, N), dtype=bool); b[:, 20:30] = True
        self.assertEqual(iou(a, a), 1.0)
        self.assertEqual(iou(a, b), 0.0)

    def test_aspect(self):
        m = np.zeros((50, 50), dtype=bool); m[5:25, 5:15] = True
        self.assertAlmostEqual(aspect(m), 0.5)

import tempfile
from pathlib import Path as _P
from compare import goldens_for


class Compare(unittest.TestCase):
    def test_goldens_for_matches_type_prefix(self):
        with tempfile.TemporaryDirectory() as d:
            snap = _P(d)
            for n in ("absbar.png", "absbarStacked.png", "deviationA.png", "deviationAExam.png", "deviationB.png"):
                (snap / n).write_bytes(b"")
            self.assertEqual([p.name for p in goldens_for("absbar", snap)], ["absbar.png", "absbarStacked.png"])
            self.assertEqual([p.name for p in goldens_for("deviation-a", snap)], ["deviationA.png", "deviationAExam.png"])
            self.assertEqual(goldens_for("cube", snap), [])


if __name__ == "__main__":
    unittest.main()
