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

# El proyecto no tiene carpeta prisma/migrations (se desarrolló con "prisma db push"),
# así que en el contenedor también usamos db push para crear las tablas contra el esquema.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate && node src/app.js"]
