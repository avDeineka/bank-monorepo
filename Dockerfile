# Етап 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./
RUN npm install
COPY . .

ARG APP_NAME
# NestJS збирає все в один бандл у dist/apps/APP_NAME
RUN npm run build ${APP_NAME}

# Етап 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

ARG APP_NAME
# Копіюємо ВМІСТ папки додатка прямо в корінь dist
# Тепер main.js буде лежати за шляхом /app/dist/main.js
COPY --from=builder /app/dist/apps/${APP_NAME} ./dist

# Бібліотеки вже всередині main.js, тому рядок з dist/libs ВИДАЛЯЄМО

CMD ["node", "dist/main.js"]