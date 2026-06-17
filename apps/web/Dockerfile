# ==========================================
# Step 1: Builder (Складання та компиляція)
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Копіюємо кореневі файли залежностей монорепозиторію
COPY package*.json ./

# Встановлюємо всі залежності (включаючи dev для збірки Next.js)
RUN npm install

# Копіюємо весь код проекту (щоб Next.js бачив apps/web та libs/common)
COPY . .

# Збираємо Next.js проект. 
# Оскільки ми запускаємо збірку з кореня, вказуємо шлях до нашого веб-додатка
RUN npx next build apps/web

# ==========================================
# Step 2: Runtime (Мінімальний образ для роботи)
# ==========================================
FROM node:20-alpine AS runtime
WORKDIR /app

# Копіюємо файли залежностей для продакшн-інсталу
COPY package*.json ./

# Встановлюємо ТІЛЬКИ продакшн-залежності (ігноруємо devDependencies)
RUN npm install --omit=dev

# Копіюємо скомпільований фронтенд із першого етапу
# Next.js за замовчуванням збирає все всередині папки додатка в .next
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public

# Передаємо змінні середовища за замовчуванням
ENV NODE_ENV=production
ENV PORT=3000

# Запускаємо сервер Next.js
CMD ["npx", "next", "start", "apps/web"]
