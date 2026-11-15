# The GameAtlas app: builds the website, then runs the API, which also serves the website on port 3000.
# docker-compose.yml starts it together with its MySQL database.
FROM node:24-slim

WORKDIR /app

# Packages first, so a code change doesn't reinstall them
COPY backend/package.json backend/package-lock.json backend/
RUN npm ci --prefix backend --omit=dev
COPY frontend/package.json frontend/package-lock.json frontend/
RUN npm ci --prefix frontend

COPY backend backend
COPY frontend frontend
RUN npm run build --prefix frontend

EXPOSE 3000
CMD ["node", "backend/src/server.ts"]
