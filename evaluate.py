#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Evaluate knee-angle fall detector on all CSVs in dataset/angle_csv,
using labels in dataset/labels.csv.
Outputs precision/recall/F1 to reports/baseline.json
"""
import csv
import json
import pathlib
import sys
from collections import Counter

# import app.fall_detection
sys.path.append("server/home-safety-svc")
from app.fall_detection import detect_fall_angles  # type: ignore

ANGLE_DIR = pathlib.Path("dataset/angle_csv")
LABEL_CSV = pathlib.Path("dataset/labels.csv")
REPORT_DIR = pathlib.Path("reports")
REPORT_DIR.mkdir(exist_ok=True)


# ---------------- Auxiliary function ----------------
def load_angle_series(csv_path: pathlib.Path) -> list[float]:
    with open(csv_path, newline="") as f:
        rdr = csv.DictReader(f)
        return [float(row["left_knee_angle"]) for row in rdr]


def eval_params(knee_thresh: float, window: int, delta: float) -> tuple[dict, Counter]:
    """return metrics and confusion counter"""
    with open(LABEL_CSV, newline="") as f:
        rdr = csv.DictReader(f)
        rows = list(rdr)

    cnt: Counter = Counter()
    for row in rows:
        series = load_angle_series(ANGLE_DIR / row["file"])
        pred = detect_fall_angles(series, knee_thresh, window, delta)
        truth = row["label"] == "fall"
        if pred and truth:
            cnt["TP"] += 1
        elif pred and not truth:
            cnt["FP"] += 1
        elif not pred and truth:
            cnt["FN"] += 1
        else:
            cnt["TN"] += 1

    precision = cnt["TP"] / (cnt["TP"] + cnt["FP"] + 1e-9)
    recall = cnt["TP"] / (cnt["TP"] + cnt["FN"] + 1e-9)
    f1 = 2 * precision * recall / (precision + recall + 1e-9)

    metrics = {
        "knee_thresh": knee_thresh,
        "window": window,
        "delta": delta,
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1": round(f1, 3),
    }
    return metrics, cnt


# ---------------- grind search ----------------
search_space = {
    "knee_thresh": [95.0, 100.0, 105.0, 110.0],
    "window": [8, 10, 12],
    "delta": [15.0, 20.0, 25.0, 30.0],
}

best: dict | None = None
best_cnt: Counter | None = None

for k in search_space["knee_thresh"]:
    for w in search_space["window"]:
        for d in search_space["delta"]:
            m, c = eval_params(k, w, d)
            if (best is None) or (m["f1"] > best["f1"]):
                best, best_cnt = m, c

# ---------------- print outs ----------------
print("best parameter:", best)
print("Confusion counts:", best_cnt)

with open(REPORT_DIR / "baseline.json", "w") as fp:
    json.dump({"best_metrics": best, "confusion": best_cnt}, fp, indent=2)
