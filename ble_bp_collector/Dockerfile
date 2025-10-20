# syntax=docker/dockerfile:1
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    bluetooth bluez bluez-hcidump libbluetooth3 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt
COPY collector.py /app/collector.py
CMD ["python", "/app/collector.py"]

