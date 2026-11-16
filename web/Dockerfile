FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN npm install -g npm@11.13.0

COPY . .

RUN npm ci

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build --workspace=@rubber-mes/web


FROM node:20-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3001

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/web/.next ./web/.next
COPY --from=build /app/web/public ./web/public
COPY --from=build /app/web/package.json ./web/package.json

WORKDIR /app/web

EXPOSE 3001

CMD ["npm", "start", "--", "-H", "0.0.0.0", "-p", "3001"]