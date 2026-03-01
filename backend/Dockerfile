FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    libgl1 libglib2.0-0 libsm6 libxext6 \
    libxrender-dev libgomp1 curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app
COPY . .
RUN uv sync --no-dev
EXPOSE 8000
CMD ["uv", "run", "main.py", "serve", "--host", "0.0.0.0", "--port", "8000"]
