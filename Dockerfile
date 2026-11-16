FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json
COPY plc-service/package.json ./plc-service/package.json

RUN npm ci

COPY . .

RUN npx prisma generate --schema=api/prisma/schema.prisma

RUN npx nx build @rubber-mes/api --configuration=production


FROM node:20-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/api/dist ./api/dist
COPY --from=build /app/api/prisma ./api/prisma

EXPOSE 3000

CMD ["node", "api/dist/main.js"]