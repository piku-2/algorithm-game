# ビルドはリポジトリルートをコンテキストにする:
#   docker build -f back/Dockerfile .
FROM rust:1-slim AS builder
WORKDIR /app
COPY back/ back/
COPY data/ data/
RUN cd back && cargo build --release

FROM debian:stable-slim
# gcc はユーザー C コードのサンドボックスコンパイルに必要
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libc6-dev \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/back/target/release/back /usr/local/bin/back
ENV DATABASE_PATH=/data/progress.db
ENV BIND_ADDR=0.0.0.0:8080
VOLUME /data
EXPOSE 8080
CMD ["back"]
