FROM node:20-alpine

# Prisma necesita OpenSSL en la imagen; alpine no lo trae instalado por defecto
# y sin esto el "schema engine" de Prisma tira "Could not parse schema engine response".
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 3001

# migrate deploy aplica las migraciones pendientes sin pedir confirmación (a diferencia de "migrate dev")
CMD ["sh", "-c", "npx prisma migrate deploy && node src/app.js"]
