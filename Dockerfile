FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN CLOISTER_ADAPTER=node pnpm build && pnpm prune --prod

FROM node:22-alpine
WORKDIR /app
RUN corepack enable && addgroup -S cloister && adduser -S cloister -G cloister
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/src/lib/db ./src/lib/db
USER cloister
EXPOSE 4830
CMD ["node", "build/index.js"]
