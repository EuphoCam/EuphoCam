# Dockerfile for a Next.js static site on Zeabur

# 1. Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the Next.js application for static export
RUN npm run build

# 2. Production Stage
FROM caddy:2-alpine

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Copy the static files from the builder stage
COPY --from=builder /app/out /srv

# Expose port 8080 for the Caddy server
EXPOSE 8080
