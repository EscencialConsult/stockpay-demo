FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 3001

# migrate deploy aplica las migraciones pendientes sin pedir confirmación (a diferencia de "migrate dev")
CMD ["sh", "-c", "npx prisma migrate deploy && node src/app.js"]
