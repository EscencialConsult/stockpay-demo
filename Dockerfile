FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server

# Los datos (SQLite + uploads) viven en un volumen montado en /data,
# nunca dentro de la imagen — así sobreviven a un rebuild del contenedor.
RUN mkdir -p /data

EXPOSE 8001

CMD ["node", "server/standalone.js"]
