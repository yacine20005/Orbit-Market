# Official slim Python image
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./backend ./backend

# Run as a non-root user with write access only to the manifest directory
RUN useradd --create-home --shell /bin/bash appuser \
    && mkdir -p /app/backend/manifest \
    && chown -R appuser:appuser /app/backend/manifest

USER appuser

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
