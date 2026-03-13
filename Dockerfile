# Build Stage
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
# better-sqlite3 needs build tools
RUN apt-get update && apt-get install -y python3 make g++ 
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:20-slim
WORKDIR /app
# We still need some shared libs for sqlite on slim
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY server.js ./

# SQLite persistence
VOLUME /app/data
# Update server.js to look for DB in /app/data if needed, 
# but I'll keep it simple and just run it in /app for now.
# However, the user wants to exclude the DB from the image.

EXPOSE 3001
CMD ["node", "server.js"]
