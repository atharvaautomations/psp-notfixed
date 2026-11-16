FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@11.13.0

COPY . .

RUN npm ci

RUN npx prisma generate --schema=api/prisma/schema.prisma

RUN npx nx build @rubber-mes/api --configuration=production


FROM node:20-bookworm-slim AS production

WORKDIR /app

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/api/dist ./api/dist
COPY --from=build /app/api/prisma ./api/prisma

EXPOSE 3000

CMD ["node", "api/dist/main.js"]