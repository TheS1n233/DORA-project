import csv
import pathlib

root = pathlib.Path("dataset/angle_csv")
with open("dataset/labels.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["file", "label"])
    for p in root.glob("*.csv"):
        label = "fall" if "fall" in p.stem else "normal"
        w.writerow([p.name, label])
