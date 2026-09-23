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
RUN pnpm install --frozen-lockfile --prod

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S lc && adduser -S lc -G lc

COPY --from=prod-deps /app/node_modules ./node_modules
# El cliente generado por Prisma vive aparte y hay que traerlo del build.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

USER lc
EXPOSE 4001

# Las migraciones corren al arrancar: el contenedor es el unico que llega a la
# base, asi que no hay otro lugar donde aplicarlas.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/index.js"]
