FROM node:20-alpine AS deps
WORKDIR /app
COPY backend-nest/package.json backend-nest/package-lock.json ./
RUN npm ci

FROM deps AS build
COPY backend-nest/ ./
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/warehouse_system?schema=public
ENV DATABASE_URL=${DATABASE_URL}
RUN npm run prisma:generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

EXPOSE 5001
CMD ["sh", "-c", "npx prisma db push && node dist/main"]
