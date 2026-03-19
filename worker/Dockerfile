# Stage 1: build deps
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: runtime
FROM python:3.12-slim AS runtime
WORKDIR /app

# Non-root user
RUN useradd -m -u 1001 appuser

COPY --from=builder /install /usr/local
COPY worker.py .

USER appuser
CMD ["python", "-u", "worker.py"]
