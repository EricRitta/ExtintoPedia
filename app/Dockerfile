# App (API Fastify + front React já compilado) num container só.
# Layout dentro da imagem espelha o repo: /srv/app (código) e /srv/data (volume do compose),
# porque o servidor resolve data/ a partir da raiz do repo (index.ts: `raiz`).
FROM node:26-alpine AS build
WORKDIR /srv/app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:26-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
WORKDIR /srv/app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /srv/app/dist ./dist
COPY src ./src
COPY tsconfig.json ./
RUN mkdir -p /srv/data && chown node:node /srv/data
USER node
EXPOSE 3001
CMD ["npm", "start"]
