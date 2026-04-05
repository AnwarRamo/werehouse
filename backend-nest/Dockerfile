FROM node:20-alpine AS build
WORKDIR /workspace

# Supports two build contexts:
# 1) backend-nest as context (files at /workspace/package.json)
# 2) warehouse-system as context with backend nested (files at /workspace/backend-nest/package.json)
COPY . .

RUN set -e; \
	if [ -f /workspace/backend-nest/package-lock.json ]; then APP_DIR="/workspace/backend-nest"; \
	elif [ -f /workspace/package-lock.json ]; then APP_DIR="/workspace"; \
	else echo "package-lock.json not found in supported locations"; exit 1; fi; \
	cd "$APP_DIR"; \
	npm ci; \
	DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/warehouse_system?schema=public}" npm run prisma:generate; \
	npm run build; \
	mkdir -p /out; \
	cp package.json package-lock.json /out/; \
	cp -R node_modules dist prisma /out/; \
	cp prisma.config.ts /out/prisma.config.ts

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /out/package.json ./
COPY --from=build /out/package-lock.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/dist ./dist
COPY --from=build /out/prisma ./prisma
COPY --from=build /out/prisma.config.ts ./prisma.config.ts

EXPOSE 5001
CMD ["sh", "-c", "npx prisma db push && node dist/main"]
