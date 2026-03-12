# Сервер сигналинга Socket.IO для WebRTC
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server

ENV PORT=8000
EXPOSE 8000

CMD ["node", "server/index.js"]
