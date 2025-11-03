# services/ta-session-logger/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY services/ta-session-logger/main.py /app/main.py
RUN pip install --no-cache-dir fastapi uvicorn[standard] pydantic
EXPOSE 8088
CMD ["python", "-u", "main.py"]
