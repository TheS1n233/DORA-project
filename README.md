# Dora Project
CLONE
Software:Git + Docker Desktop + VS Code
1.git clone https://git-softeng.polito.it/d023270/dora.git
2.cd dora
3.vs code open dora folder -> Reopen in Container

# Part 1 Report – Home-Safety (Fall Detection)(Time:2025-07 -- 2025-08-08)

## 1. Overview
The DORA microservice `home-safety-svc` uses **MediaPipe Pose** to extract knee angles 
uses a threshold rule (knee = 105°, window = 8, delta = 20°) to detect falls.
Events are transmitted via **MQTT → Home Assistant** to generate local voice alerts.

## 2. Dataset
| class   | clips |
|---------|-------|
| fall    | 26 |
| normal  | 2 |
all of the MP4 didn't upload, but upload the csv on "dora/dataset"

## 3. Algorithm & Metrics
Grid search results to get the best parameters

| knee | window | delta | Precision | Recall | F1 |
|------|--------|-------|-----------|--------|----|
| 105° | 8      | 20°   | 0.952     | 0.714  | **0.816** |
