FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ .

FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=server-build /app/server ./server
COPY --from=client-build /app/client/dist ./client/dist

WORKDIR /app/server
EXPOSE 3001
CMD ["node", "src/index.js"]
