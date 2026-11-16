FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN npm install -g npm@11.13.0

COPY . .

RUN npm ci

RUN npx nx build @rubber-mes/plc-service --configuration=production


FROM node:20-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3002

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/plc-service/dist ./plc-service/dist

EXPOSE 3002

CMD ["node", "plc-service/dist/main.js"]