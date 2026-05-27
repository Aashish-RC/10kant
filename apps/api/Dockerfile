FROM node:20-alpine AS builder
WORKDIR /app

# Copy and build shared package first
COPY packages/shared /packages/shared
WORKDIR /packages/shared
RUN npm install && npm run build

# Now build api
WORKDIR /app
COPY apps/api/package*.json ./
RUN npm install && npm cache clean --force
COPY apps/api/ .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3001
CMD ["node", "dist/index.js"]