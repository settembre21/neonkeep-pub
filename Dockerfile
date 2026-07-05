# --- Build Stage ---
FROM python:3.13-slim AS builder

# Install uv (fast Python package installer)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Sync dependencies (creates .venv)
RUN uv sync --frozen --no-cache

# --- Final Run Stage ---
FROM python:3.13-slim

WORKDIR /app

# Copy virtual environment and app code
COPY --from=builder /app/.venv /app/.venv
COPY . /app

# Ensure SQLite storage directory exists
RUN mkdir -p /app/data

# Environment configuration
ENV PATH="/app/.venv/bin:$PATH"
ENV DATABASE_URL="sqlite:////app/data/sql_app.db"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
