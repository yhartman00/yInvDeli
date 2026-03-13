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

# Install better-sqlite3 dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

# Copy all source files (Vite will serve them if we are not using a build step, 
# or our server.js will serve them from root)
COPY . .

# Persistence directory
RUN mkdir -p /app/data
VOLUME /app/data

EXPOSE 3001
CMD ["node", "server.js"]
