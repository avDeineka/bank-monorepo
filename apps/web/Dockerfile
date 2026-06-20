# ==========================================
# Step 1: Builder (Складання та компиляція)
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Інструмент для коректного збирання нативних модулів (якщо є)
RUN apk add --no-cache libc6-compat

# Копіюємо кореневі файли залежностей монорепозиторію
COPY package*.json ./

# Встановлюємо всі залежності
RUN npm install

# Копіюємо весь код проекту
COPY . .

# 🚨 ВАЖЛИВО: Кажемо Next.js згенерувати автономну (standalone) папку для продакшену
ENV NEXT_PRIVATE_STANDALONE=true

# Збираємо Next.js проект
RUN npx next build apps/web

# ==========================================
# Step 2: Runtime (Мінімальний образ для роботи)
# ==========================================
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Дозволяємо контейнеру слухати зовнішні запити на порту 3000
ENV HOSTNAME="0.0.0.0"

# Копіюємо публічні статичні файли
# Копіюємо публічні статичні файли (зірочка наприкінці рятує від помилки, якщо папка порожня або її немає)
COPY --from=builder /app/apps/web/public* ./apps/web/public/

# Копіюємо магічну standalone папку, яку згенерував Next.js build
# Вона містить усе: і частину ядра node_modules, і наш код
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

# Запускаємо автономний сервер. Зверни увагу на шлях запуску standalone версії!
CMD ["node", "apps/web/server.js"]
