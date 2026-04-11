# Етап 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./
RUN npm install
COPY . .

ARG APP_NAME
ARG BUILD_MODE=release
ENV APP_NAME=$APP_NAME
ENV BUILD_MODE=$BUILD_MODE
# NestJS збирає додатки у dist/apps/*
RUN if [ "$BUILD_MODE" = "debug" ]; then npm run build:debug; else npm run build; fi

# Етап 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

ARG APP_NAME
ARG BUILD_MODE=release
ENV APP_NAME=$APP_NAME
ENV BUILD_MODE=$BUILD_MODE
# Копіюємо збудовану папку у тій же структурі, що генерує webpack
COPY --from=builder /app/dist/apps/ ./dist/apps/

# Для debug-режиму запускаємо з правильним шляхом
CMD ["sh", "-c", "if [ \"$BUILD_MODE\" = \"debug\" ]; then node --inspect=0.0.0.0:9229 dist/apps/$APP_NAME/main.js; else node dist/apps/$APP_NAME/main.js; fi"]