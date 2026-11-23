FROM node:24-alpine

# Atualiza os pacotes do sistema (corrige CVEs da imagem base apontadas pelo scan)
RUN apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./

# Instala só as dependências de produção e depois remove o npm/yarn da imagem:
# eles só são necessários no build e trazem vulnerabilidades próprias
RUN npm ci --omit=dev \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
           /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg /root/.npm

COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Roda sem privilégios de root
USER node
CMD ["node", "src/server.js"]
