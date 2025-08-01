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


def load_angle_series(csv_path: pathlib.Path) -> list[float]:
    with open(csv_path, newline="") as f:
        rdr = csv.DictReader(f)
        return [float(row["left_knee_angle"]) for row in rdr]


def main() -> None:
    with open(LABEL_CSV, newline="") as f:
        rdr = csv.DictReader(f)
        rows = list(rdr)

    cnt = Counter()
    for row in rows:
        csv_file = ANGLE_DIR / row["file"]
        series = load_angle_series(csv_file)
        pred = detect_fall_angles(series)
        truth = row["label"] == "fall"
        if pred and truth:
            cnt["TP"] += 1
        elif pred and not truth:
            cnt["FP"] += 1
        elif not pred and truth:
            cnt["FN"] += 1
        else:
            cnt["TN"] += 1

    print("Confusion counts:", cnt)

    precision = cnt["TP"] / (cnt["TP"] + cnt["FP"] + 1e-9)
    recall = cnt["TP"] / (cnt["TP"] + cnt["FN"] + 1e-9)
    f1 = 2 * precision * recall / (precision + recall + 1e-9)

    metrics = {
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1": round(f1, 3),
        "counts": cnt,
    }

    print(
        f'Precision {metrics["precision"]:.3f}  '
        f'Recall {metrics["recall"]:.3f}  '
        f'F1 {metrics["f1"]:.3f}'
    )

    with open(REPORT_DIR / "baseline.json", "w") as fp:
        json.dump(metrics, fp, indent=2)


if __name__ == "__main__":
    main()
