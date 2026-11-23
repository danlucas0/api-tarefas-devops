FROM node:24-alpine

# Atualiza os pacotes do sistema (corrige CVEs da imagem base apontadas pelo scan)
RUN apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV PORT=3000
EXPOSE 3000

USER node
CMD ["npm", "start"]
