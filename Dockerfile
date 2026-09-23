# Imagen de produccion del backend. Se construye en CI, no en el servidor:
# la t3.micro no tiene RAM para compilar.

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate && pnpm run build

# Dependencias sin las de desarrollo: sacan ~200 MB de la imagen final.
FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile --prod
# El cliente se genera aca, no en el build: con pnpm no queda en
# node_modules/.prisma sino dentro del propio paquete, en el store de .pnpm.
RUN pnpm exec prisma generate

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S lc && adduser -S lc -G lc

# Trae las dependencias con el cliente de Prisma ya generado adentro.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY package.json ./

USER lc
EXPOSE 4001

# Las migraciones corren al arrancar: el contenedor es el unico que llega a la
# base, asi que no hay otro lugar donde aplicarlas.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/index.js"]
